import express from 'express';
import GeneratedImage from '../../models/generatedImageModels/generatedImage.js';
import { deductCredits } from '../../services/creditService.js';



export const postGeneratedImageController = async (postingImage) => {
    try {

        const { inputPrompt, originalImageUrl, referenceImageUrl, generatedImageUrl, isFavorite } = postingImage;


        const user_id = postingImage.user;
        //Security check 1
        if (!user_id) {
            console.log("Not authenticated");
            return res.status(401).json({ message: "Not authenticated" });
        }


        const newImage = await GeneratedImage.create({
            user: user_id,
            inputPrompt,
            originalImageUrl,
            referenceImageUrl,
            generatedImageUrl,
            isFavorite
        })

        // Deduct 50 credits for the workflow
        await deductCredits(user_id, 50, "Generated Image");


        return res.status(201).json({ message: "Image created successfully", image: newImage });

    } catch (error) {
        return res.status(500).json({ error: error.message });

    }
}






export const getGeneratedImagesController = async (req, res) => {
    try {
        const user_id = req.userId;

        //Security check 1
        if (!user_id) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        const generatedImages = await GeneratedImage.find({ user: user_id });
        console.log(generatedImages);
        res.status(200).json(generatedImages);


    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}


export const getGeneratedImageByIDController = async (req, res) => {
    try {
        const user_id = req.userId;

        //Security check 1
        if (!user_id) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        const { id } = req.params;

        const generatedImage = await GeneratedImage.findById(id);
        res.status(200).json(generatedImage);


    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}



export const deleteGeneratedImageController = async (req, res) => {
    try {
        const user_id = req.userId;

        //Security check 1
        if (!user_id) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        const { id } = req.params;

        if (!id) {
            return res.status(404).json({ error: "no ID provided" });
        }

        const deletedGeneratedImage = await GeneratedImage.findByIdAndDelete(id);

        if (!deletedGeneratedImage) {
            return res.status(404).json({ message: "Image not found" });
        }
        console.log(deletedGeneratedImage);
        return res.status(200).json({ message: "Image deleted successfully" });


    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}



export const putGeneratedImageController = async (req, res) => {
    try {
        const user_id = req.userId;

        //Security check 1
        if (!user_id) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        const { id } = req.params;
        const { inputPrompt, originalImageUrl, referenceImageUrl, generatedImageUrl, isFavorite } = req.body;
        const updatedGeneratedImage = await GeneratedImage.findByIdAndUpdate(id, { inputPrompt, originalImageUrl, referenceImageUrl, generatedImageUrl, isFavorite }, { new: true });
        if (!updatedGeneratedImage) {
            return res.status(404).json({ error: "Image not updated" });
        }
        res.status(200).json(updatedGeneratedImage);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
