import express from 'express';

export function buildComfyWorkflow_sketch(inputImageFilename, inputPrompt) {
        return {
  "128": {
    "inputs": {
      "seed": 450921362064296,
      "steps": 40,
      "cfg": 2,
      "sampler_name": "dpmpp_sde",
      "scheduler": "karras",
      "denoise": 1,
      "model": [
        "157",
        0
      ],
      "positive": [
        "203",
        0
      ],
      "negative": [
        "203",
        1
      ],
      "latent_image": [
        "133",
        0
      ]
    },
    "class_type": "KSampler",
    "_meta": {
      "title": "KSampler"
    }
  },
  "129": {
    "inputs": {
      "text":  inputPrompt,
      "clip": [
        "157",
        1
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Prompt)"
    }
  },
  "130": {
    "inputs": {
      "text": "",
      "clip": [
        "157",
        1
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Prompt)"
    }
  },
  "131": {
    "inputs": {
      "samples": [
        "128",
        0
      ],
      "vae": [
        "157",
        2
      ]
    },
    "class_type": "VAEDecode",
    "_meta": {
      "title": "VAE Decode"
    }
  },
  "132": {
    "inputs": {
      "filename_prefix": "Img",
      "images": [
        "131",
        0
      ]
    },
    "class_type": "SaveImage",
    "_meta": {
      "title": "Save Final Image"
    }
  },
  "133": {
    "inputs": {
      "width": [
        "143",
        0
      ],
      "height": [
        "143",
        1
      ],
      "batch_size": 1
    },
    "class_type": "EmptySD3LatentImage",
    "_meta": {
      "title": "EmptySD3LatentImage"
    }
  },
  "138": {
    "inputs": {
      "image": inputImageFilename
    },
    "class_type": "LoadImage",
    "_meta": {
      "title": "Load Image"
    }
  },
  "139": {
    "inputs": {
      "preprocessor": "M-LSDPreprocessor",
      "resolution": [
        "206",
        0
      ],
      "image": [
        "138",
        0
      ]
    },
    "class_type": "AIO_Preprocessor",
    "_meta": {
      "title": "AIO Aux Preprocessor"
    }
  },
  "143": {
    "inputs": {
      "megapixel": "1.0",
      "aspect_ratio": "1:1 (Perfect Square)",
      "divisible_by": "8",
      "custom_ratio": false,
      "custom_aspect_ratio": "1:1"
    },
    "class_type": "FluxResolutionNode",
    "_meta": {
      "title": "SDXL Resolution Calculator"
    }
  },
  "157": {
    "inputs": {
      "ckpt_name": "RealisticVisionV6.safetensors"
    },
    "class_type": "CheckpointLoaderSimple",
    "_meta": {
      "title": "Load Checkpoint"
    }
  },
  "197": {
    "inputs": {
      "switch_1": "On",
      "controlnet_1": "control_lora_rank128_v11p_sd15_mlsd_fp16.safetensors",
      "controlnet_strength_1": 0.85,
      "start_percent_1": 0,
      "end_percent_1": 1,
      "switch_2": "Off",
      "controlnet_2": "control_lora_rank128_v11p_sd15_lineart_fp16.safetensors",
      "controlnet_strength_2": 0.85,
      "start_percent_2": 0,
      "end_percent_2": 1,
      "switch_3": "Off",
      "controlnet_3": "control_lora_rank128_v11f1p_sd15_depth_fp16.safetensors",
      "controlnet_strength_3": 1,
      "start_percent_3": 0,
      "end_percent_3": 1,
      "image_1": [
        "139",
        0
      ],
      "image_2": [
        "199",
        0
      ],
      "image_3": [
        "200",
        0
      ]
    },
    "class_type": "CR Multi-ControlNet Stack",
    "_meta": {
      "title": "🕹️ CR Multi-ControlNet Stack"
    }
  },
  "199": {
    "inputs": {
      "preprocessor": "LineartStandardPreprocessor",
      "resolution": [
        "206",
        0
      ],
      "image": [
        "138",
        0
      ]
    },
    "class_type": "AIO_Preprocessor",
    "_meta": {
      "title": "AIO Aux Preprocessor"
    }
  },
  "200": {
    "inputs": {
      "preprocessor": "DepthAnythingV2Preprocessor",
      "resolution": [
        "206",
        0
      ],
      "image": [
        "138",
        0
      ]
    },
    "class_type": "AIO_Preprocessor",
    "_meta": {
      "title": "AIO Aux Preprocessor"
    }
  },
  "203": {
    "inputs": {
      "switch": "On",
      "base_positive": [
        "129",
        0
      ],
      "base_negative": [
        "130",
        0
      ],
      "controlnet_stack": [
        "197",
        0
      ]
    },
    "class_type": "CR Apply Multi-ControlNet",
    "_meta": {
      "title": "🕹️ CR Apply Multi-ControlNet"
    }
  },
  "205": {
    "inputs": {
      "upscale_method": "nearest-exact",
      "width": [
        "143",
        0
      ],
      "height": [
        "143",
        1
      ],
      "crop": "center",
      "image": [
        "138",
        0
      ]
    },
    "class_type": "ImageScale",
    "_meta": {
      "title": "Upscale Image"
    }
  },
  "206": {
    "inputs": {
      "text": "1000 x 1000",
      "anything": [
        "143",
        2
      ]
    },
    "class_type": "easy showAnything",
    "_meta": {
      "title": "Preview Resolution"
    }
  }
}
};


export const COMFYUI_OUTPUT_NODE_WF_SKETCH = "132";