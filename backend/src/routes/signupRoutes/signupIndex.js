import express from 'express';
import { signUpController } from '../../controllers/signup/signupController.js';



const router = express.Router();


router.post('/' , signUpController )


export default router;