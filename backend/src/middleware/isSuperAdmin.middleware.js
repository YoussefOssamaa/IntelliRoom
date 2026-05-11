
export const isSuperAdmin = (req, res, next) => {
    if (req.admin && req.admin.role === 'superadmin') {
        next();
    } else {
        return res.status(403).json({ 
            success: false, 
            message: 'Access denied. This action requires Super Admin privileges.' 
        });
    }
};