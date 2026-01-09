import express from 'express'
import User from '../../models/user.js';


export const loginController = async (req,res) => {

    try {
        const {email , password} = req.body;

        const logging_user = await User.findOne({email , password});
        if (!logging_user) {
            return res.status(404).json({ message: "User not found" });
        }
        console.log ("logged in successfully")

        res.status(200).json({ message: "logged in successfully" });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });

    }

}

