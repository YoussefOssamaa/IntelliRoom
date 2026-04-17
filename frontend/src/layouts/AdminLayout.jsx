import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import axios from '../config/axios.config';

const AdminLayout = () => {
    const navigate = useNavigate();
    const [admin, setAdmin] = useState(null);

    useEffect(() => {
        const getAdminData = async () => {
            try {
                const res = await axios.get('/api/admin/me');
                setAdmin(res.data.data);
            } catch (err) {
                console.error("Failed to fetch admin data");
            }
        };
        getAdminData();
    }, []);

    const handleLogout = async () => {
        try {
            await axios.post('/api/admin/logout');
            navigate('/login');
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <nav style={{ width: '250px', backgroundColor: '#1a202c', color: 'white', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ textAlign: 'center', borderBottom: '1px solid #4a5568', paddingBottom: '10px' }}>IntelliRoom Admin</h2>
                <ul style={{ listStyle: 'none', padding: 0, marginTop: '20px', flex: 1 }}>
                    <li style={{ marginBottom: '15px' }}>
                        <Link to="/dashboard/users" style={{ color: '#cbd5e0', textDecoration: 'none' }}>👥 Users Management</Link>
                    </li>
                    
                    {/* Only show these links if the admin is a superadmin */}
                    {admin?.role === 'superadmin' && (
                        <>
                            <li style={{ marginBottom: '15px' }}>
                                <Link to="/manage-admins" style={{ color: '#cbd5e0', textDecoration: 'none' }}>🛡️ Admins Management</Link>
                            </li>
                            <li style={{ marginBottom: '15px' }}>
                                <Link to="/logs" style={{ color: '#cbd5e0', textDecoration: 'none' }}>📜 System Logs</Link>
                            </li>
                        </>
                    )}
                </ul>
                <button onClick={handleLogout} style={{ padding: '10px', backgroundColor: '#e53e3e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Logout
                </button>
            </nav>

            <main style={{ flex: 1, padding: '30px', backgroundColor: '#edf2f7' }}>
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;