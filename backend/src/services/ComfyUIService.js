import express from 'express';
import WebSocket from 'ws';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import FormData from 'form-data';
import { fileURLToPath } from 'url';
import { setTimeout as wait } from 'node:timers/promises';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const comfy_output_dir = path.join(__dirname, '../../uploads/comfyOutputs');
console.log('ComfyUI output directory:', comfy_output_dir);
try {
    await fs.promises.stat(comfy_output_dir);
} catch {
    console.log('Directory does not exist, creating it...');
    await fs.promises.mkdir(comfy_output_dir, { recursive: true });
}


function isZrokHost(host) {
    return host && host.includes('.shares.zrok.io');
}
function getURLsFromHost(host) {
    const cleanHost = host.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const isZrok = isZrokHost(cleanHost);
    const httpURL = isZrok ? `https://${cleanHost}` : `http://${cleanHost}`;
    return { httpURL, isZrok };
}


export class ComfyUIService {
    constructor(host = 'localhost:8188') {
        const { httpURL, wsURL, isZrok } = getURLsFromHost(host);
        this.COMFYUI_API_URL = httpURL;
        this.isZrok = isZrok;

    }



    async uploadImage(filePath, subfolder = '') {
        try {
            console.log('📤 Uploading image to ComfyUI:', filePath);

            const formData = new FormData();
            formData.append('image', fs.createReadStream(filePath));
            if (subfolder) {
                formData.append('subfolder', subfolder);
            }

            const headers = formData.getHeaders();
            if (this.isZrok) {
                headers['skip_zrok_interstitial'] = 'true';
            }

            const response = await axios.post(
                `${this.COMFYUI_API_URL}/upload/image`,
                formData,
                { headers }
            );

            console.log('Image uploaded to ComfyUI:', response.data);
            return response.data.name; // ComfyUI returns the filename
        } catch (error) {
            console.error('Error uploading image to ComfyUI:', error.response?.data || error.message);
            throw error;
        }
    }



    async downloadImage(filename, subfolder = '', type = 'output') {
        try {

            console.log('📥 Attempting to download image from ComfyUI...');
            console.log('   Filename:', filename);
            console.log('   Subfolder:', subfolder || '(none)');
            console.log('   Type:', type);



            const params = new URLSearchParams({
                filename,
                type,
                ...(subfolder && { subfolder })
            });

            const headers = {};
            if (this.isZrok) {
                headers['skip_zrok_interstitial'] = 'true';
            }

            const response = await axios.get(
                `${this.COMFYUI_API_URL}/view?${params.toString()}`,
                {
                    responseType: 'arraybuffer',
                    headers
                }
            );


            console.log('Image fetched from ComfyUI, size:', response.data.length, 'bytes');

            const outputPath = path.join(comfy_output_dir, filename);
            console.log('💾 Saving to:', outputPath);

            await fs.promises.writeFile(outputPath, response.data);
            console.log('Image saved successfully to:', outputPath);

            try {
                // Verify file was written
                const outputFileStatus = await fs.promises.stat(outputPath)
                console.log('Output File verified, size:', outputFileStatus.size, 'bytes');
            } catch (err) {
                if (err.code === 'ENOENT') {
                    console.error('File does not exist:', outputPath);
                    // Handle the "file not found" case here
                } else {
                    console.error('Error checking file:', err);
                }
            }

            return filename; // Return just the filename for URL construction


        } catch (error) {
            console.error('Error downloading image from ComfyUI:');
            console.error('   Status:', error.response?.status);
            console.error('   Message:', error.message);
            console.error('   Data:', error.response?.data);
            throw error;
        }
    }
    // async uploadImageBuffer(imageBuffer, filename = `upload-${Date.now()}.png`, subfolder = '') {
    //     try {
    //         const formData = new FormData();
    //         formData.append('image', imageBuffer, {
    //             filename
    //         });

    //         if (subfolder) {
    //             formData.append('subfolder', subfolder);
    //         }

    //         const headers = formData.getHeaders();
    //         if (this.isZrok) {
    //             headers['skip_zrok_interstitial'] = 'true';
    //         }

    //         const response = await axios.post(
    //             `${this.COMFYUI_API_URL}/upload/image`,
    //             formData,
    //             { headers }
    //         );

    //         return response.data.name;
    //     } catch (error) {
    //         console.error('Error uploading image buffer to ComfyUI:', error.response?.data || error.message);
    //         throw error;
    //     }
    // }



    async runComfyWorkflow(workflow) {

        try {

            console.log('Sending workflow to ComfyUI...');
            console.log('Workflow:', JSON.stringify(workflow, null, 2));
            const headers = { 'Content-Type': 'application/json' };
            if (this.isZrok) {
                headers['skip_zrok_interstitial'] = 'true';
            }


            const response = await axios.post(
                `${this.COMFYUI_API_URL}/prompt`,
                { prompt: workflow },
                { headers }
            )


            const prompt_id = response.data.prompt_id;
            console.log('ComfyUI workflow started with prompt_id:', prompt_id);



            return await this.pollForCompletion(prompt_id);

        } catch (error) {
            console.error('Error running ComfyUI workflow:', error.message);

            throw error;
        }

    }
    // async getImageBuffer(filename, subfolder = '', type = 'output') {
    //     try {
    //         const params = new URLSearchParams({
    //             filename,
    //             type,
    //             ...(subfolder && { subfolder })
    //         });

    //         const headers = {};
    //         if (this.isZrok) {
    //             headers['skip_zrok_interstitial'] = 'true';
    //         }

    //         const response = await axios.get(
    //             `${this.COMFYUI_API_URL}/view?${params.toString()}`,
    //             {
    //                 responseType: 'arraybuffer',
    //                 headers
    //             }
    //         );

    //         return Buffer.from(response.data);
    //     } catch (error) {
    //         console.error('Error fetching image buffer from ComfyUI:', error.response?.data || error.message);
    //         throw error;
    //     }
    // }





    async pollForCompletion(promptId) {

        await wait(3000);   // waits 3 seconds in the beginning
        const MAX_RETRIES = 300; // Wait up to 300 seconds (5 mins)

        for (let i = 0; i < MAX_RETRIES; i++) {
            try {

                const history = await this.getHistory(promptId);


                if (history && history.outputs) {
                    console.log('Workflow completed!');
                    return history;
                }

                await wait(2000); // wait 2 seconds before checking the history again

            } catch (error) {
                console.error('Polling error (retrying):', error.message);
                await wait(2000);
            }
        }

        throw new Error('Timeout: Workflow did not finish within 5 minutes.');
    }




    async getHistory(promptId) {
        try {

            console.log(`Check if prompt_id ${promptId} appeared in history`);
            const headers = {};
            if (this.isZrok) {
                headers['skip_zrok_interstitial'] = 'true';
            }

            const response = await axios.get(
                `${this.COMFYUI_API_URL}/history/${promptId}`,
                { headers }
            );

            const historyData = response.data[promptId];
            console.log('History data:', JSON.stringify(historyData, null, 2));
            return historyData;

        } catch (error) {
            console.error('Error getting history from ComfyUI:', error);
            throw error;
        }
    }

}