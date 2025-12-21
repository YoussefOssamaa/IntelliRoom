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




export class ComfyUIService {
    constructor(httpURL = 'http://localhost:8188', wsURL = 'ws://localhost:8188/ws') {
            this.COMFYUI_API_URL = httpURL;
            this.COMFYUI_WS_URL = wsURL;
            this.ws = null;
            this.pendingJobs = new Map();  /// every prompt_id will be mapped to a resolve function of a promise 
            this.wsinit();
    }


    wsinit() {

        this.ws = new WebSocket(this.COMFYUI_WS_URL);
        
        this.ws.on('open', () => {
            console.log('Connected to ComfyUI WebSocket');
        });
        this.ws.on ('message' , (data)=>{
            const msg = JSON.parse(data.toString());  /// to convert the json message sent by comfyUI ws to object
            console.log('Received from ComfyUI WS:', msg);
            if (msg.type === 'executed' && msg.data.prompt_id) {
                
                if (this.pendingJobs.has(msg.data.prompt_id)) {
                    const resolve = this.pendingJobs.get(msg.data.prompt_id); ///will return the corresponding resolve fun of the prompt_id
                    resolve (msg.data);
                    this.pendingJobs.delete(msg.data.prompt_id);
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
            const response = await axios.post(
                `${this.COMFYUI_API_URL}/prompt`, 
                { prompt: workflow} , 
                {headers: {'Content-Type': 'application/json'}}
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






