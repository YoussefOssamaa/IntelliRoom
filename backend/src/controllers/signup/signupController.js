import express from 'express'
import User from '../../models/user.js';


export const signUpController = async (req,res) => {

    try {
        const {user_name ,email , password , firstName, lastName } = req.body;

        const new_user = new User({ user_name, email , password , firstName, lastName });
        await new_user.save();

        console.log ("account created successfully")

        res.status(200).json({ message: "Welcome To IntelliRoom" });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });

    }

} 

