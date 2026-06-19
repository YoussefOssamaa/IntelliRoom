
const ASSET_URL_PARSE_BASE = "https://immutable.asset.local";
const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";
const SUPABASE_PUBLIC_OBJECT_PATH_PATTERN =
  /^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/i;

const toUniqueNonEmptyList = (values = []) =>
  Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );

const getRuntimeOrigin = () => {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return "http://localhost";
};

export const getBackendOrigin = () => {
  try {
    return new URL(API_BASE_URL, getRuntimeOrigin()).origin;
  } catch (_) {
    return "";
  }
};

export const getApiBasePathname = () => {
  try {
    const pathname = new URL(API_BASE_URL, getRuntimeOrigin()).pathname || "";
    const normalizedPathname = pathname.replace(/\/+$/, "");
    return normalizedPathname || "/";
  } catch (_) {
    return "/";
  }
};

export const canonicalizeAssetUrl = (
  assetUrl,
  { preferBackendOriginForRelative = false } = {},
) => {
  const rawUrl = String(assetUrl || "").trim();
  if (!rawUrl) return "";
  if (/^(blob:|data:)/i.test(rawUrl)) return rawUrl;

  try {
    const parsed = new URL(rawUrl, ASSET_URL_PARSE_BASE);
    parsed.hash = "";

    if (/^(https?:)?\/\//i.test(rawUrl)) {
      return parsed.toString();
    }

    const relativePathWithQuery = `${parsed.pathname}${parsed.search}`;
    if (!preferBackendOriginForRelative) {
      return relativePathWithQuery;
    }

    const backendOrigin = getBackendOrigin();
    if (backendOrigin && relativePathWithQuery.startsWith("/")) {
      return `${backendOrigin}${relativePathWithQuery}`;
    }

    return relativePathWithQuery;
  } catch (_) {
    return rawUrl;
  }
};

export const buildAssetUrlCandidates = (
  assetUrl,
  { includeBackendOrigin = true, includeApiBasePathVariant = true } = {},
) => {
  const rawUrl = String(assetUrl || "").trim();
  if (!rawUrl) return [];
  if (/^(blob:|data:)/i.test(rawUrl)) return [rawUrl];

  const normalizedPathWithQuery = canonicalizeAssetUrl(rawUrl, {
    preferBackendOriginForRelative: false,
  });
  const candidates = [rawUrl, normalizedPathWithQuery];

  if (includeBackendOrigin && normalizedPathWithQuery.startsWith("/")) {
    const backendOrigin = getBackendOrigin();
    if (backendOrigin) {
      candidates.push(`${backendOrigin}${normalizedPathWithQuery}`);

      if (includeApiBasePathVariant) {
        const apiPathname = getApiBasePathname();
        if (
          apiPathname &&
          apiPathname !== "/" &&
          !normalizedPathWithQuery.startsWith(`${apiPathname}/`)
        ) {
          candidates.push(
            `${backendOrigin}${apiPathname}${normalizedPathWithQuery}`,
          );
        }
      }
    }
  }

  return toUniqueNonEmptyList(candidates);
};

const normalizeUrlPathEncoding = (absoluteUrl) => {
  try {
    const parsed = new URL(absoluteUrl);
    const encodedPathname = parsed.pathname
      .split("/")
      .map((segment) => {
        if (!segment) return segment;
        try {
          return encodeURIComponent(decodeURIComponent(segment));
        } catch (_) {
          return encodeURIComponent(segment);
        }
      })
      .join("/");

    if (encodedPathname && encodedPathname !== parsed.pathname) {
      parsed.pathname = encodedPathname;
      return parsed.toString();
    }
  } catch (_) {
    // Keep original URL when parsing fails.
  }

  return "";
};

const buildSupabaseBucketVariants = (absoluteUrl) => {
  try {
    const parsed = new URL(absoluteUrl);
    const pathMatch = parsed.pathname.match(SUPABASE_PUBLIC_OBJECT_PATH_PATTERN);
    if (!pathMatch) return [];

    const [, originalBucket, objectPath] = pathMatch;
    const bucketCandidates = [
      originalBucket,
      originalBucket.toLowerCase(),
      originalBucket.charAt(0).toUpperCase() + originalBucket.slice(1).toLowerCase(),
    ];

    return toUniqueNonEmptyList(
      bucketCandidates.map((bucketName) => {
        parsed.pathname = `/storage/v1/object/public/${bucketName}/${objectPath}`;
        return parsed.toString();
      }),
    );
  } catch (_) {
    return [];
  }
};

export const buildResilientAssetUrlCandidates = (
  assetUrl,
  options = {},
) => {
  const baseCandidates = buildAssetUrlCandidates(assetUrl, options);
  const additionalCandidates = [];

  baseCandidates.forEach((candidate) => {
    if (!/^(https?:)?\/\//i.test(candidate)) return;

    const encodedVariant = normalizeUrlPathEncoding(candidate);
    if (encodedVariant) {
      additionalCandidates.push(encodedVariant);
    }

    additionalCandidates.push(...buildSupabaseBucketVariants(candidate));
  });

  return toUniqueNonEmptyList([...baseCandidates, ...additionalCandidates]);
};
