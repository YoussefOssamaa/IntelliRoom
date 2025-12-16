import express from 'express';
import multer from 'multer';

const router = express.Router();


export const postImageController = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        res.status(201).json({
            message: 'Image uploaded successfully',
        });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
