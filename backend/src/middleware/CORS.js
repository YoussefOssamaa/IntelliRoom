
import cors from 'cors';
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://172.18.0.3:5173',
    'http://172.18.0.3:5174',
    'http://admin.localhost:5173',
    'http://admin.172.18.0.3:5173',
    'http://admin.172.18.0.3:5174'
  ],
    credentials: true
}
export const CORSMiddleware = cors(corsOptions)  