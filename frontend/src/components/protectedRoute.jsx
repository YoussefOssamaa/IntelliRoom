import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom'; 
import axios from '../config/axios.config';

const ProtectedRoute = ({ children }) => {
    const [status, setStatus] = useState('loading'); // loading | authorized | unauthorized

    useEffect(() => {
        const checkAuth = async () => {
            console.log("1. Starting Auth Check...");
            try {
                console.log("2. Asking backend for /auth/me...");
                const res = await axios.get('/auth/me');
                console.log("3. Backend responded to /auth/me!", res.data);

                if (res?.data?.success) {
                    setStatus('authorized');
                } else {
                    throw new Error("Initial auth failed");
                }
            } catch (error) {
                console.log("4. /auth/me failed. Trying refresh token...");
                try {
                    const res1 = await axios.post('/auth/refreshToken');
                    console.log("5. Refresh token response:", res1.data);
                    
                    if (res1?.data?.success) {
                        const res2 = await axios.get('/auth/me');
                        if (res2?.data?.success) {
                            setStatus('authorized');
                        } else {
                            setStatus('unauthorized');
                        }
                    } else {
                        setStatus('unauthorized');
                    }
                } catch (e) {
                    console.log("6. EVERYTHING FAILED. Kicking to login.");
                    setStatus('unauthorized');
                }
            }
        };

        checkAuth();
    }, []);

    if (status === 'loading') {
        return <div className="loading-spinner">Loading...</div>; // ممكن تحط سبينر شيك هنا
    }

    if (status === 'unauthorized') {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;