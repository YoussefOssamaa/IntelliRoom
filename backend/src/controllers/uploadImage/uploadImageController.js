import express from 'express';
import multer from 'multer';
import { comfyUIServiceInstance } from '../../server.js';
import { buildComfyWorkflow } from '../../services/ComfyUIService.js';



export const postImageController = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }


        const inputImagePath = req.file.path;

        const workflow = buildComfyWorkflow(inputImagePath);

        const result = await comfyUIServiceInstance.runComfyWorkflow(workflow);

        const outputImage = result.outputs?.["3"]?.images?.[0]?.filename;
        
        if (!outputImage) {
            return res.status(500).json({ error: 'Failed to process image' });
        }


        return res.status(200).json({
            message: 'Image uploaded and processed successfully',
            enhancedImageUrl: `/uploads/uploadedImages/${outputImage}`
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}



