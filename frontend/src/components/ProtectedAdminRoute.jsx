import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom'; 
import axios from '../config/axios.config';

const ProtectedAdminRoute = () => {
    const [status, setStatus] = useState('loading'); 

    useEffect(() => {
        const checkAdminAuth = async () => {
            try {
                const res = await axios.get('/api/admin/me'); 
                if (res?.data?.success) {
                    setStatus('authorized');
                } else {
                    throw new Error("Initial admin auth failed");
                }
            } catch (error) {
                try {
                    const res1 = await axios.post('/api/admin/refresh');
                    if (res1?.data?.success) {
                        const res2 = await axios.get('/api/admin/me');
                        if (res2?.data?.success) {
                            setStatus('authorized');
                        } else {
                            setStatus('unauthorized');
                        }
                    } else {
                        setStatus('unauthorized');
                    }
                } catch (e) {
                    setStatus('unauthorized');
                }
            }
        };

        checkAdminAuth();
    }, []);

    if (status === 'loading') {
        return <div className="loading-spinner">Verifying Admin Access...</div>; 
    }

    if (status === 'unauthorized') {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

export default ProtectedAdminRoute;