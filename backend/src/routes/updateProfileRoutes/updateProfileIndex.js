import express from 'express';
import updateProfileRouter from './updateProfileRouter.js'


// import wishlistRoutes from './wishlistRoutes.js';

const router = express.Router();



router.use('/' , updateProfileRouter)





export default router;