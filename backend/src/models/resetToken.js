import mongoose, { Schema, model } from 'mongoose'

const resetTokenSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    resetToken: {
        type: String,
        required: true,
    },
    
    expireTime: {
        type: Date,
        required: true
    },

    timestamp: { type: Date, default: Date.now }
});

const Reset = mongoose.model("Reset", resetTokenSchema);

export default Reset;
