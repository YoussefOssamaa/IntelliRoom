import express from 'express';
import dotenv from "dotenv";  //to import the variables declared in "/backend/.env" file 
dotenv.config(); // used here, only once to load the variables from .env file into process.env
import connectDB from "./config/db.js";
import ecommerceIndex from './routes/ecommerceRoutes/ecommerceIndex.js';
import design2DIndex from './routes/design2DRoutes/design2DIndex.js';
import loginIndex from './routes/loginRoutes/loginIndex.js';
import signupIndex from './routes/signupRoutes/signupIndex.js';
import contactIndex from './routes/contactRoutes/contactIndex.js'
import uploadIndex from './routes/uploadRoutes/uploadIndex.js';
import pluginIndex from './routes/pluginRoutes/pluginIndex.js'
import { CORSMiddleware } from './middleware/CORS.js';
import { ComfyUIService } from './services/ComfyUIService.js';
import path from 'path';
import cookieParser from 'cookie-parser'
import dashboardIndex from './routes/dashboard/dashboardIndex.js';
import updateProfileIndex from './routes/updateProfileRoutes/updateProfileIndex.js'
import communityIndex from './routes/community/communityIndex.js'
import generatedImageIndex from './routes/generatedImageRoutes/generatedImageIndex.js'


const __dirname = path.resolve();

export const PORT = process.env.PORT || 5000;
const COMFYUI_HOST = process.env.COMFYUI_HOST || 'localhost:8188';


const app = express();

await connectDB();
app.use(express.json());
app.use(CORSMiddleware)
app.use(cookieParser())
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api/comfyOutputs', express.static(path.join(__dirname, '../uploads/comfyOutputs')));


export const comfyUIServiceInstance = new ComfyUIService(COMFYUI_HOST);


app.use('/api/ecommerce', ecommerceIndex);
app.use('/api/design2D', design2DIndex);
app.use('/api/uploadImage', uploadIndex);
app.use('/api/plugins', pluginIndex);
app.use('/api/auth', loginIndex)
app.use('/api/signup', signupIndex)
app.use('/api/contact', contactIndex)
app.use('/api/dashboard', dashboardIndex); 
//app.use('/api/pricingPlans' , pricingIndex )
app.use('/api/updateProfile' , updateProfileIndex)
app.use('/api/community' , communityIndex)
app.use('/api/generatedImage' , generatedImageIndex)



app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});






export default app; 
