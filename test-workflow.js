// Test script to run workflow via IntelliRoom backend
import axios from 'axios';
import fs from 'fs';

const BACKEND_URL = 'http://localhost:5000';
const workflow = JSON.parse(fs.readFileSync('./Image Generation (4).json', 'utf8'));

async function testWorkflow() {
    console.log('Testing ComfyUI workflow via IntelliRoom backend...\n');
    
    // First, let's call the ComfyUIService directly via a test endpoint
    // We need to add a test route for this
    
    try {
        // For now, let's test by sending workflow directly to ComfyUI via the backend service
        const response = await axios.post(`${BACKEND_URL}/api/test-comfy`, {
            workflow: workflow
        }, {
            timeout: 120000  // 2 minute timeout for generation
        });
        
        console.log('Response:', response.data);
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testWorkflow();
