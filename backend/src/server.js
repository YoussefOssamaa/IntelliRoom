import express from 'express';
import dotenv from "dotenv";  //to import the variables declared in "/backend/.env" file 
dotenv.config(); // used here, only once to load the variables from .env file into process.env
import connectDB from "./config/db.js";




export const PORT = process.env.PORT || 5000;



const app = express();


await connectDB();

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
}
);


