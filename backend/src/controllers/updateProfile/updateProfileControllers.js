import express from 'express'
import User from '../../models/user.js'



export const putUpdateProfileController = async(req,res) =>{
    try {
        const {id} = req.params;
        const {firstName , lastName , user_name } = req.body
        const updatedUser = await User.findByIdAndUpdate(
            id,
            { firstName, lastName, user_name },
            { new: true, runValidators: true }
        );

                if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }


                res.status(200).json({
            message: "Profile updated successfully",
            data: updatedUser
        });


    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

