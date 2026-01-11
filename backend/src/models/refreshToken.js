import mongoose, { Schema, model } from 'mongoose'

const refreshTokenSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    refreshToken: {
        type: String,
        required: true,
    },
    
    expireTime: {
        type: Date,
        required: true
    },

    timestamp: { type: Date, default: Date.now }
});

const Refresh = mongoose.model("Refresh", refreshTokenSchema);

export default Refresh;
