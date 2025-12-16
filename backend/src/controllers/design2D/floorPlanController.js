import express from 'express';
import FloorPlanObjects from '../../models/design2D-3DModels/floorPlanObject.js';





////get all the floor plan' categories, will be used first to show available categories before showing the objects
export const getFloorPlanCategoriesController = async (req, res) => {
    try {

        const categories = await FloorPlanObjects.distinct('category');
        if (!categories || categories.length === 0) {
            return res.status(404).json({ message: "No floor plan categories found" });
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
            message: "Error fetching floor plan categories",
            error: error.message
        });
    }
}






//// if no category is provided, return all floor Plan objects
export const getFloorPlanByCategoryController = async (req, res) => {
    try {
        const category  = req.query.category  ;
        let filter = {};
        if (category) {
            filter.category = category.toLowerCase();
        }

        const floorPlanObjects = await FloorPlanObjects.find(filter)
        .sort({ name: 1 })
        .select("name category dimensions thumbnailUrl modelUrl constraints asset");


        if (floorPlanObjects.length === 0) {
            return res.status(404).json({ message: "No floor plan objects found" });
        }

        res.status(200).json(floorPlanObjects);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Error fetching floor plan objects",
            error: error.message
        });
    }
}        