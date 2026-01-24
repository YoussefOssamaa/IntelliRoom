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
const comfy_output_dir = path.join(__dirname, '../../../uploads/comfyOutputs');
console.log('ComfyUI output directory:', comfy_output_dir);
if (!fs.existsSync(comfy_output_dir)) {
  fs.mkdirSync(comfy_output_dir, { recursive: true });
} 



function isZrokHost(host) {
    return host && host.includes('.share.zrok.io');
}
function getURLsFromHost(host) {
    const cleanHost = host.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const isZrok = isZrokHost(cleanHost);
    const httpURL = isZrok ? `https://${cleanHost}` : `http://${cleanHost}`;
    return { httpURL,  isZrok };
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
            
            
            fs.writeFileSync(outputPath, response.data);
            console.log('Image saved successfully to:', outputPath);
            
                        // Verify file was written
            if (fs.existsSync(outputPath)) {
                const stats = fs.statSync(outputPath);
                console.log('File verified, size:', stats.size, 'bytes');
            } else {
                console.error('File was not written to disk!');
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
                { prompt: workflow} , 
                { headers }
            )


            const prompt_id  = response.data.prompt_id;
            console.log('ComfyUI workflow started with prompt_id:', prompt_id);



            return await this.pollForCompletion(prompt_id);

        } catch (error) {
            console.error('Error running ComfyUI workflow:', error.message);

            throw error;
        }

}




async pollForCompletion(promptId) {

        await wait(2000);   // waits 2 seconds in the beginning
        const MAX_RETRIES = 300; // Wait up to 300 seconds (5 mins)
        
        for (let i = 0; i < MAX_RETRIES; i++) {
            try {

                const history = await this.getHistory(promptId);


                if (history && history.outputs) {
                    console.log('Workflow completed!');
                    return history;
                }

                await wait(1000); 

            } catch (error) {
                console.error('Polling error (retrying):', error.message);
                await wait(1000);
            }
        }

        throw new Error('Timeout: Workflow did not finish within 5 minutes.');
    }




        async getHistory(promptId) {
            try {

                console.log(`Check if prompt_id ${promptId} appeared in history` );
                const headers = {};
                if (this.isZrok) {
                    headers['skip_zrok_interstitial'] = 'true';
                }

                const response = await axios.get(
                    `${this.COMFYUI_API_URL}/history/${promptId}`,
                    { headers }
                );

            const historyData = response.data[promptId];
            return historyData;
            console.log('History data:', JSON.stringify(historyData, null, 2));
        
        } catch (error) {
                console.error('Error getting history from ComfyUI:', error);
                throw error;
            }
        }

}




export function buildComfyWorkflow(inputImageFilename, inputPrompt) {
        return {
 
};
}

export const COMFYUI_OUTPUT_NODE = "45";
