
import cors from 'cors';
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174'
  ],
    credentials: true
}
export const CORSMiddleware = cors(corsOptions)  