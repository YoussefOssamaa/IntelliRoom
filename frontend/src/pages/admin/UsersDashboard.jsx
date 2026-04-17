import React, { useState, useEffect } from 'react';
import axios from '../../config/axios.config';

const UsersDashboard = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/admin/dashboard/users');
            setUsers(response.data.data || []);
            setError(null);
        } catch (err) {
            setError('Failed to load users data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleSuspend = async (userId, isCurrentlySuspended) => {
        const confirmMsg = isCurrentlySuspended 
            ? 'Are you sure you want to activate this user?' 
            : 'Are you sure you want to suspend this user?';

        if (!window.confirm(confirmMsg)) return;

        try {
            await axios.patch(`/api/admin/dashboard/users/${userId}/suspend`);
            alert('User status updated successfully');
            fetchUsers(); 
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update user status');
        }
    };

    const handleChangePlan = async (userId, newPlanName) => {
        if (!window.confirm(`Change user plan to ${newPlanName}?`)) return;

        try {
            await axios.patch(`/api/admin/dashboard/users/${userId}/change-plan`, { planName: newPlanName });
            alert('Plan updated successfully');
            fetchUsers(); 
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update plan');
        }
    };

    const getSubscriptionStatusBadge = (status) => {
        switch(status) {
            case 'active': return <span style={{ padding: '4px 8px', borderRadius: '12px', backgroundColor: '#c6f6d5', color: '#22543d' }}>Active</span>;
            case 'trial': return <span style={{ padding: '4px 8px', borderRadius: '12px', backgroundColor: '#bee3f8', color: '#2a4365' }}>Trial</span>;
            case 'canceled': return <span style={{ padding: '4px 8px', borderRadius: '12px', backgroundColor: '#fed7d7', color: '#9b2c2c' }}>Canceled</span>;
            case 'expired': return <span style={{ padding: '4px 8px', borderRadius: '12px', backgroundColor: '#e2e8f0', color: '#4a5568' }}>Expired</span>;
            case 'past_due': return <span style={{ padding: '4px 8px', borderRadius: '12px', backgroundColor: '#fefcbf', color: '#744210' }}>Past Due</span>;
            default: return <span style={{ padding: '4px 8px', borderRadius: '12px', backgroundColor: '#edf2f7', color: '#4a5568' }}>Unknown</span>;
        }
    };

    if (loading) return <h3>Loading Users...</h3>;
    if (error) return <h3 style={{ color: 'red' }}>{error}</h3>;

    return (
        <div>
            <h2 style={{ marginBottom: '20px' }}>👥 IntelliRoom Users Management</h2>
            
            <div style={{ overflowX: 'auto', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f7fafc', borderBottom: '2px solid #e2e8f0' }}>
                            <th style={{ padding: '12px' }}>Name</th>
                            <th style={{ padding: '12px' }}>Email</th>
                            <th style={{ padding: '12px' }}>Subscription</th>
                            <th style={{ padding: '12px' }}>Plan</th>
                            <th style={{ padding: '12px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>No users found.</td>
                            </tr>
                        ) : (
                            users.map((user) => {
                                const currentPlan = user.subscription?.planId?.name || 'free'; 
                                const subStatus = user.subscription?.status || 'none';
                                const isSuspended = user.isSuspended || false; 

                                return (
                                    <tr key={user._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '12px' }}>{user.firstName} {user.lastName}</td>
                                        <td style={{ padding: '12px' }}>{user.email}</td>
                                        
                                        <td style={{ padding: '12px' }}>
                                            {getSubscriptionStatusBadge(subStatus)}
                                        </td>

                                        <td style={{ padding: '12px' }}>
                                            <select 
                                                value={currentPlan} 
                                                onChange={(e) => handleChangePlan(user._id, e.target.value)}
                                                style={{ padding: '5px', borderRadius: '4px' }}
                                            >
                                                <option value="free">Free</option>
                                                <option value="pro">Pro</option>
                                                <option value="enterprise">Enterprise</option>
                                            </select>
                                        </td>

                                        <td style={{ padding: '12px' }}>
                                            <button 
                                                onClick={() => handleSuspend(user._id, isSuspended)}
                                                style={{ 
                                                    padding: '6px 12px', 
                                                    backgroundColor: isSuspended ? '#4299e1' : '#e53e3e', 
                                                    color: 'white', 
                                                    border: 'none', 
                                                    borderRadius: '4px', 
                                                    cursor: 'pointer' 
                                                }}
                                            >
                                                {isSuspended ? 'Activate' : 'Suspend'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UsersDashboard;