import express from 'express';
import WebSocket from 'ws';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const comfy_output_dir = path.join(__dirname, '../../uploads/comfyOutputs');
if (!fs.existsSync(comfy_output_dir)) {
  fs.mkdirSync(comfy_output_dir, { recursive: true });
}

// Helper to determine if host is zrok and needs special handling
function isZrokHost(host) {
    return host && host.includes('.share.zrok.io');
}

// Get proper HTTP/WS URLs from a host
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
            this.wsinit();
    }


    wsinit() {
        // Add zrok header for WebSocket if needed
        const wsOptions = this.isZrok ? { headers: { 'skip_zrok_interstitial': 'true' } } : {};
        
        this.ws = new WebSocket(this.COMFYUI_WS_URL, wsOptions);
        
        this.ws.on('open', () => {
            console.log('Connected to ComfyUI WebSocket at', this.COMFYUI_WS_URL);
        });
        this.ws.on ('message' , (data)=>{
            const msg = JSON.parse(data.toString());  /// to convert the json message sent by comfyUI ws to object
            
            // Only log non-monitor messages to reduce noise
            if (msg.type !== 'crystools.monitor') {
                console.log('Received from ComfyUI WS:', msg);
            }
            
            // Handle both 'executed' and 'progress_state' as completion signals
            // Different ComfyUI versions may use different message types
            const isExecuted = msg.type === 'executed' && msg.data?.prompt_id;
            const isProgressComplete = msg.type === 'progress_state' && msg.data?.prompt_id && msg.data?.nodes;
            
            if (isExecuted || isProgressComplete) {
                const prompt_id = msg.data.prompt_id;
                if (this.pendingJobs.has(prompt_id)) {
                    console.log('Workflow completed for prompt_id:', prompt_id);
                    const resolve = this.pendingJobs.get(prompt_id);
                    resolve(msg.data);
                    this.pendingJobs.delete(prompt_id);
                }
            }
        });

    this.ws.on('close', () => {
        console.log('ComfyUI WebSocket connection closed');
    });

    this.ws.on('error', (error) => {
        console.error('ComfyUI WebSocket error:', error);
    });

}

    async runComfyWorkflow(workflow) {

        try {
            // Add zrok header if needed
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

            return new Promise((resolve) => {
                this.pendingJobs.set(prompt_id, resolve);
            });         

        } catch (error) {
            console.error('Error running ComfyUI workflow:', error);
            throw error;
        }

}
}


export function buildComfyWorkflow(inputImagePath) {
    return {
        "1": {
            "class_type": "LoadImage",
            "inputs": {
                "image": inputImagePath
            }
        },
        "2": {
            "class_type": "SomeEnhanceNode",
            "inputs": {
                "image": ["1", 0]
            }
        },
        "3": {
            "class_type": "SaveImage",
            "inputs": {
                "images": ["2", 0],
                "filename_prefix": "enhanced",
                "base_path": comfy_output_dir
            }
        }
    };
}






