import mongoose from 'mongoose';

const adminLogSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    action: {
        type: String,
        required: true,
        // أمثلة للعمليات اللي ممكن تتسجل
        enum: ['CHANGE_PLAN', 'SUSPEND_USER', 'RESUME_USER', 'DELETE_USER', 'ADD_ADMIN']
    },
    targetUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // الشخص اللي تم تطبيق الأكشن عليه
        default: null
    },
    details: {
        type: String, // تفاصيل إضافية زي "Changed plan from Free to Pro"
        default: ''
    }
}, { timestamps: true });

export default mongoose.model('AdminLog', adminLogSchema);