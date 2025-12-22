import express from 'express';
import WebSocket from 'ws';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import FormData from 'form-data';
import { fileURLToPath } from 'url';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const comfy_output_dir = path.join(__dirname, '../../../uploads/comfyOutputs');
console.log('📁 ComfyUI output directory:', comfy_output_dir);
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
    const wsURL = isZrok ? `wss://${cleanHost}/ws` : `ws://${cleanHost}/ws`;
    return { httpURL, wsURL, isZrok };
}


export class ComfyUIService {
    constructor(host = 'localhost:8188') {
            const { httpURL, wsURL, isZrok } = getURLsFromHost(host);
            this.COMFYUI_API_URL = httpURL;
            this.COMFYUI_WS_URL = wsURL;
            this.isZrok = isZrok;
            this.ws = null;
            this.pendingJobs = new Map();  /// every prompt_id will be mapped to a resolve function of a promise 
            this.workflowNodeCounts = new Map();
            this.wsinit();
    }


    wsinit() {
        const wsOptions = this.isZrok ? { headers: { 'skip_zrok_interstitial': 'true' } } : {};

        this.ws = new WebSocket(this.COMFYUI_WS_URL, wsOptions);
        
        this.ws.on('open', () => {
            console.log('✅Connected to ComfyUI WebSocket');
        });
        this.ws.on ('message' , (data, inBinary)=>{
            
            if (inBinary) {
                return;
            }
try {

            const msg = JSON.parse(data.toString());  /// to convert the json message sent by comfyUI ws to object

            if (msg.type !== 'crystools.monitor') {
                    console.log('📨 Received from ComfyUI WS:', JSON.stringify(msg, null, 2));
                }



                // This detects completion when the standard "executed" message is missing
                if (msg.type === 'progress_state' && msg.data?.prompt_id && msg.data?.nodes) {
                    const prompt_id = msg.data.prompt_id;
                    const nodes = msg.data.nodes;
                    
                    // Count how many nodes are explicitly "finished"
                    const finishedNodes = Object.values(nodes).filter(n => n.state === 'finished').length;
                    
                    if (this.workflowNodeCounts.has(prompt_id)) {
                        const expectedNodeCount = this.workflowNodeCounts.get(prompt_id);
                        
                        if (finishedNodes >= expectedNodeCount) {
                            console.log(`🎯 All ${expectedNodeCount} nodes finished for prompt:`, prompt_id);
                            
                            if (this.pendingJobs.has(prompt_id)) {
                                const { resolve } = this.pendingJobs.get(prompt_id);
                                // Resolve with the prompt_id since we might not have the full output data yet
                                resolve({ prompt_id }); 
                                this.pendingJobs.delete(prompt_id);
                                this.workflowNodeCounts.delete(prompt_id);
                            }
                        }
                    }
                }
                // --------------------------------------




                const isExecuted = msg.type === 'executed' && msg.data?.prompt_id;
                const isProgressComplete = msg.type === 'executing' && msg.data?.prompt_id && msg.data?.node === null;       

                if (isExecuted || isProgressComplete) {
                const prompt_id = msg.data.prompt_id
                if (this.pendingJobs.has(prompt_id)) {
                    console.log('✅Workflow completed for prompt_id:', prompt_id);
                    const {resolve} = this.pendingJobs.get(prompt_id); ///will return the corresponding resolve fun of the prompt_id
                    resolve (msg.data);
                    this.pendingJobs.delete(prompt_id);
                }
            }

} catch (error) {
            console.error('❌Error executing ComfyUI workflow:', error);
            throw error;
}
        });

        this.ws.on('close', () => {
            console.log('⚠️ ComfyUI WebSocket connection closed');
            this.pendingJobs.forEach(({ reject }) => {
                reject(new Error('WebSocket connection closed'));
            });
            this.pendingJobs.clear();
        });

        this.ws.on('error', (error) => {
            console.error('❌ ComfyUI WebSocket error:', error);
        });

}

/* Setting the paths to Upload the image to Comfy*/
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

            console.log('✅ Image uploaded to ComfyUI:', response.data);
            
            return response.data.name; // ComfyUI returns the filename
        } catch (error) {
            console.error('❌ Error uploading image to ComfyUI:', error.response?.data || error.message);
            throw error;
        }
    }



/* download the image after comfy */ 
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


            console.log('✅ Image fetched from ComfyUI, size:', response.data.length, 'bytes');

            const outputPath = path.join(comfy_output_dir, filename);
            console.log('💾 Saving to:', outputPath);
            
            
            fs.writeFileSync(outputPath, response.data);
            console.log('✅ Image saved successfully to:', outputPath);
            
                        // Verify file was written
            if (fs.existsSync(outputPath)) {
                const stats = fs.statSync(outputPath);
                console.log('✅ File verified, size:', stats.size, 'bytes');
            } else {
                console.error('❌ File was not written to disk!');
            }


                return filename; // Return just the filename for URL construction

                
            } catch (error) {
            console.error('❌ Error downloading image from ComfyUI:');
            console.error('   Status:', error.response?.status);
            console.error('   Message:', error.message);
            console.error('   Data:', error.response?.data);
            throw error;
            }
        }


    
    async runComfyWorkflow(workflow) {

        try {

            console.log('🚀 Sending workflow to ComfyUI...');
            console.log('📋 Workflow:', JSON.stringify(workflow, null, 2));
            
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
            console.log('✅ ComfyUI workflow started with prompt_id:', prompt_id);


            const nodeCount = Object.keys(workflow).length;
            this.workflowNodeCounts.set(prompt_id, nodeCount);
            console.log(`📊 Tracking ${nodeCount} nodes for prompt ${prompt_id}`);


            
            return new Promise((resolve, reject) => {
                this.pendingJobs.set(prompt_id, {resolve , reject});
            
            
                setTimeout(() => {
                    if (this.pendingJobs.has(prompt_id)) {
                        this.pendingJobs.delete(prompt_id);
                        reject(new Error('Workflow execution timeout'));
                    }
                }, 300000); // 5 minutes timeout});         
            });    

        } catch (error) {
            console.error('❌ Error running ComfyUI workflow:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', JSON.stringify(error.response.data, null, 2));
            }
            throw error;
        }

}


        /* get the history of a specific uploaded prompt to fetch the result */ 
        async getHistory(promptId) {
            try {

                console.log('📜 Getting history for prompt_id:', promptId);
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
            console.log('📜 History data:', JSON.stringify(historyData, null, 2));
        
        } catch (error) {
                console.error('Error getting history from ComfyUI:', error);
                throw error;
            }
        }

}




export function buildComfyWorkflow(inputImageFilename) {
    return {
        "1": {
            "inputs": {
            "image": inputImageFilename
            },
            "class_type": "LoadImage",
            "_meta": {
            "title": "Load Image"
            }
        },
        "2": {
            "inputs": {
            "image": [
                "1",
                0
            ]
            },
            "class_type": "ImageInvert",
            "_meta": {
            "title": "Invert Image"
            }
        },
        "3": {
            "inputs": {
            "filename_prefix": "ComfyUI",
            "images": [
                "2",
                0
            ]
            },
            "class_type": "SaveImage",
            "_meta": {
            "title": "Save Image"
            }
        }
    };
}


export const COMFYUI_OUTPUT_NODE = "3"
