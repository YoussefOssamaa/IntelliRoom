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
const upload_dir_main = path.join(__dirname, '../../../uploads/uploadedImages');    ///  /backend/uploads/uploadedImages
if (!fs.existsSync(upload_dir_main)) {
    fs.mkdirSync(upload_dir_main, { recursive: true });
}

const upload_dir_ref = path.join(__dirname, '../../../uploads/referenceImages');
if (!fs.existsSync(upload_dir_ref)) {
    fs.mkdirSync(upload_dir_ref, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.fieldname === 'referenceImage') {
            cb(null, upload_dir_ref);
        } else {
            cb(null, upload_dir_main);
        }
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const extensionFilter = (req, file, cb) => {

    const allowedExtensions = /jpeg|jpg|png|webp/;   // regex for allowed extensions
    const allowedMimeTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp'
    ];




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





router.post('/', protect, upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'referenceImage', maxCount: 1 }
]),
    postImageController);






export default router;