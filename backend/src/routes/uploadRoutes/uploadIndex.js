import express from 'express';


const router = express.Router();



router.post('/' , postImageController);

export default router;