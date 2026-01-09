import express from 'express'
import Contact from '../../models/contactModels/contact.js';

export const contactController = async(req, res) => {
    
    const {name , email ,subject, message} = req.body;

    const new_contact = new Contact({name , email ,subject, message});
    new_contact.save();
    console.log(new_contact)

    res.status(201).json({ message: 'Message sent successfully', new_contact});



}





