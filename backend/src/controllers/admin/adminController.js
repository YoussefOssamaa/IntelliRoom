import { adminAuthPublicKey , adminAuthPrivateKey , adminRefreshPrivateKey , adminRefreshPublicKey } from "../../utils/getKeys.js";
import jwt from 'jsonwebtoken';
import Admin from '../../models/admin/admin.js';
import AdminRefreshToken from '../../models/admin/adminRefreshToken.js';
import AdminLog from '../../models/admin/adminLog.js';

export const logAdminAction = async (adminId, action, targetUserId = null, details = "") => {
    try {
        await AdminLog.create({
            adminId,
            action,
            targetUserId,
            details
        });
    } catch (error) {
        console.error("Failed to log admin action:", error.message);
    }
};

export const getAdminLogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const logs = await AdminLog.find({})
            .populate('adminId', 'name email role')
            .populate('targetUserId', 'firstName lastName email')
            .sort({ createdAt: -1 }) // الأحدث أولاً
            .skip(skip)
            .limit(limit)
            .lean();

        const totalLogs = await AdminLog.countDocuments({});

        res.status(200).json({
            success: true,
            data: logs,
            pagination: {
                total: totalLogs,
                page,
                pages: Math.ceil(totalLogs / limit),
                limit
            }
        });
    } catch (error) {
        console.error("Error in getAdminLogs:", error.message);
        res.status(500).json({ success: false, message: 'Server error while fetching logs' });
    }
};

export const signIn = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        // بنجيب الأدمن وبنطلب الحقول المخفية اللي محتاجينها للحسابات
        const admin = await Admin.findOne({ email }).select('+password +failedLoginAttempts +lockUntil +firstFailedAttempt');
        
        if (!admin) {
            return res.status(401).json({ message: 'Incorrect email or password' });
        }

        // 1. هل الحساب مقفول حالياً؟
        if (admin.isLocked()) {
            const remainingTime = Math.ceil((admin.lockUntil - Date.now()) / 1000 / 60);
            return res.status(403).json({ 
                success: false, 
                message: `Account is temporarily locked. Please try again after ${remainingTime} minutes.` 
            });
        }

        // 2. مقارنة الباسورد
        const isMatch = await admin.comparePassword(password, admin.password);

        if (!isMatch) {
            // -- حالة الباسورد غلط --
            const NOW = Date.now();
            const TWENTY_MINS = 20 * 60 * 1000;
            const ONE_HOUR = 60 * 60 * 1000;

            if (!admin.firstFailedAttempt || (NOW - new Date(admin.firstFailedAttempt).getTime() > TWENTY_MINS)) {
                admin.firstFailedAttempt = NOW;
                admin.failedLoginAttempts = 1;
            } else {
                admin.failedLoginAttempts += 1;
            }

            if (admin.failedLoginAttempts >= 3) {
                admin.lockUntil = NOW + ONE_HOUR; // اقفل الحساب لمدة ساعة
                admin.failedLoginAttempts = 0;    // صفر العداد للمرات الجاية
                admin.firstFailedAttempt = undefined;
                await admin.save();
                
                return res.status(403).json({ 
                    success: false, 
                    message: 'Account locked for 1 hour due to 3 consecutive failed login attempts.' 
                });
            }

            await admin.save();
            return res.status(401).json({ success: false, message: 'Incorrect email or password' });
        }

        admin.failedLoginAttempts = 0;
        admin.lockUntil = undefined;
        admin.firstFailedAttempt = undefined;
        await admin.save();

        const token = jwt.sign(
            { userId: admin._id, role: admin.role }, 
            adminPrivateKey, 
            { algorithm: 'RS256', expiresIn: '1d' }
        );

        const accessToken = jwt.sign(
            { userId: admin._id, role: admin.role }, 
            adminAuthPrivateKey, 
            { algorithm: 'RS256', expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
            { userId: admin._id }, 
            adminRefreshPrivateKey, 
            { algorithm: 'RS256', expiresIn: '7d' }
        );

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // هيخلص بعد 7 أيام

        await AdminRefreshToken.create({
            adminId: admin._id,
            token: refreshToken,
            expiresAt
        });

        res.cookie('Authentication', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000 // 15 دقيقة
        });

        res.cookie('Refresh', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/api/admin/refresh', 
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 أيام
        });

        res.status(200).json({ success: true, message: 'Admin signed in' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

export const Refresh = async (req, res) => {
    try {
        const refreshToken = req.cookies?.Refresh;
        
        if (!refreshToken) {
            return res.status(401).json({ success: false, message: 'No refresh token provided' });
        }

        let payload;

        try {
            payload = jwt.verify(refreshToken, adminRefreshPublicKey, { algorithms: ["RS256"] });
        } catch (err) {
            return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
        }

        const existingToken = await AdminRefreshToken.findOne({ 
            token: refreshToken, 
            adminId: payload.userId 
        });

        if (!existingToken) {
            res.clearCookie('Authentication');
            res.clearCookie('Refresh');
            return res.status(401).json({ success: false, message: 'Refresh token revoked or not found' });
        }

        const newAccessToken = jwt.sign(
            { userId: payload.userId, role: 'admin' }, 
            adminAuthPrivateKey, 
            { algorithm: 'RS256', expiresIn: '15m' }
        );

        res.cookie('Authentication', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000 // 15 دقيقة
        });

        res.status(200).json({ success: true, message: 'Token refreshed successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error during token refresh' });
    }
}

export const logout = async (req, res) => {
    try {
        const refreshToken = req.cookies?.Refresh;
        
        if (refreshToken) {
            await AdminRefreshToken.deleteOne({ token: refreshToken });
        }

        res.clearCookie('Authentication');
        res.clearCookie('Refresh', { path: '/api/admin/refresh' }); // لازم تحدد الـ path طالما كنت محدده وأنت بتعملها

        res.status(200).json({ success: true, message: 'Admin logged out successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error during logout' });
    }
}

export const getMe = (req, res) => {

    res.status(200).json({ 
        success: true, 
        data: {
            id: req.admin._id,
            name: req.admin.name,
            email: req.admin.email,
            role: req.admin.role
        }
    });
}

export const addAdmin = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: "Please provide all required fields (name, email, password)" 
            });
        }

        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({ 
                success: false, 
                message: "Email is already registered" 
            });
        }

        const newAdmin = await Admin.create({
            name,
            email,
            password,
            role: role || 'admin' 
        });

        res.status(201).json({
            success: true,
            message: "Admin account created successfully",
            data: {
                id: newAdmin._id,
                name: newAdmin.name,
                email: newAdmin.email,
                role: newAdmin.role
            }
        });

    } catch (error) {
        console.error("Error in addAdmin:", error.message);
        res.status(500).json({ 
            success: false, 
            message: "Server error while creating admin" 
        });
    }
};

export const getAllAdmins = async (req, res) => {
    try {

        const admins = await Admin.find({});
        
        res.status(200).json({ 
            success: true, 
            count: admins.length,
            data: admins 
        });
    } catch (error) {
        console.error("Error in getAllAdmins:", error.message);
        res.status(500).json({ success: false, message: 'Server error while fetching admins' });
    }
};

export const unlockAdmin = async (req, res) => {
    try {
        const { id } = req.params;


        const admin = await Admin.findById(id).select('+failedLoginAttempts +lockUntil +firstFailedAttempt');

        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }

        if (!admin.isLocked() && admin.failedLoginAttempts === 0) {
            return res.status(400).json({ success: false, message: 'This account is already active and not locked' });
        }

        admin.failedLoginAttempts = 0;
        admin.lockUntil = undefined;
        admin.firstFailedAttempt = undefined;

        await admin.save();

        res.status(200).json({ 
            success: true, 
            message: `Account for ${admin.name} has been successfully unlocked.` 
        });
    } catch (error) {
        console.error("Error in unlockAdmin:", error.message);
        res.status(500).json({ success: false, message: 'Server error while unlocking admin' });
    }
};