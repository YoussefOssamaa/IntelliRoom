import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 6,
        select: false // عشان الباسورد ميرجعش في أي استعلام عادي بالغلط
    },
    role: {
        type: String,
        default: 'admin',
        enum: ['admin', 'superadmin']
    },
    failedLoginAttempts: {
        type: Number,
        default: 0,
        select: false // عشان مترجعش في الـ استعلامات العادية
    },
    firstFailedAttempt: {
        type: Date,
        select: false
    },
    lockUntil: {
        type: Date,
        select: false
    }
}, { timestamps: true });

// Middleware لتشفير الباسورد قبل الحفظ
adminSchema.pre('save', async function (next) {
    // لو الباسورد ماتعدلش، كمل عادي وماتعملش هاش تاني
    if (!this.isModified('password')) return next();

    // تشفير الباسورد
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// دالة عشان نقارن الباسورد اللي اليوزر دخله باللي متسجل في الداتا بيز
adminSchema.methods.comparePassword = async function (candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

adminSchema.methods.isLocked = function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
};

export default mongoose.model('Admin', adminSchema);