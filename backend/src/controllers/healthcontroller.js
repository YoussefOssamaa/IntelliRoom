import express from 'express';

const healthcontroller = express.Router();

healthcontroller.get('/', (req, res) => {
    res.status(200).send('Backend is working');
});

export default healthcontroller;
