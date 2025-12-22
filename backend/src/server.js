import express from 'express';
import dotenv from "dotenv";  //to import the variables declared in "/backend/.env" file 
dotenv.config(); // used here, only once to load the variables from .env file into process.env
import connectDB from "./config/db.js";
import ecommerceIndex from './routes/ecommerceRoutes/ecommerceIndex.js';
import design2DIndex from './routes/design2DRoutes/design2DIndex.js';
import uploadIndex from './routes/uploadRoutes/uploadIndex.js';
import { CORSMiddleware } from './middleware/CORS.js';
import {ComfyUIService} from './services/ComfyUIService.js';
import path from 'path';


const __dirname = path.resolve(); 

export const PORT = process.env.PORT || 5000;
const COMFYUI_HOST = process.env.COMFYUI_HOST || 'localhost:8188';


const app = express();

await connectDB();
app.use(express.json());
app.use(CORSMiddleware)
app.use('/uploads', express.static(path.join(__dirname, '../uploads'))); 
app.use('/comfyOutputs', express.static(path.join(__dirname, '../uploads/comfyOutputs'))); 

export const comfyUIServiceInstance = new ComfyUIService(COMFYUI_HOST);


app.use('/api/ecommerce', ecommerceIndex);
app.use('/api/design2D', design2DIndex);
app.use('/api/uploadImage', uploadIndex);


app.listen(PORT, () => {
console.log(`Server is running on http://localhost:${PORT}`);
});






export default app; 
