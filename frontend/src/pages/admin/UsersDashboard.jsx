import React, { useState, useEffect } from 'react';
import axios from '../../config/axios.config';
import toast from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal'; // مسار الـ Component الذي أنشأناه

const UsersDashboard = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Modal States
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: '', userId: null, extraData: null, title: '', message: '' });

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/admin/dashboard/users');
            setUsers(response.data.data || []);
            setError(null);
        } catch (err) {
            setError('Failed to load users data');
            toast.error('Failed to load users data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    // فتح نافذة التأكيد للإيقاف/التفعيل
    const triggerSuspend = (userId, isCurrentlySuspended) => {
        setConfirmModal({
            isOpen: true,
            type: 'suspend',
            userId,
            extraData: isCurrentlySuspended,
            title: isCurrentlySuspended ? 'Activate User' : 'Suspend User',
            message: isCurrentlySuspended ? 'Are you sure you want to activate this user account?' : 'Are you sure you want to suspend this user? They will lose access.'
        });
    };

    // فتح نافذة التأكيد لتغيير الخطة
    const triggerPlanChange = (userId, newPlanName) => {
        setConfirmModal({
            isOpen: true, type: 'plan', userId, extraData: newPlanName,
            title: 'Change Subscription Plan',
            message: `Are you sure you want to change this user's plan to ${newPlanName.toUpperCase()}?`
        });
    };

    // تنفيذ الـ API بعد تأكيد الـ Modal
    const handleConfirm = async () => {
        const { type, userId, extraData } = confirmModal;
        setConfirmModal({ ...confirmModal, isOpen: false }); // إغلاق النافذة
        const toastId = toast.loading('Processing...');

        try {
            if (type === 'suspend') {
                await axios.patch(`/admin/dashboard/users/${userId}/suspend`);
                toast.success('User status updated successfully', { id: toastId });
            } else if (type === 'plan') {
                await axios.patch(`/admin/dashboard/users/${userId}/change-plan`, { planName: extraData });
                toast.success('Plan updated successfully', { id: toastId });
            }
            fetchUsers(); 
        } catch (err) {
            toast.error(err.response?.data?.message || 'Action failed', { id: toastId });
        }
    };

    const getSubscriptionStatusBadge = (status) => {
        const styles = { padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600' };
        switch(status) {
            case 'active': return <span style={{ ...styles, backgroundColor: '#D1FAE5', color: '#065F46' }}>Active</span>;
            case 'trial': return <span style={{ ...styles, backgroundColor: '#DBEAFE', color: '#1E40AF' }}>Trial</span>;
            case 'canceled': return <span style={{ ...styles, backgroundColor: '#FEE2E2', color: '#991B1B' }}>Canceled</span>;
            case 'expired': return <span style={{ ...styles, backgroundColor: '#F3F4F6', color: '#374151' }}>Expired</span>;
            case 'past_due': return <span style={{ ...styles, backgroundColor: '#FEF3C7', color: '#92400E' }}>Past Due</span>;
            default: return <span style={{ ...styles, backgroundColor: '#F3F4F6', color: '#374151' }}>Unknown</span>;
        }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}><div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #E5E7EB', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div><style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style></div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ margin: 0, color: '#111827' }}>👥 Users Management</h2>
            </div>
            
            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <th style={{ padding: '16px 24px', fontWeight: '600' }}>Name & Email</th>
                            <th style={{ padding: '16px 24px', fontWeight: '600' }}>Subscription</th>
                            <th style={{ padding: '16px 24px', fontWeight: '600' }}>Plan</th>
                            <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => {
                            const currentPlan = user.subscription?.planId?.name || 'free'; 
                            const subStatus = user.subscription?.status || 'none';
                            const isSuspended = user.isSuspended || false; 

                            return (
                                <tr key={user._id} style={{ borderBottom: '1px solid #E5E7EB', transition: 'background 0.2s' }}>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ fontWeight: '600', color: '#111827' }}>{user.firstName} {user.lastName}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: '4px' }}>{user.email}</div>
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>{getSubscriptionStatusBadge(subStatus)}</td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <select 
                                            value={currentPlan} 
                                            onChange={(e) => triggerPlanChange(user._id, e.target.value)}
                                            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: '#F9FAFB', color: '#374151', cursor: 'pointer', outline: 'none' }}
                                        >
                                            <option value="free">Free</option>
                                            <option value="pro">Pro</option>
                                            <option value="enterprise">Enterprise</option>
                                        </select>
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                        <button 
                                            onClick={() => triggerSuspend(user._id, isSuspended)}
                                            style={{ padding: '6px 12px', backgroundColor: isSuspended ? '#ECFCCB' : '#FEE2E2', color: isSuspended ? '#3F6212' : '#991B1B', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
                                        >
                                            {isSuspended ? 'Activate' : 'Suspend'}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <ConfirmModal 
                isOpen={confirmModal.isOpen} 
                title={confirmModal.title} 
                message={confirmModal.message} 
                onConfirm={handleConfirm} 
                onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })} 
                isDanger={confirmModal.type === 'suspend' && !confirmModal.extraData}
            />
        </div>
    );
};

export default UsersDashboard;