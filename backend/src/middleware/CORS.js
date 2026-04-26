
import cors from 'cors';
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://admin.localhost:5173'
  ],
    credentials: true
}
export const CORSMiddleware = cors(corsOptions)  