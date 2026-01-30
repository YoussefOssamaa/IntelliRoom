import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { postImageController } from '../../controllers/uploadImage/uploadImageController.js';
import protect from '../../middleware/protect.middleware.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const upload_dir = path.join(__dirname, '../../../uploads/uploadedImages');
if (!fs.existsSync(upload_dir)) {
  fs.mkdirSync(upload_dir, { recursive: true });
}


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, upload_dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const extensionFilter = (req, file, cb) => {
      const allowedExtensions = /jpeg|jpg|png/; // regex for allowed extensions
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      const extension = allowedExtensions.test(file.originalname.toLowerCase());
      const mimetype = allowedMimeTypes.includes(file.mimetype);
      
    if (extension && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, JPG, and PNG are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
    fileFilter: extensionFilter
});





router.post('/',protect ,  upload.single('image'), postImageController);







export default router;