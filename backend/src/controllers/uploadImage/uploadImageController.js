import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { comfyUIServiceInstance } from '../../server.js';
import { buildComfyWorkflow, COMFYUI_OUTPUT_NODE } from '../../services/ComfyUIService.js';



export const postImageController = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log('Uploaded file:', req.file);


        console.log('Uploading image to ComfyUI...');
        const comfyImageFilename = await comfyUIServiceInstance.uploadImage(req.file.path);
        console.log('Image uploaded to ComfyUI as:', comfyImageFilename);


        const workflow = buildComfyWorkflow(comfyImageFilename);
        console.log('Running ComfyUI workflow...');

        const result = await comfyUIServiceInstance.runComfyWorkflow(workflow);
        console.log('Workflow result:', result);

        const history = await comfyUIServiceInstance.getHistory(result.prompt_id);
        console.log('Workflow history:', history);


        const outputNode = history?.outputs?.[COMFYUI_OUTPUT_NODE];
        
        if (!outputNode || !outputNode.images || outputNode.images.length === 0) {
            console.error('No output image in history:', history);
            return res.status(500).json({ 
                error: 'Failed to process image - no output received',
                debug: history
            });
        }

        const outputImageInfo = outputNode.images[0];
        const outputFilename = outputImageInfo.filename;
        const outputSubfolder = outputImageInfo.subfolder || '';
        const outputType = outputImageInfo.type || 'output';

        console.log('Output image info:', outputImageInfo);


        console.log('Downloading processed image from ComfyUI...');
        const localFilename = await comfyUIServiceInstance.downloadImage(
            outputFilename,
            outputSubfolder,
            outputType
        );

        
         return res.status(200).json({
            message: 'Image uploaded and processed successfully',
            originalImage: `/uploads/uploadedImages/${req.file.filename}`,
            enhancedImageUrl: `/comfyOutputs/${localFilename}`
        });



    } catch (error) {
        console.error('Error in postImageController:', error);
        return res.status(500).json({ 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}



