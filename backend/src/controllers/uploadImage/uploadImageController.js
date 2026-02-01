import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { comfyUIServiceInstance } from '../../server.js';
import { setTimeout } from 'node:timers/promises';
import { escape } from 'node:querystring';
import { buildComfyWorkflow_emptyRoom, COMFYUI_OUTPUT_NODE_WF_EMPTYROOM } from '../../../../ai/ComfyUI_Workflows/API_Format/emptyroom_workflow_API.mjs';
import { buildComfyWorkflow_ultimateUpScale, COMFYUI_OUTPUT_NODE_WF_ULTIMATEUPSCALE } from '../../../../ai/ComfyUI_Workflows/API_Format/UltimateUpScale_API.mjs';
import { buildComfyWorkflow_sketch, COMFYUI_OUTPUT_NODE_WF_SKETCH } from '../../../../ai/ComfyUI_Workflows/API_Format/Sketch_workflow_API.mjs';
import { buildComfyWorkflow_objectReplace, COMFYUI_OUTPUT_NODE_WF_OBJECTREPLACE } from '../../../../ai/ComfyUI_Workflows/API_Format/object_replace_API.mjs';
import { buildComfyWorkflow_objectReplaceWithST, COMFYUI_OUTPUT_NODE_WF_OBJECTREPLACEWITHST } from '../../../../ai/ComfyUI_Workflows/API_Format/object_replace_with_ST_API.mjs';



const TEST_USER_ID = "64f3a5e6a3c9b7f1a1234567"; /// should be replaced with req.user.id after authentication is implemented



export const postImageController = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const workflowNumber = Number(req.body.workflowNumber || 1);
        const inputPrompt = req.body.inputPrompt || ''
        const replacementPrompt = req.body.replacementPrompt || '';

        console.log('Uploaded file:', req.file);


        console.log('Uploading image to ComfyUI...');
        const comfyImageFilename = await comfyUIServiceInstance.uploadImage(req.file.path);
        console.log('Image uploaded to ComfyUI as:', comfyImageFilename);

        
    
        let comfyOutputNode = "";
        let workflow = null;


      if (workflowNumber === 1) {
        workflow = buildComfyWorkflow_emptyRoom(comfyImageFilename, inputPrompt);
        comfyOutputNode = COMFYUI_OUTPUT_NODE_WF_EMPTYROOM;
      }
      else if (workflowNumber === 2) {
        workflow = buildComfyWorkflow_ultimateUpScale(comfyImageFilename, inputPrompt);
        comfyOutputNode = COMFYUI_OUTPUT_NODE_WF_ULTIMATEUPSCALE;
      }
      else if (workflowNumber === 3) {
       workflow = buildComfyWorkflow_sketch(comfyImageFilename, inputPrompt);
       comfyOutputNode = COMFYUI_OUTPUT_NODE_WF_SKETCH;
      }
      else if (workflowNumber === 4) {
       workflow = buildComfyWorkflow_objectReplace(comfyImageFilename, inputPrompt, replacementPrompt);
       comfyOutputNode = COMFYUI_OUTPUT_NODE_WF_OBJECTREPLACE;
      }
      else if (workflowNumber === 5) {
       workflow = buildComfyWorkflow_objectReplaceWithST(comfyImageFilename, inputPrompt , replacementPrompt);
       comfyOutputNode = COMFYUI_OUTPUT_NODE_WF_OBJECTREPLACEWITHST;
      }




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