import express from 'express';
import dotenv from "dotenv";  //to import the variables declared in "/backend/.env" file 
dotenv.config(); // used here, only once to load the variables from .env file into process.env
import connectDB from "./config/db.js";
import ecommerceIndex from './routes/ecommerceRoutes/ecommerceIndex.js';
import design2DIndex from './routes/design2DRoutes/design2DIndex.js';
import { CORSMiddleware } from './middleware/CORS.js';


export const PORT = process.env.PORT || 5000;

const app = express();

await connectDB();
app.use(express.json());
app.use(CORSMiddleware)

app.use('/api/ecommerce', ecommerceIndex);
app.use ('/api/design2D', design2DIndex); 
app.use ('/api/uploadImage' , uploadIndex)


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
}
);


export default app; 