import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import axios from '../config/axios.config';
import { Toaster } from 'react-hot-toast';
import { Users, Shield, FileText, LogOut } from 'lucide-react';

const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [admin, setAdmin] = useState(null);

    useEffect(() => {
        const getAdminData = async () => {
            try {
                const res = await axios.get('/admin/me');
                setAdmin(res.data.data);
            } catch (err) {
                console.error("Failed to fetch admin data");
            }
        };
        getAdminData();
    }, []);

    const handleLogout = async () => {
        try {
            await axios.post('/admin/logout');
            navigate('/login');
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    const navItemStyle = (path) => ({
        display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', 
        borderRadius: '8px', color: location.pathname === path ? '#ffffff' : '#9CA3AF',
        backgroundColor: location.pathname === path ? '#374151' : 'transparent',
        textDecoration: 'none', transition: 'all 0.2s', fontWeight: '500'
    });

    return (
        <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <Toaster position="top-right" /> {/* نافذة الإشعارات */}
            
            <nav style={{ width: '260px', backgroundColor: '#111827', color: 'white', padding: '24px', display: 'flex', flexDirection: 'column', boxShadow: '4px 0 10px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '24px', borderBottom: '1px solid #374151', marginBottom: '24px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#3B82F6', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>IR</div>
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>IntelliRoom</h2>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li>
                        <Link to="/dashboard/users" style={navItemStyle('/dashboard/users')}>
                            <Users size={20} /> Users Management
                        </Link>
                    </li>
                    
                    {admin?.role === 'superadmin' && (
                        <>
                            <li>
                                <Link to="/manage-admins" style={navItemStyle('/manage-admins')}>
                                    <Shield size={20} /> Admins Management
                                </Link>
                            </li>
                            <li>
                                <Link to="/logs" style={navItemStyle('/logs')}>
                                    <FileText size={20} /> System Logs
                                </Link>
                            </li>
                        </>
                    )}
                </ul>

                <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', backgroundColor: '#EF4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: 'background 0.2s' }}>
                    <LogOut size={20} /> Logout
                </button>
            </nav>

            <main style={{ flex: 1, padding: '40px', backgroundColor: '#F3F4F6', overflowY: 'auto' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;