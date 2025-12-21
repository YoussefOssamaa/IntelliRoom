import axios from 'axios'

const API_URL = '/api'

// Build workflow with user inputs
function buildWorkflow(prompt, negativePrompt, width = 512, height = 512) {
  return {
    "3": {
      "inputs": {
        "seed": Math.floor(Math.random() * 999999999999999),
        "steps": 8,
        "cfg": 2,
        "sampler_name": "dpmpp_sde",
        "scheduler": "karras",
        "denoise": 1,
        "model": ["4", 0],
        "positive": ["6", 0],
        "negative": ["7", 0],
        "latent_image": ["5", 0]
      },
      "class_type": "KSampler",
      "_meta": { "title": "KSampler" }
    },
    "4": {
      "inputs": { "ckpt_name": "RealisticVisionV6.safetensors" },
      "class_type": "CheckpointLoaderSimple",
      "_meta": { "title": "Load Checkpoint" }
    },
    "5": {
      "inputs": { "width": width, "height": height, "batch_size": 1 },
      "class_type": "EmptyLatentImage",
      "_meta": { "title": "Empty Latent Image" }
    },
    "6": {
      "inputs": {
        "text": prompt,
        "clip": ["4", 1]
      },
      "class_type": "CLIPTextEncode",
      "_meta": { "title": "CLIP Text Encode (Prompt)" }
    },
    "7": {
      "inputs": {
        "text": negativePrompt,
        "clip": ["4", 1]
      },
      "class_type": "CLIPTextEncode",
      "_meta": { "title": "CLIP Text Encode (Prompt)" }
    },
    "8": {
      "inputs": {
        "samples": ["3", 0],
        "vae": ["4", 2]
      },
      "class_type": "VAEDecode",
      "_meta": { "title": "VAE Decode" }
    },
    "9": {
      "inputs": {
        "filename_prefix": "ComfyUI",
        "images": ["8", 0]
      },
      "class_type": "SaveImage",
      "_meta": { "title": "Save Image" }
    }
  }
}

// Generate image
export async function generateImage(prompt, negativePrompt, options = {}) {
  const { width = 512, height = 512 } = options
  
  const workflow = buildWorkflow(prompt, negativePrompt, width, height)
  
  const response = await axios.post(`${API_URL}/test-comfy`, { workflow })
  
  if (!response.data.success) {
    throw new Error('Workflow execution failed')
  }
  
  return response.data.result.prompt_id
}

// Get history for a prompt
export async function getHistory(promptId) {
  const response = await axios.get(`${API_URL}/comfy-history/${promptId}`)
  return response.data
}

// Get image URL
export function getImageUrl(filename) {
  return `${API_URL}/comfy-image?filename=${encodeURIComponent(filename)}`
}

// Upload image to server
export async function uploadImage(file) {
  const formData = new FormData()
  formData.append('image', file)
  
  const response = await axios.post(`${API_URL}/uploadImage`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  
  return response.data
}

export default {
  generateImage,
  getHistory,
  getImageUrl,
  uploadImage
}
