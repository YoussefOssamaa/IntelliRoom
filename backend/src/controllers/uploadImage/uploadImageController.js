import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { comfyUIServiceInstance } from '../../server.js';
//import { buildComfyWorkflow, COMFYUI_OUTPUT_NODE } from '../../services/ComfyUIService.js';
import { setTimeout } from 'node:timers/promises';
import { buildComfyWorkflow1, buildComfyWorkflow2, COMFYUI_OUTPUT_NODE_WF1 } from '../../services/workflow_1.js';
import { escape } from 'node:querystring';


export const postImageController = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const workflowNumber = req.body.workflowNumber;
        const inputPrompt = req.body.inputPrompt 

        console.log('Uploaded file:', req.file);


        console.log('Uploading image to ComfyUI...');
        const comfyImageFilename = await comfyUIServiceInstance.uploadImage(req.file.path);
        console.log('Image uploaded to ComfyUI as:', comfyImageFilename);






        
    
        let comfyOutputNode = "";
        let workflow = null;

      if (workflowNumber === 1) {
        workflow = buildComfyWorkflow1(comfyImageFilename);
        comfyOutputNode = COMFYUI_OUTPUT_NODE_WF1;
      }
      else if (workflowNumber === 2) {
        workflow = buildComfyWorkflow2(comfyImageFilename, inputPrompt);
        comfyOutputNode = COMFYUI_OUTPUT_NODE_WF2;
      }
      else if (workflowNumber === 3) {
       workflow = buildComfyWorkflow3(comfyImageFilename, inputPrompt);
       comfyOutputNode = COMFYUI_OUTPUT_NODE_WF3;
      }




        console.log('Running ComfyUI workflow...');

        const result = await comfyUIServiceInstance.runComfyWorkflow(workflow);
        console.log('Workflow result:', result);


        const outputNode = result.outputs[comfyOutputNode];
        
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



