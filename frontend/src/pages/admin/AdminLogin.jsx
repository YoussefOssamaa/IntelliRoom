import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../config/axios.config';
import toast from 'react-hot-toast';

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await axios.post('/admin/signin', { email, password });
            toast.success('Welcome back, Admin!');
            navigate('/dashboard/users');
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Invalid credentials';
            toast.error(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const inputStyle = { width: '100%', padding: '12px', marginBottom: '20px', border: '1px solid #D1D5DB', borderRadius: '8px', outline: 'none', fontSize: '1rem', boxSizing: 'border-box' };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#F3F4F6', fontFamily: 'system-ui, sans-serif' }}>
            <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '400px', padding: '40px', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h2 style={{ color: '#111827', margin: '0 0 8px 0' }}>Admin Portal</h2>
                    <p style={{ color: '#6B7280', margin: 0, fontSize: '0.9rem' }}>Sign in to manage IntelliRoom</p>
                </div>
                
                <input type="email" placeholder="Email Address" required onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
                <input type="password" placeholder="Password" required onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
                
                <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '12px', backgroundColor: isLoading ? '#93C5FD' : '#3B82F6', color: 'white', border: 'none', borderRadius: '8px', cursor: isLoading ? 'not-allowed' : 'pointer', fontSize: '1rem', fontWeight: '600', transition: 'background 0.2s' }}>
                    {isLoading ? 'Authenticating...' : 'Login'}
                </button>
            </form>
        </div>
    );
};

export default AdminLogin;