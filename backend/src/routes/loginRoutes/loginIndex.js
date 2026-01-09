import express from 'express';
import { loginController } from '../../controllers/login/loginController.js';



const router = express.Router();


router.post('/' , loginController )


export default router;