import express from 'express';
//import updateProfileRouter from './updateProfileRouter.js'
import communityRouter from './communityRouter.js'


const router = express.Router();



router.use('/posts' , communityRouter)





export default router;