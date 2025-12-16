import express from 'express';
import Assets from '../../models/design2D-3DModels/assets.js';



////get all the assets' categories, will be used first to show available categories before showing the objects
export const getAssetsCatergoriesController = async (req, res) => {
    try {

        const categories = await Assets.distinct('category');
        if (!categories || categories.length === 0) {
            return res.status(404).json({ message: "No asset categories found" });
        }


        /////  this will return categories formatted as key-label pairs for the frontend 
        const formatted_categories = categories
        .map(cat => cat.toLowerCase())
        .sort()
        .map(cat => ({
        key: cat,
        label: cat.charAt(0).toUpperCase() + cat.slice(1)
      }));

        res.status(200).json(formatted_categories);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Error fetching asset categories",
            error: error.message
        });
    }
}






//// if no category is provided, return all assets
export const getAssetsByCategoryController = async (req, res) => {
    try {
        const category  = req.query.category  ;
        let filter = {};
        if (category) {
            filter.category = category.toLowerCase();
        }

        const assets = await Assets.find(filter)
        .sort({ name: 1 })
        .select("name thumbnailUrl modelUrl category dimensions");


        if (assets.length === 0) {
            return res.status(404).json({ message: "No assets found" });
        }

            res.status(200).json(assets);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Error fetching assets",
            error: error.message
        });
    }
}        
        

