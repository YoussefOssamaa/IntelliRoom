
import Product from '../../models/ecommerceModels/product.js';

export const getMatchedProductsFromDB = async (recommendedImagesArray) => {
    try {


        let matchedProducts = null
        let baseFileNames = null
        if (!recommendedImagesArray || recommendedImagesArray.length == 0) {
            return await Product.find().limit(10);
        } else {

            baseFileNames = recommendedImagesArray.map(file =>
                file.replace(/\.(png|jpg|jpeg)$/i, '')
            );

            matchedProducts = await Product.find({
                sku: { $in: baseFileNames }
            }).lean();
        }

        const productMap = new Map(
            matchedProducts.map(item => [item.sku, item])
        );

        return baseFileNames.map(
            sku => { return productMap.get(sku) }
        ).filter(product => product !== undefined)

    } catch (error) {
        console.error('Error in getMatchedProductsFromDB:', error);
        return [];
    }
}