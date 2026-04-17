import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../config/axios.config';

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/admin/signin', { email, password });
            navigate('/dashboard/users');
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Invalid credentials';
            alert(errorMsg);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f4f9' }}>
            <form onSubmit={handleSubmit} style={{ width: '350px', padding: '30px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>Admin Login</h3>
                <input 
                    type="email" 
                    placeholder="Email Address" 
                    required
                    onChange={(e) => setEmail(e.target.value)} 
                    style={{ marginBottom: '15px', width: '100%', padding: '10px', boxSizing: 'border-box' }}
                />
                <input 
                    type="password" 
                    placeholder="Password" 
                    required
                    onChange={(e) => setPassword(e.target.value)} 
                    style={{ marginBottom: '20px', width: '100%', padding: '10px', boxSizing: 'border-box' }}
                />
                <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Login
                </button>
            </form>
        </div>
    );
};

export default AdminLogin;