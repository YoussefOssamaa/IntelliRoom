import express from 'express';


export function buildComfyWorkflow_emptyRoom(inputImageFilename, inputPrompt) {
        return {

  "17": {
    "inputs": {
      "ckpt_name": "RealisticVisionV6.safetensors"
    },
    "class_type": "CheckpointLoaderSimple",
    "_meta": {
      "title": "Load Checkpoint"
    }
  },
  "18": {
    "inputs": {
      "image": inputImageFilename
    },
    "class_type": "LoadImage",
    "_meta": {
      "title": "Load Image"
    }
  },
  "19": {
    "inputs": {
      "upscale_method": "lanczos",
      "width": 512,
      "height": 512,
      "crop": "center",
      "image": [
        "18",
        0
      ]
    },
    "class_type": "ImageScale",
    "_meta": {
      "title": "Upscale Image"
    }
  },
  "21": {
    "inputs": {
      "preprocessor": "M-LSDPreprocessor",
      "resolution": 512,
      "image": [
        "19",
        0
      ]
    },
    "class_type": "AIO_Preprocessor",
    "_meta": {
      "title": "ControlNet [2]"
    }
  },
  "22": {
    "inputs": {
      "preprocessor": "none",
      "resolution": 512,
      "image": [
        "19",
        0
      ]
    },
    "class_type": "AIO_Preprocessor",
    "_meta": {
      "title": "ControlNet [3]"
    }
  },
  "23": {
    "inputs": {
      "switch_1": "Off",
      "controlnet_1": "control_lora_rank128_v11p_sd15_canny_fp16.safetensors",
      "controlnet_strength_1": 1,
      "start_percent_1": 0,
      "end_percent_1": 1,
      "switch_2": "On",
      "controlnet_2": "control_lora_rank128_v11p_sd15_mlsd_fp16.safetensors",
      "controlnet_strength_2": 0.4,
      "start_percent_2": 0,
      "end_percent_2": 1,
      "switch_3": "Off",
      "controlnet_3": "control_lora_rank128_v11p_sd15_seg_fp16.safetensors",
      "controlnet_strength_3": 1,
      "start_percent_3": 0,
      "end_percent_3": 1,
      "image_1": [
        "30",
        0
      ],
      "image_2": [
        "21",
        0
      ],
      "image_3": [
        "22",
        0
      ]
    },
    "class_type": "CR Multi-ControlNet Stack",
    "_meta": {
      "title": "🕹️ CR Multi-ControlNet Stack"
    }
  },
  "24": {
    "inputs": {
      "switch": "On",
      "base_positive": [
        "25",
        0
      ],
      "base_negative": [
        "26",
        0
      ],
      "controlnet_stack": [
        "23",
        0
      ]
    },
    "class_type": "CR Apply Multi-ControlNet",
    "_meta": {
      "title": "🕹️ CR Apply Multi-ControlNet"
    }
  },
  "25": {
    "inputs": {
      "text": inputPrompt,
      "clip": [
        "17",
        1
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "Positive Prompt"
    }
  },
  "26": {
    "inputs": {
      "text": "text",
      "clip": [
        "17",
        1
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "Negative Prompt"
    }
  },
  "27": {
    "inputs": {
      "seed": 298352861522767,
      "steps": 12,
      "cfg": 2,
      "sampler_name": "dpmpp_sde",
      "scheduler": "karras",
      "denoise": 0.86,
      "model": [
        "17",
        0
      ],
      "positive": [
        "24",
        0
      ],
      "negative": [
        "24",
        1
      ],
      "latent_image": [
        "33",
        0
      ]
    },
    "class_type": "KSampler",
    "_meta": {
      "title": "KSampler"
    }
  },
  "28": {
    "inputs": {
      "samples": [
        "27",
        0
      ],
      "vae": [
        "17",
        2
      ]
    },
    "class_type": "VAEDecode",
    "_meta": {
      "title": "VAE Decode"
    }
  },
  "30": {
    "inputs": {
      "preprocessor": "CannyEdgePreprocessor",
      "resolution": 512,
      "image": [
        "19",
        0
      ]
    },
    "class_type": "AIO_Preprocessor",
    "_meta": {
      "title": "ControlNet [1]"
    }
  },
  "33": {
    "inputs": {
      "pixels": [
        "19",
        0
      ],
      "vae": [
        "17",
        2
      ]
    },
    "class_type": "VAEEncode",
    "_meta": {
      "title": "VAE Encode"
    }
  },
  "35": {
    "inputs": {
      "filename_prefix": "ComfyUI",
      "images": [
        "28",
        0
      ]
    },
    "class_type": "SaveImage",
    "_meta": {
      "title": "Save Image"
    }
  }
}

}

export const COMFYUI_OUTPUT_NODE_WF_EMPTYROOM = "35";