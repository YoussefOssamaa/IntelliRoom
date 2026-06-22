import express from 'express';
import dotenv from "dotenv";  //to import the variables declared in "/backend/.env" file 
dotenv.config({ override: true }); // طلع عين امي عشان اعرف البج جاي منين فسيب الoverride true
import connectDB from "./config/db.js";
import ecommerceIndex from './routes/ecommerceRoutes/ecommerceIndex.js';
import loginIndex from './routes/loginRoutes/loginIndex.js';
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
import productRoutes from './routes/ecommerceRoutes/productRoutes.js';
import cartRouter from './routes/ecommerceRoutes/cartRoutes.js';
import shopperRoutes from './routes/ecommerceRoutes/shopperRoutes.js';
import wishlistRoutes from './routes/ecommerceRoutes/wishlistRoutes.js';
import design2D3Dndex from './routes/design2D-3DRoutes/design2D3DIndex.js'
import healthcontroller from './controllers/healthcontroller.js'
import adminRoutes from './routes/adminRoutes/adminIndex.js';
import adminDashboardRoutes from './routes/adminRoutes/dashboardIndex.js';
import subscribtionRoutes from './routes/subscribtionRoutes/subscribtionIndex.js';
import pricingPlansRoutes from './routes/pricingPlansRoutes/pricingPlansRoutes.js';
import planRoutes from './routes/planRoutes.js';
import ecommDashboardRoutes from './routes/ecommerceRoutes/dashboardRoute.js';
import ecommTrafficRoutes from './routes/ecommerceRoutes/trafficRoutes.js';
import ecommReviewRoutes from './routes/ecommerceRoutes/reviewRoutes.js';

import render3DIndex from './routes/render3DRoutes/render3DIndex.js'
import categoryRoutes from './routes/ecommerceRoutes/categoryRoutes.js';
import roomRoutes from './routes/ecommerceRoutes/roomRoutes.js'
import orderRoutes from './routes/ecommerceRoutes/orderRoutes.js';
import teamIndex from './routes/teamRoutes/teamIndex.js';


const __dirname = path.resolve();

export const API_PORT = process.env.PORT || process.env.API_PORT || 5000;
const COMFYUI_HOST = process.env.COMFYUI_HOST || 'localhost:8188';


const app = express();
app.set('trust proxy', 1);

await connectDB();
app.use(express.json());
app.use(CORSMiddleware)
app.use(cookieParser())
app.use('/uploads', express.static(path.join(__dirname, './uploads')));
app.use('/api/comfyOutputs', express.static(path.join(__dirname, './uploads/comfyOutputs')));
app.use('/api/team/photos', express.static(path.join(__dirname, './uploads/team')));
app.use('/workspace/furniture_images', express.static('/workspace/furniture_images'));


export const comfyUIServiceInstance = new ComfyUIService(COMFYUI_HOST);

app.use('/api/admin', adminRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/subscription', subscribtionRoutes);
app.use('/api/plans', planRoutes);

app.use('/api/ecommerce', ecommerceIndex);
app.use('/api/design2D3D', design2D3Dndex);
app.use('/api/uploadImage', uploadIndex);
app.use('/api/plugins', pluginIndex);
app.use('/api/auth', loginIndex)
app.use('/api/contact', contactIndex)
app.use('/api/dashboard', dashboardIndex);
//app.use('/api/pricingPlans' , pricingIndex )
app.use('/api/updateProfile', updateProfileIndex)
app.use('/api/community', communityIndex)
app.use('/api/generatedImage', generatedImageIndex)
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRouter);
app.use('/api/shopper', shopperRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/dashboard', dashboardIndex);
app.use('/api/ecomm/admin/dashboard', ecommDashboardRoutes); 
app.use('/api/ecomm/traffic', ecommTrafficRoutes);
app.use('/api/ecomm/reviews', ecommReviewRoutes);
app.use('/api/updateProfile', updateProfileIndex)
app.use('/api/community', communityIndex)
app.use('/api/generatedImage', generatedImageIndex)
app.use('/api/render3d', render3DIndex)
app.use('/api/team', teamIndex)

app.use('/health', healthcontroller)
app.use('/api/generatedImage', generatedImageIndex)
app.use('/api/categories', categoryRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/pricingPlans', pricingPlansRoutes);


app.use('/health', healthcontroller)




app.listen(API_PORT, () => {
    console.log(`Server is running on https://api.intelliroom.net`);
});




export default app; 
