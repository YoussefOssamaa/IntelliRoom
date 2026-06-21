import React , { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios'; // هنستخدم axios العادي عشان نتجنب الـ Interceptors في الـ Refresh

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        const storedIsLoggedIn = localStorage.getItem("isLoggedIn");

        if (storedUser && storedIsLoggedIn === "true") {
            setUser(JSON.parse(storedUser));
            setIsLoggedIn(true);
        }
        setLoading(false);
    }, []);

    const formatUser = (backendUserData) => {
        return {
            _id: backendUserData._id,
            email: backendUserData.email,
            firstName: backendUserData.firstName,
            name: backendUserData.firstName && backendUserData.lastName 
            ? `${backendUserData.firstName} ${backendUserData.lastName}` 
            : backendUserData.user_name,
            lastName: backendUserData.lastName,
            user_name: backendUserData.user_name,
            plan: backendUserData.plan,
            credits: backendUserData.credits
        }
    }   

    const login = (backendUserData) => {
        const formattedUser = formatUser(backendUserData);
        setIsLoggedIn(true);
        setUser(formattedUser);

        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("user", JSON.stringify(formattedUser));
    }

    const logout = () => {
        setIsLoggedIn(false);
        setUser(null);
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("user");
    }
    
    const updateUserLocalState = (updatedData) => {
        setUser((prev) => {
            if (!prev) return null;
            const newUserData = { ...prev, ...updatedData };
            localStorage.setItem("user", JSON.stringify(newUserData));
            return newUserData;
        });
    };

    // ==========================================
    // 🔴 التعديل الجديد: التجديد الاستباقي كل 3 دقائق
    // ==========================================
    useEffect(() => {
        let refreshInterval;

        const silentRefresh = async () => {
            try {
                // التأكد من مسار الـ API الخاص بـ Refresh Token
                const refreshUrl = `${import.meta.env.VITE_API_URL || ''}/auth/refreshToken`;
                
                await axios.post(refreshUrl, {}, { 
                    withCredentials: true // مهم جداً عشان يبعت الـ Refresh Cookie
                });
                console.log("Token refreshed proactively ✅");
            } catch (error) {
                console.error("Proactive refresh failed, logging out...", error);
                // لو الـ Refresh Token انتهى أو فيه مشكلة، بنخرجه من الحساب
                logout();
            }
        };

        if (isLoggedIn) {
            // 3 دقائق = 3 * 60 * 1000 = 180000 ملي ثانية
            refreshInterval = setInterval(silentRefresh, 180000);
        }

        return () => {
            // تنظيف الـ Interval لو اليوزر عمل Logout أو الصفحة اتقفلت
            if (refreshInterval) clearInterval(refreshInterval);
        };
    }, [isLoggedIn]);
    // ==========================================

    return (
        <AuthContext.Provider value={{ isLoggedIn, user, loading, login, logout, updateUserLocalState }}>
            {!loading ? children:(
                <div className="flex h-screen w-screen items-center justify-center bg-cream font-body text-text-primary">
                    Loading Application...
                </div>
            ) }
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);