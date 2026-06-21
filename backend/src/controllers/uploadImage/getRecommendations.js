import express from 'express';
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';

const testimage = process.cwd() + '/uploads/comfyOutputs/test.png';  
console.log('Test image path:', testimage);
export const getRecommendations = async (localFileName , topk = 10) => {
  try{
    localFileName = testimage
            let recommendations = [];

            const form = new FormData();
            form.append('file', fs.createReadStream(localFileName));

            console.log("SENDING FILE TO RECOMMENDATION SERVICEEEE:", localFileName);
            const response = await axios.post('https://mohamedsameh77i-intellivdb.hf.space/search?top_k=5&threshold=0.5', form, {
                headers: {
                    ...form.getHeaders()
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            });
            console.log("return from rec   req:", localFileName);


            recommendations = response.data.detections || [];
            console.log('Received recommendationsssssss:', recommendations);

            const formattedRecommendations =  recommendations.flatMap(detection => 
              detection.similar_products.map(item => ({
                  label: detection.label,
                  confidence: detection.confidence,
                  box: detection.box,
                  rank: item.rank,
                  filename: item.filename,
                  name: item.name,
                  similarity: item.similarity,
                  image_url: item.image_url
              }))
          );
            
          console.log("THIS IS THE FORMATTED RECOMMENDATIONS ARRAY", formattedRecommendations)
          return formattedRecommendations;

            }catch (error) {
                console.error("Error fetching recommendations:", error);
                return [];
            }


}






/*
{
  "detections": [
    {
      "label": "chair",
      "confidence": 0.937,
      "box": [
        262.11,
        1872.72,
        1516.94,
        2918.53
      ],
      "similar_products": [
        {
          "rank": 1,
          "filename": "img1080.png",
          "name": "Verde Lounge Chair",
          "similarity": 0.766,
          "image_url": "https://huggingface.co/datasets/MohamedSameh77i/Furniture_Synthetic_Dataset/resolve/main/img1080.png"
        },
        {
          "rank": 2,
          "filename": "img0439.png",
          "name": "Azure Comfort Lounge",
          "similarity": 0.732,
          "image_url": "https://huggingface.co/datasets/MohamedSameh77i/Furniture_Synthetic_Dataset/resolve/main/img0439.png"
        },
        {
          "rank": 3,
          "filename": "img0384.png",
          "name": "Verde Lounge Chair",
          "similarity": 0.729,
          "image_url": "https://huggingface.co/datasets/MohamedSameh77i/Furniture_Synthetic_Dataset/resolve/main/img0384.png"
        },
        {
          "rank": 4,
          "filename": "img0469.png",
          "name": "Emerald Lounge Chair",
          "similarity": 0.724,
          "image_url": "https://huggingface.co/datasets/MohamedSameh77i/Furniture_Synthetic_Dataset/resolve/main/img0469.png"
        },
        {
          "rank": 5,
          "filename": "img0392.png",
          "name": "Sage Lounge Chair",
          "similarity": 0.723,
          "image_url": "https://huggingface.co/datasets/MohamedSameh77i/Furniture_Synthetic_Dataset/resolve/main/img0392.png"
        }
      ]
    },
    {
      "label": "couch",
      "confidence": 0.903,
      "box": [
        1579.01,
        1706.21,
        4947.62,
        2703.29
      ],
      "similar_products": [
        {
          "rank": 1,
          "filename": "img0512.png",
          "name": "Sunny Two-Seater",
          "similarity": 0.745,
          "image_url": "https://huggingface.co/datasets/MohamedSameh77i/Furniture_Synthetic_Dataset/resolve/main/img0512.png"
        },
        {
          "rank": 2,
          "filename": "img0344.png",
          "name": "Warm Earth Sofa",
          "similarity": 0.735,
          "image_url": "https://huggingface.co/datasets/MohamedSameh77i/Furniture_Synthetic_Dataset/resolve/main/img0344.png"
        },
        {
          "rank": 3,
          "filename": "img1150.png",
          "name": "Serene Two-Seater",
          "similarity": 0.735,
          "image_url": "https://huggingface.co/datasets/MohamedSameh77i/Furniture_Synthetic_Dataset/resolve/main/img1150.png"
        },
        {
          "rank": 4,
          "filename": "img0197.png",
          "name": "Calm Haven Sofa",
          "similarity": 0.729,
          "image_url": "https://huggingface.co/datasets/MohamedSameh77i/Furniture_Synthetic_Dataset/resolve/main/img0197.png"
        },
        {
          "rank": 5,
          "filename": "img0311.png",
          "name": "Terra Sofa",
          "similarity": 0.727,
          "image_url": "https://huggingface.co/datasets/MohamedSameh77i/Furniture_Synthetic_Dataset/resolve/main/img0311.png"
        }
      ]
    }
  ],
  "total_detections": 2
}

*/