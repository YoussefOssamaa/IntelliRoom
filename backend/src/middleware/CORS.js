
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://172.18.0.3:5173',
    'http://172.18.0.3:5174',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://172.18.0.3:3000',
    'http://172.18.0.3:3001',
    'http://admin.localhost:5173',
    'http://admin.172.18.0.3:5173',
    'http://admin.172.18.0.3:5174',
    // Vercel deployment URL:
    // 'https://your-frontend-project.vercel.app',
    process.env.FRONTEND_URL
  ].filter(Boolean), // Removes undefined if FRONTEND_URL is not set
  credentials: true
}
export const CORSMiddleware = cors(corsOptions)  