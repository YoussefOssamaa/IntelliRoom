import express from "express";
import User from "../../models/user.js";
import * as z from "zod";

// دالة التنضيف زي اللي عندكم في الـ login
const sanitize = (str) => str.replace(/<\/?[^>]+(>|$)/g, "");

// عملنا Schema للـ Update
const updateProfileSchema = z.object({
  firstName: z
    .string()
    .transform(sanitize).optional(),
  lastName: z
    .string()
    .transform(sanitize).optional(),
  user_name: z
    .string()
  .transform(sanitize).optional(),
});

export const putUpdateProfileController = async (req, res) => {
  try {
    // console.log("badr")
    const id = req.userId;
    const validation = updateProfileSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: validation.error.errors[0].message,
      });
    }

    const { firstName, lastName, user_name } = validation.data;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { firstName, lastName, user_name },
      { new: true, runValidators: true },
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteUpdateProfileController = async (req, res) => {
  try {
    const id = req.userId
    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Profile deleted successfully",
      data: deletedUser,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
