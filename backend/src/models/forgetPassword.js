import mongoose, { Schema, model } from 'mongoose'

const ForgetPasswordTokenSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    ForgetPasswordToken: {
        type: String,
        required: true,
    },
    
    expireTime: {
        type: Date,
        required: true
    },

    timestamp: { type: Date, default: Date.now }
});

const ForgetPassword = mongoose.model("ForgetPassword", ForgetPasswordTokenSchema);

export default ForgetPassword;
