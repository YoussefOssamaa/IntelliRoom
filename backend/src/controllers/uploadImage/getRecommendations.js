import express from 'express';
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';

const testimage = process.cwd() + '/uploads/comfyOutputs/test.png';  
console.log('Test image path:', testimage);
export const getRecommendations = async (localFileName , topk = 10) => {
    localFileName = testimage
            let recommendations = [];

            const form = new FormData();
            form.append('file', fs.createReadStream(localFileName));

            const response = await axios.post('https://mohamedsameh77i-intellivdb.hf.space/search?top_k=10', form, {
                headers: {
                    ...form.getHeaders()
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            });

            recommendations = response.data.results || [];

            return recommendations.map(item => ({
                rank: item.rank,
                filename: item.filename,
                name: item.name,
                similarity: item.similarity,
                image_url: item.image_url
            }));

            


}






/*
{
  "results": [
    {
      "rank": 1,
      "filename": "img1080.png",
      "name": "Verde Lounge Chair",
      "similarity": 0.603,
      "image_url": "https://huggingface.co/datasets/MohamedSameh77i/Furniture_Synthetic_Dataset/resolve/main/img1080.png"
    },
    {
      "rank": 2,
      "filename": "img0870.png",
      "name": "Glass Ribbed Cabinet",
      "similarity": 0.582,
      "image_url": "https://huggingface.co/datasets/MohamedSameh77i/Furniture_Synthetic_Dataset/resolve/main/img0870.png"
    },
    {
      "rank": 3,
      "filename": "img0600.png",
      "name": "Velvet Elegance Chaise",
      "similarity": 0.579,
      "image_url": "https://huggingface.co/datasets/MohamedSameh77i/Furniture_Synthetic_Dataset/resolve/main/img0600.png"
    },
    {
      "rank": 4,
      "filename": "img0439.png",
      "name": "Azure Comfort Lounge",
      "similarity": 0.57,
      "image_url": "https://huggingface.co/datasets/MohamedSameh77i/Furniture_Synthetic_Dataset/resolve/main/img0439.png"
    },
    {
      "rank": 5,
      "filename": "img0855.png",
      "name": "Velvet Lounge Chair",
      "similarity": 0.569,
      "image_url": "https://huggingface.co/datasets/MohamedSameh77i/Furniture_Synthetic_Dataset/resolve/main/img0855.png"
    }
  ],
  "count": 5
}



*/