import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../config/axios.config';

const ProtectedRoute = ({ children }) => {
    const [status, setStatus] = useState('loading'); // loading | authorized | unauthorized
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // بنبعت طلب للسيرفر يتأكد من الـ Token (بيكون متخزن في الـ Headers أو الـ Cookies)
                const res = await axios.get('/auth/me');

                if (res?.data?.success) {
                    setStatus('authorized');
                }
            } catch (error) {
                // console.error("Auth check failed", error);
                try {
                    const res1 = await axios.post('/auth/refreshToken');
                    if (res1?.data?.success) {
                        const res2 = await axios.get('/auth/me');
                        if (res2?.data?.success) {
                            setStatus('authorized');
                        } else {
                            setStatus('unauthorized');
                        }
                    }
                } catch (e) {
                    // console.log("badr",e)
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
        navigate('/login');
        // لو مش مسموح له، بنرجعه للوجين وبنحفظ هو كان عايز يروح فين عشان نرجعه تاني بعد اللوجين
        retrun(<></>)
    }

    return children;
};

export default ProtectedRoute;