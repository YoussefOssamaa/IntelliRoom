import express from 'express';

export function buildComfyWorkflow_ultimateUpScale(inputImageFilename, inputPrompt) {
        return {

  "1": {
    "inputs": {
      "upscale_by": 2,
      "seed": 920010497137778,
      "steps": 20,
      "cfg": 8,
      "sampler_name": "dpmpp_sde",
      "scheduler": "karras",
      "denoise": 0.37,
      "mode_type": "Linear",
      "tile_width": 512,
      "tile_height": 512,
      "mask_blur": 8,
      "tile_padding": 32,
      "seam_fix_mode": "None",
      "seam_fix_denoise": 1,
      "seam_fix_width": 64,
      "seam_fix_mask_blur": 8,
      "seam_fix_padding": 16,
      "force_uniform_tiles": true,
      "tiled_decode": false,
      "image": [
        "6",
        0
      ],
      "model": [
        "7",
        0
      ],
      "positive": [
        "16:1",
        0
      ],
      "negative": [
        "16:1",
        1
      ],
      "vae": [
        "7",
        2
      ],
      "upscale_model": [
        "2",
        0
      ]
    },
    "class_type": "UltimateSDUpscale",
    "_meta": {
      "title": "Ultimate SD Upscale"
    }
  },
  "2": {
    "inputs": {
      "model_name": "4x_foolhardy_Remacri.pth"
    },
    "class_type": "UpscaleModelLoader",
    "_meta": {
      "title": "Load Upscale Model"
    }
  },
  "4": {
    "inputs": {
      "filename_prefix": "ComfyUI",
      "images": [
        "1",
        0
      ]
    },
    "class_type": "SaveImage",
    "_meta": {
      "title": "Save Image"
    }
  },
  "6": {
    "inputs": {
      "image": inputImageFilename
    },
    "class_type": "LoadImage",
    "_meta": {
      "title": "Load Image"
    }
  },
  "7": {
    "inputs": {
      "ckpt_name": "RealVisXL.safetensors"
    },
    "class_type": "CheckpointLoaderSimple",
    "_meta": {
      "title": "Load Checkpoint"
    }
  },
  "8": {
    "inputs": {
      "text": inputPrompt,
      "clip": [
        "7",
        1
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Positive Prompt)"
    }
  },
  "10": {
    "inputs": {
      "text": " text",
      "clip": [
        "7",
        1
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Negative Prompt)"
    }
  },
  "16:0": {
    "inputs": {
      "control_net_name": "controlnet-union-sdxl-1.0.safetensors"
    },
    "class_type": "ControlNetLoader",
    "_meta": {
      "title": "Load ControlNet Model"
    }
  },
  "16:1": {
    "inputs": {
      "strength": 1,
      "start_percent": 0,
      "end_percent": 1,
      "positive": [
        "8",
        0
      ],
      "negative": [
        "10",
        0
      ],
      "control_net": [
        "16:0",
        0
      ],
      "image": [
        "6",
        0
      ],
      "vae": [
        "7",
        2
      ]
    },
    "class_type": "ControlNetApplyAdvanced",
    "_meta": {
      "title": "Apply ControlNet"
    }
  }
}
}
export const COMFYUI_OUTPUT_NODE_WF_ULTIMATEUPSCALE = "4";

