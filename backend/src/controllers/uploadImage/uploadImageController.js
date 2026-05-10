import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { comfyUIServiceInstance } from '../../server.js';
import { setTimeout } from 'node:timers/promises';
import { escape } from 'node:querystring';
import { buildComfyWorkflow, COMFYUI_OUTPUT_NODE } from '../../../../ai/ComfyUI_Workflows/API_Format/Final_workflow_API.mjs';
import { getRecommendations } from './getRecommendations.js';
import { getMatchedProductsFromDB } from './getMatchedProductsFromDB.js';
import axios from 'axios';

const TEST_MODE = false;  // set to true to skip ComfyUI processing and return test recommendations

export const postImageController = async (req, res) => {
    try {
        if (!req.files?.image?.[0]) {
            return res.status(400).json({ error: 'Main image is required' });
        }

        const mainImage = req.files.image[0];
        const referenceImage = req.files.referenceImage?.[0];
        const inputPrompt = req.body.inputPrompt || ''
        console.log('Uploaded file:', mainImage.filename);


        console.log('Uploading image to ComfyUI...');


        const comfyImageFilename = await comfyUIServiceInstance.uploadImage(mainImage.path);
        console.log('Main image uploaded to ComfyUI as:', comfyImageFilename);


        let inputReferenceImageFilename = null;

        if (referenceImage) {
            inputReferenceImageFilename = await comfyUIServiceInstance.uploadImage(referenceImage.path);

            console.log('Reference image uploaded to ComfyUI as:', inputReferenceImageFilename);

        }


        let comfyOutputNode = "";


        const workflow = buildComfyWorkflow(comfyImageFilename, inputReferenceImageFilename, inputPrompt);
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

        /////////////// will be changed to be uploaded to a cloud storage, not downloaded locally
        console.log('Downloading processed image from ComfyUI...');
        const localFileName = await comfyUIServiceInstance.downloadImage(
            outputFilename,
            outputSubfolder,
            outputType
        );

        //const fullImagePath = `/api/comfyOutputs/${localFileName}`;
        let recommendations = [];
        let matchedProducts = [];
        try {
            // const backendContainer = process.env.NODE_ENV === 'production' ? 'backend' : 'dev';
            // const absoluteImageUrl = `http://${backendContainer}:5000${fullImagePath}`;

            //const absoluteImageUrl = `http://localhost:5000${fullImagePath}`;
            // // const response = await axios.post('http://orchestrator:7860/search', {
            // //     image_url: absoluteImageUrl
            // // });

            /*curl -X 'POST' \
             'https://mohamedsameh77i-intellivdb.hf.space/search?top_k=5' \
             -H 'accept: application/json' \
             -H 'Content-Type: multipart/form-data' \
             -F 'file=@after.png;type=image/png'  */
            inputPrompt
            if (TEST_MODE) {
                recommendations = await getRecommendations("", 10);
                console.log("THIS IS THE RECOMMENDATIONS ARRAY", recommendations)

            }
            else {
                recommendations = await getRecommendations(localFileName, 10);
                console.log("THIS IS THE RECOMMENDATIONS ARRAY", recommendations)
            }

            const recommendedImagesArray = recommendations.map(item => item.filename);
            console.log("THIS IS THE RECOMMENDED IMAGE URLS", recommendedImagesArray)

            /*
                the arrey looks like this: 
                [   'img1080.png',
                'img0870.png',
                'img0600.png',
                'img0439.png',
                'img0855.png',
                'img1191.png',
                'img0630.png',
                'img0001.png',
                'img0387.png',
                    'img1171.png' ]


                and in the db the sku looks like this:
                _id: ObjectId('69fec26951a32a474548e159'),
                sku: 'img1184',
                name: 'Sunny Yellow Lounge',
                slug: 'sunny-yellow-lounge-1106',


            */

            matchedProducts = await getMatchedProductsFromDB(recommendedImagesArray);
            console.log("THIS IS THE MATCHED PRODUCTS", matchedProducts)


        } catch (error) {
            console.error('Error in postImageController recommendations search request:', error);
        }

        await setTimeout(500);  /// delay to allow the output image to appear on the frontend page

        return res.status(200).json({
            success: true,
            originalImage: `/uploads/uploadedImages/${mainImage.filename}`,
            referenceImage: referenceImage ? `/uploads/referenceImages/${referenceImage.filename}` : null,
            enhancedImageUrl: `/uploads/comfyOutputs/${localFileName}`,
            matchedProducts: matchedProducts
        });



    } catch (error) {
        console.error('Error in postImageController:', error);
        return res.status(500).json({
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}