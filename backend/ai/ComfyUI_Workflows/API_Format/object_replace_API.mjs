import express from 'express';


export function buildComfyWorkflow_objectReplace(inputImageFilename, inputPrompt, replacementPrompt) {
  return {

    "2": {
      "inputs": {
        "model": "microsoft/Florence-2-base-ft",
        "precision": "fp16",
        "attention": "sdpa",
        "convert_to_safetensors": false
      },
      "class_type": "DownloadAndLoadFlorence2Model",
      "_meta": {
        "title": "DownloadAndLoadFlorence2Model"
      }
    },
    "3": {
      "inputs": {
        "text_input": replacementPrompt,
        "task": "caption_to_phrase_grounding",
        "fill_mask": false,
        "keep_model_loaded": true,
        "max_new_tokens": 1024,
        "num_beams": 3,
        "do_sample": true,
        "output_mask_select": "",
        "seed": 933125861833268,
        "image": [
          "16",
          0
        ],
        "florence2_model": [
          "2",
          0
        ]
      },
      "class_type": "Florence2Run",
      "_meta": {
        "title": "Florence2 Generate Mask"
      }
    },
    "5": {
      "inputs": {
        "ckpt_name": "RealisticVisionV6.safetensors"
      },
      "class_type": "CheckpointLoaderSimple",
      "_meta": {
        "title": "Load Checkpoint"
      }
    },
    "7": {
      "inputs": {
        "text": inputPrompt,
        "clip": [
          "5",
          1
        ]
      },
      "class_type": "CLIPTextEncode",
      "_meta": {
        "title": "Positive Prompt"
      }
    },
    "8": {
      "inputs": {
        "text": "text",
        "clip": [
          "5",
          1
        ]
      },
      "class_type": "CLIPTextEncode",
      "_meta": {
        "title": "Negative Prompt"
      }
    },
    "12": {
      "inputs": {
        "seed": 1026470722196595,
        "steps": 20,
        "cfg": 2.5,
        "sampler_name": "dpmpp_sde",
        "scheduler": "karras",
        "denoise": 1,
        "model": [
          "5",
          0
        ],
        "positive": [
          "37",
          0
        ],
        "negative": [
          "37",
          1
        ],
        "latent_image": [
          "55",
          0
        ]
      },
      "class_type": "KSampler",
      "_meta": {
        "title": "KSampler"
      }
    },
    "13": {
      "inputs": {
        "samples": [
          "12",
          0
        ],
        "vae": [
          "5",
          2
        ]
      },
      "class_type": "VAEDecode",
      "_meta": {
        "title": "VAE Decode"
      }
    },
    "16": {
      "inputs": {
        "upscale_method": "lanczos",
        "width": 512,
        "height": 512,
        "crop": "center",
        "image": [
          "30",
          0
        ]
      },
      "class_type": "ImageScale",
      "_meta": {
        "title": "Upscale Image"
      }
    },
    "18": {
      "inputs": {
        "keep_model_loaded": true,
        "individual_objects": false,
        "sam2_model": [
          "19",
          0
        ],
        "image": [
          "16",
          0
        ],
        "bboxes": [
          "20",
          1
        ]
      },
      "class_type": "Sam2Segmentation",
      "_meta": {
        "title": "Sam2Segmentation"
      }
    },
    "19": {
      "inputs": {
        "model": "sam2.1_hiera_base_plus.safetensors",
        "segmentor": "single_image",
        "device": "cuda",
        "precision": "fp16"
      },
      "class_type": "DownloadAndLoadSAM2Model",
      "_meta": {
        "title": "(Down)Load SAM2Model"
      }
    },
    "20": {
      "inputs": {
        "index": "0",
        "batch": false,
        "data": [
          "3",
          3
        ]
      },
      "class_type": "Florence2toCoordinates",
      "_meta": {
        "title": "Florence2 Coordinates"
      }
    },
    "23": {
      "inputs": {
        "mask": [
          "18",
          0
        ]
      },
      "class_type": "MaskPreview+",
      "_meta": {
        "title": "🔧 Mask Preview"
      }
    },
    "30": {
      "inputs": {
        "image": inputImageFilename
      },
      "class_type": "LoadImage",
      "_meta": {
        "title": "Load Image"
      }
    },
    "35": {
      "inputs": {
        "filename_prefix": "[OUTPUT]",
        "images": [
          "60",
          0
        ]
      },
      "class_type": "SaveImage",
      "_meta": {
        "title": "Output Image"
      }
    },
    "36": {
      "inputs": {
        "switch_1": "On",
        "controlnet_1": "control_lora_rank128_v11p_sd15_inpaint_fp16.safetensors",
        "controlnet_strength_1": 1,
        "start_percent_1": 0,
        "end_percent_1": 1,
        "switch_2": "On",
        "controlnet_2": "control_lora_rank128_v11p_sd15_canny_fp16.safetensors",
        "controlnet_strength_2": 0.7,
        "start_percent_2": 0,
        "end_percent_2": 1,
        "switch_3": "Off",
        "controlnet_3": "control_lora_rank128_v11p_sd15_seg_fp16.safetensors",
        "controlnet_strength_3": 1,
        "start_percent_3": 0,
        "end_percent_3": 1,
        "image_1": [
          "43",
          0
        ],
        "image_2": [
          "38",
          0
        ],
        "image_3": [
          "39",
          0
        ]
      },
      "class_type": "CR Multi-ControlNet Stack",
      "_meta": {
        "title": "🕹️ CR Multi-ControlNet Stack"
      }
    },
    "37": {
      "inputs": {
        "switch": "On",
        "base_positive": [
          "7",
          0
        ],
        "base_negative": [
          "8",
          0
        ],
        "controlnet_stack": [
          "36",
          0
        ]
      },
      "class_type": "CR Apply Multi-ControlNet",
      "_meta": {
        "title": "🕹️ CR Apply Multi-ControlNet"
      }
    },
    "38": {
      "inputs": {
        "preprocessor": "CannyEdgePreprocessor",
        "resolution": 512,
        "image": [
          "43",
          0
        ]
      },
      "class_type": "AIO_Preprocessor",
      "_meta": {
        "title": "ControlNet [2]"
      }
    },
    "39": {
      "inputs": {
        "preprocessor": "none",
        "resolution": 512,
        "image": [
          "62",
          1
        ]
      },
      "class_type": "AIO_Preprocessor",
      "_meta": {
        "title": "ControlNet [3]"
      }
    },
    "43": {
      "inputs": {
        "black_pixel_for_xinsir_cn": false,
        "image": [
          "62",
          1
        ],
        "mask": [
          "62",
          2
        ]
      },
      "class_type": "InpaintPreprocessor",
      "_meta": {
        "title": "Inpaint Preprocessor [1]"
      }
    },
    "49": {
      "inputs": {
        "filename_prefix": "[INPUT]",
        "images": [
          "16",
          0
        ]
      },
      "class_type": "SaveImage",
      "_meta": {
        "title": "Input Image Copy"
      }
    },
    "55": {
      "inputs": {
        "grow_mask_by": 0,
        "pixels": [
          "62",
          1
        ],
        "vae": [
          "5",
          2
        ],
        "mask": [
          "62",
          2
        ]
      },
      "class_type": "VAEEncodeForInpaint",
      "_meta": {
        "title": "VAE Encode (for Inpainting)"
      }
    },
    "60": {
      "inputs": {
        "stitcher": [
          "62",
          0
        ],
        "inpainted_image": [
          "13",
          0
        ]
      },
      "class_type": "InpaintStitchImproved",
      "_meta": {
        "title": "✂️ Inpaint Stitch"
      }
    },
    "62": {
      "inputs": {
        "downscale_algorithm": "bilinear",
        "upscale_algorithm": "bicubic",
        "preresize": false,
        "preresize_mode": "ensure minimum resolution",
        "preresize_min_width": 1024,
        "preresize_min_height": 1024,
        "preresize_max_width": 16384,
        "preresize_max_height": 16384,
        "mask_fill_holes": true,
        "mask_expand_pixels": 0,
        "mask_invert": false,
        "mask_blend_pixels": 0,
        "mask_hipass_filter": 0.1,
        "extend_for_outpainting": false,
        "extend_up_factor": 1,
        "extend_down_factor": 1,
        "extend_left_factor": 1,
        "extend_right_factor": 1,
        "context_from_mask_extend_factor": 1,
        "output_resize_to_target_size": true,
        "output_target_width": 512,
        "output_target_height": 512,
        "output_padding": "32",
        "device_mode": "gpu (much faster)",
        "image": [
          "16",
          0
        ],
        "mask": [
          "18",
          0
        ]
      },
      "class_type": "InpaintCropImproved",
      "_meta": {
        "title": "✂️ Inpaint Crop"
      }
    }
  }
};


export const COMFYUI_OUTPUT_NODE_WF_OBJECTREPLACE = "35";

