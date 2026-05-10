import mongoose from 'mongoose';

const adminRefreshTokenSchema = new mongoose.Schema({
    adminId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Admin', 
        required: true 
    },
    token: { 
        type: String, 
        required: true 
    },
    expiresAt: { 
        type: Date, 
        required: true 
    }
}, { timestamps: true });

// الميزة دي بتخلي MongoDB يمسح الـ Document لوحده لما الـ expiresAt ييجي
adminRefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('AdminRefreshToken', adminRefreshTokenSchema);