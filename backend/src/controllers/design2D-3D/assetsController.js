import ThreeDModel from '../../models/design2D-3DModels/threeDModel.js';
import PlannerTexture, {
    TEXTURE_PLACEMENTS,
} from '../../models/design2D-3DModels/plannerTexture.js';

const TEXTURE_PLACEMENT_SET = new Set(TEXTURE_PLACEMENTS);
const THREE_D_MODELS_COLLECTION = "three_d_models";
const MODEL_ASSET_PROJECTION = {
    _id: 1,
    id: 1,
    name: 1,
    category: 1,
    sub_category: 1,
    subCategory: 1,
    assets: 1,
    urls: 1,
    r2: 1,
    cloudflare: 1,
    cloudflareR2: 1,
    storage: 1,
    modelUrl: 1,
    model_url: 1,
    thumbnailUrl: 1,
    thumbnail_url: 1,
    topViewUrl: 1,
    top_view_url: 1,
    dimensions: 1,
    metadata: 1,
    tags: 1,
};

const R2_PUBLIC_BASE_URL = String(
    process.env.CLOUDFLARE_R2_PUBLIC_URL ||
    process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL ||
    process.env.R2_PUBLIC_URL ||
    process.env.R2_PUBLIC_BASE_URL ||
    process.env.CF_R2_PUBLIC_URL ||
    '',
).trim().replace(/\/+$/, '');

const getThreeDModelsCollection = () =>
    ThreeDModel.db.collection(THREE_D_MODELS_COLLECTION);

const normalizePlacement = (value) => {
    const placement = String(value || '')
        .trim()
        .toLowerCase();

    return TEXTURE_PLACEMENT_SET.has(placement) ? placement : null;
};

const getQueryDurationMs = (startedAt) => Number(process.hrtime.bigint() - startedAt) / 1e6;

const parsePositiveInteger = (value, fallback) => {
    const parsedValue = Number.parseInt(value, 10);
    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
};

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildFlexibleStringMatcher = (fieldName, value) => {
    const normalizedValue = String(value || '').trim().toLowerCase();
    if (!normalizedValue) return null;

    const valueVariants = new Set([normalizedValue]);
    const spaceSeparatedValue = normalizedValue.replace(/[_-]+/g, ' ');

    valueVariants.add(spaceSeparatedValue);
    valueVariants.add(spaceSeparatedValue.replace(/\s+/g, '_'));
    valueVariants.add(spaceSeparatedValue.replace(/\s+/g, '-'));

    const flexiblePattern = spaceSeparatedValue
        .split(/\s+/)
        .filter(Boolean)
        .map(escapeRegex)
        .join('[_\\s-]+');

    return {
        $or: [
            { [fieldName]: { $in: Array.from(valueVariants).filter(Boolean) } },
            { [fieldName]: new RegExp(`^${flexiblePattern}$`, 'i') },
        ],
    };
};

const buildModelAssetFilter = (query) => {
    const filters = [];
    const categoryFilter = buildFlexibleStringMatcher('category', query.category);
    const rawSubCategory = query.sub_category || query.subCategory;
    const subCategoryFilter = rawSubCategory
        ? {
            $or: [
                buildFlexibleStringMatcher('sub_category', rawSubCategory),
                buildFlexibleStringMatcher('subCategory', rawSubCategory),
            ].filter(Boolean),
        }
        : null;

    if (categoryFilter) filters.push(categoryFilter);
    if (subCategoryFilter) filters.push(subCategoryFilter);

    return filters.length > 0 ? { $and: filters } : {};
};

const getPaginationOptions = (query) => {
    const hasPagination = query.limit !== undefined || query.page !== undefined;
    const limit = Math.min(parsePositiveInteger(query.limit, 48), 96);
    const page = parsePositiveInteger(query.page, 1);

    return {
        hasPagination,
        limit,
        page,
        skip: (page - 1) * limit,
    };
};

const sendAssetResponse = (res, payload, pagination) => {
    if (!pagination?.hasPagination) {
        return res.status(200).json(payload.items);
    }

    return res.status(200).json({
        items: payload.items,
        pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total: payload.total,
            hasMore: pagination.skip + payload.items.length < payload.total,
        },
    });
};

const isAbsoluteAssetUrl = (value) => /^(https?:)?\/\//i.test(value) || /^(blob:|data:)/i.test(value);

const joinUrlPath = (baseUrl, objectPath) => {
    if (!baseUrl || !objectPath) return objectPath || '';
    return `${baseUrl}/${String(objectPath).replace(/^\/+/, '')}`;
};

const resolvePublicAssetUrl = (value) => {
    if (!value) return '';

    if (typeof value === 'object') {
        return resolvePublicAssetUrl(
            value.url ||
            value.publicUrl ||
            value.public_url ||
            value.cdnUrl ||
            value.cdn_url ||
            value.secure_url ||
            value.href ||
            value.key ||
            value.objectKey ||
            value.object_key ||
            '',
        );
    }

    const rawValue = String(value || '').trim();
    if (!rawValue) return '';
    if (isAbsoluteAssetUrl(rawValue) || rawValue.startsWith('/')) return rawValue;

    return R2_PUBLIC_BASE_URL ? joinUrlPath(R2_PUBLIC_BASE_URL, rawValue) : rawValue;
};

const pickFirstResolvedAssetUrl = (sources = []) => {
    for (const source of sources) {
        const resolvedUrl = resolvePublicAssetUrl(source);
        if (resolvedUrl) return resolvedUrl;
    }

    return '';
};

const pickModelAssetMetadata = (asset = {}) => {
    const assets = asset.assets || {};
    const urls = asset.urls || {};
    const r2 = asset.r2 || asset.cloudflareR2 || asset.cloudflare || asset.storage || {};
    const dimensions = asset.dimensions || asset.metadata?.dimensions || {};
    const modelUrl = pickFirstResolvedAssetUrl([
        assets.modelUrl,
        assets.model_url,
        assets.model,
        assets.url,
        assets.modelKey,
        assets.model_key,
        urls.modelUrl,
        urls.model_url,
        r2.modelUrl,
        r2.model_url,
        r2.modelKey,
        r2.model_key,
        asset.modelUrl,
        asset.model_url,
        asset.url,
    ]);
    const thumbnailUrl = pickFirstResolvedAssetUrl([
        assets.thumbnailUrl,
        assets.thumbnail_url,
        assets.thumbnail,
        assets.previewUrl,
        assets.preview_url,
        assets.imageUrl,
        assets.image_url,
        assets.image,
        assets.thumbnailKey,
        assets.thumbnail_key,
        urls.thumbnailUrl,
        urls.thumbnail_url,
        r2.thumbnailUrl,
        r2.thumbnail_url,
        r2.thumbnailKey,
        r2.thumbnail_key,
        asset.thumbnailUrl,
        asset.thumbnail_url,
        asset.thumbnail,
        asset.previewUrl,
        asset.imageUrl,
        asset.image,
    ]);
    const topViewUrl = pickFirstResolvedAssetUrl([
        assets.topViewUrl,
        assets.topViewURL,
        assets.top_view_url,
        assets.topView,
        assets.topViewKey,
        assets.top_view_key,
        urls.topViewUrl,
        urls.top_view_url,
        r2.topViewUrl,
        r2.top_view_url,
        r2.topViewKey,
        r2.top_view_key,
        asset.topViewUrl,
        asset.topViewURL,
        asset.top_view_url,
    ]);

    return {
        _id: asset._id,
        id: asset.id || asset._id,
        name: asset.name,
        category: asset.category,
        sub_category: asset.sub_category || asset.subCategory || '',
        assets: {
            modelUrl,
            thumbnailUrl,
            topViewUrl,
        },
        modelUrl,
        thumbnailUrl,
        topViewUrl,
        dimensions,
        metadata: {
            dimensions,
        },
        tags: Array.isArray(asset.tags) ? asset.tags : [],
    };
};

const pickTextureAssetMetadata = (texture = {}) => ({
    _id: texture._id,
    id: texture.id ,
    displayName: texture.displayName,
    category: texture.category,
    placement: texture.placement,
        source: texture.source,
        license: texture.license,
        resolution: texture.resolution,
        maps: texture.maps || {},
        thumbnailUrl: texture.thumbnailUrl || texture.maps?.Color || "",
});

const dedupeTexturesBySourceId = (textures = []) => {
    const seenTextureKeys = new Set();
    return textures.filter((texture) => {
        const textureKey = [
            String(texture.id || texture.textureKey || '').trim().toLowerCase(),
            String(texture.category || 'other').trim().toLowerCase(),
        ].join(':');
        if (!textureKey || seenTextureKeys.has(textureKey)) return false;
        seenTextureKeys.add(textureKey);
        return true;
    });
};

////get all the assets' categories, will be used first to show available categories before showing the objects
export const getAssetsCatergoriesController = async (req, res) => {
    try {
        const queryStartedAt = process.hrtime.bigint();
        const modelCollection = getThreeDModelsCollection();
        const categories = await modelCollection.aggregate([
            {
                $match: {
                    category: { $type: 'string', $ne: '' },
                },
            },
            {
                $group: {
                    _id: '$category',
                    subcategories: { $addToSet: { $ifNull: ['$sub_category', '$subCategory'] } },
                },
            },
            { $sort: { _id: 1 } },
        ]).toArray();
        const queryDurationMs = getQueryDurationMs(queryStartedAt);
        /////  this will return categories formatted as key-label pairs for the frontend 
        const formatted_categories = categories
        .map((entry) => String(entry?._id || '').trim().toLowerCase())
        .filter(Boolean)
        .sort()
        .map((cat) => {
            const sourceEntry = categories.find(
                (entry) => String(entry?._id || '').trim().toLowerCase() === cat,
            );
            const subcategories = Array.from(
                new Set(
                    (sourceEntry?.subcategories || [])
                        .map((subCategory) => String(subCategory || '').trim().toLowerCase())
                        .filter(Boolean),
                ),
            )
                .sort()
                .map((subCategory) => ({
                    key: subCategory,
                    label: subCategory
                        .replace(/[_-]+/g, ' ')
                        .replace(/\b\w/g, (character) => character.toUpperCase()),
                }));

            return {
                key: cat,
                label: cat
                    .replace(/[_-]+/g, ' ')
                    .replace(/\b\w/g, (character) => character.toUpperCase()),
                subcategories,
            };
        });

        res.status(200).json(formatted_categories);
    } catch (error) {
        res.status(500).json({
            message: "Error fetching asset categories",
            error: error.message
        });
    }
}






//// if no category is provided, return all assets
export const getAssetsByCategoryController = async (req, res) => {
    try {
        const filter = buildModelAssetFilter(req.query);

        const queryStartedAt = process.hrtime.bigint();
        const modelCollection = getThreeDModelsCollection();
        const pagination = getPaginationOptions(req.query);
        const cursor = modelCollection
            .find(filter, { projection: MODEL_ASSET_PROJECTION })
            .sort({ name: 1 });

        if (pagination.hasPagination) {
            cursor.skip(pagination.skip).limit(pagination.limit);
        }

        const [assets, total] = await Promise.all([
            cursor.toArray(),
            pagination.hasPagination
                ? modelCollection.countDocuments(filter)
                : Promise.resolve(null),
        ]);
        const queryDurationMs = getQueryDurationMs(queryStartedAt);
        if (assets.length === 0) {
        }

        const normalizedAssets = assets.map(pickModelAssetMetadata);
        return sendAssetResponse(
            res,
            { items: normalizedAssets, total: total ?? normalizedAssets.length },
            pagination,
        );
    } catch (error) {
        res.status(500).json({
            message: "Error fetching assets",
            error: error.message
        });
    }
}

export const getPlannerTextureCategoriesController = async (req, res) => {
    try {
        const rawPlacement = req.query.placement;
        const placement = normalizePlacement(rawPlacement);

        if (rawPlacement && !placement) {
            return res.status(400).json({
                message: `Invalid placement value. Allowed values: ${TEXTURE_PLACEMENTS.join(', ')}`,
            });
        }

        const filter = {};
        if (placement === 'wall' || placement === 'floor') {
            filter.placement = { $in: [placement, 'both'] };
        } else if (placement === 'both') {
            filter.placement = 'both';
        }

        const categories = await PlannerTexture.distinct('category', filter);
        const formattedCategories = categories
            .map((category) => String(category || '').trim().toLowerCase())
            .filter(Boolean)
            .sort()
            .map((category) => ({
                key: category,
                label: category
                    .replace(/[_-]+/g, ' ')
                    .replace(/\b\w/g, (character) => character.toUpperCase()),
            }));

        return res.status(200).json(formattedCategories);
    } catch (error) {
        return res.status(500).json({
            message: "Error fetching planner texture categories",
            error: error.message,
        });
    }
};

export const getPlannerTexturesController = async (req, res) => {
    try {
        const rawPlacement = req.query.placement;
        const placement = normalizePlacement(rawPlacement);
        const category = String(req.query.category || '').trim().toLowerCase();
        const ids = String(req.query.ids || '')
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean);

        if (rawPlacement && !placement) {
            return res.status(400).json({
                message: `Invalid placement value. Allowed values: ${TEXTURE_PLACEMENTS.join(', ')}`,
            });
        }

        const filter = {};
        if (placement === 'wall' || placement === 'floor') {
            filter.placement = { $in: [placement, 'both'] };
        } else if (placement === 'both') {
            filter.placement = 'both';
        }
        if (category) {
            filter.category = category;
        }
        if (ids.length > 0) {
            filter.id = { $in: ids };
        }

        const queryStartedAt = process.hrtime.bigint();
        const pagination = getPaginationOptions(req.query);
        const query = PlannerTexture.find(filter)
            .sort({ displayName: 1 })
            .select(
                "_id id textureKey displayName name category placement source license resolution thumbnailUrl maps rendering cloudinary",
            );

        if (pagination.hasPagination) {
            query.skip(pagination.skip).limit(pagination.limit);
        }

        const [textures, total] = await Promise.all([
            query.lean(),
            pagination.hasPagination
                ? PlannerTexture.countDocuments(filter)
                : Promise.resolve(null),
        ]);
        const queryDurationMs = getQueryDurationMs(queryStartedAt);

        const normalizedTextures = dedupeTexturesBySourceId(
            textures.map(pickTextureAssetMetadata),
        );

        return sendAssetResponse(
            res,
            { items: normalizedTextures, total: total ?? normalizedTextures.length },
            pagination,
        );
    } catch (error) {
        res.status(500).json({
            message: "Error fetching planner textures",
            error: error.message
        });
    }
}
