import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { comfyUIServiceInstance } from '../../server.js';
import { setTimeout } from 'node:timers/promises';
import { escape } from 'node:querystring';
import { COMFYUI_OUTPUT_NODE } from '../../../../ai/ComfyUI_Workflows/API_Format/Final_workflow_API.mjs';



//const TEST_USER_ID = "64f3a5e6a3c9b7f1a1234567"; /// should be replaced with req.user.id after authentication is implemented



export const postImageController = async (req, res) => {
    try {
            if (!req.files?.image?.[0]) {
            return res.status(400).json({ error: 'Main image is required' });
            }

        const mainImage = req.files.image[0];
        const referenceImage = req.files.referenceImage?.[0];  
        const inputPrompt = req.body.inputPrompt || ''        
        console.log('Uploaded file:', req.file);


        console.log('Uploading image to ComfyUI...');


        const comfyImageFilename = await comfyUIServiceInstance.uploadImage(mainImage.path);
        console.log('Main image uploaded to ComfyUI as:', comfyImageFilename);


        let inputReferenceImageFilename = null;

        if (referenceImage) {
        inputReferenceImageFilename = await comfyUIServiceInstance.uploadImage(referenceImage.path);
       
            console.log('Reference image uploaded to ComfyUI as:', inputReferenceImageFilename);

        }


        let comfyOutputNode = "";


        const workflow = buildComfyWorkflow(comfyImageFilename, inputReferenceImageFilename, inputPrompt );
        comfyOutputNode = COMFYUI_OUTPUT_NODE;

        console.log('Running ComfyUI workflow...');

        const result = await comfyUIServiceInstance.runComfyWorkflow(workflow);
        console.log('Workflow result:', result);


        const outputNode = result.outputs[comfyOutputNode];
        
        if (!outputNode || !outputNode.images || outputNode.images.length === 0) {
            return res.status(500).json({ 
                error: 'Failed to process image - no output received',
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

        await setTimeout(1000);
        
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