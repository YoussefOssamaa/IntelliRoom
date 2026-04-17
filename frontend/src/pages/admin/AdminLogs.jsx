import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../config/axios.config';

const AdminLogs = () => {
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        page: 1,
        pages: 1,
        total: 0
    });

    const fetchLogs = async (page = 1) => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/admin/logs?page=${page}&limit=20`);
            
            if (response.data.success) {
                setLogs(response.data.data || []);
                setPagination(response.data.pagination);
                setError(null);
            }
        } catch (err) {
            // If the admin is not a SuperAdmin, the backend returns 403
            if (err.response?.status === 403) {
                navigate('/dashboard/users');
            } else {
                setError('Failed to load system logs. Please try again later.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.pages) {
            fetchLogs(newPage);
        }
    };

    if (loading && logs.length === 0) return <h3>Loading System Logs...</h3>;
    if (error) return <h3 style={{ color: 'red' }}>{error}</h3>;

    return (
        <div>
            <h2 style={{ marginBottom: '20px' }}>📜 System Activity Logs</h2>

            <div style={{ overflowX: 'auto', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f7fafc', borderBottom: '2px solid #e2e8f0' }}>
                            <th style={{ padding: '12px' }}>Admin</th>
                            <th style={{ padding: '12px' }}>Action</th>
                            <th style={{ padding: '12px' }}>Target User</th>
                            <th style={{ padding: '12px' }}>Details</th>
                            <th style={{ padding: '12px' }}>Timestamp</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>No logs recorded yet.</td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '12px' }}>
                                        <strong>{log.adminId?.name || 'Unknown Admin'}</strong><br />
                                        <small style={{ color: '#718096' }}>{log.adminId?.email}</small>
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <span style={{ 
                                            padding: '4px 8px', 
                                            borderRadius: '4px', 
                                            backgroundColor: '#edf2f7', 
                                            fontSize: '0.85em',
                                            fontWeight: 'bold',
                                            color: '#2d3748'
                                        }}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        {log.targetUserId ? (
                                            <>
                                                {log.targetUserId.firstName} {log.targetUserId.lastName}<br />
                                                <small style={{ color: '#718096' }}>{log.targetUserId.email}</small>
                                            </>
                                        ) : (
                                            <span style={{ color: '#a0aec0' }}>N/A</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '12px', fontSize: '0.9em', color: '#4a5568' }}>
                                        {log.details || '-'}
                                    </td>
                                    <td style={{ padding: '12px', fontSize: '0.85em', color: '#718096' }}>
                                        {new Date(log.createdAt).toLocaleString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Simple Pagination UI */}
                {pagination.pages > 1 && (
                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '15px', alignItems: 'center' }}>
                        <button 
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={pagination.page === 1}
                            style={{ padding: '8px 12px', cursor: pagination.page === 1 ? 'not-allowed' : 'pointer', border: '1px solid #cbd5e0', borderRadius: '4px', backgroundColor: 'white' }}
                        >
                            Previous
                        </button>
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>
                            Page {pagination.page} of {pagination.pages}
                        </span>
                        <button 
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={pagination.page === pagination.pages}
                            style={{ padding: '8px 12px', cursor: pagination.page === pagination.pages ? 'not-allowed' : 'pointer', border: '1px solid #cbd5e0', borderRadius: '4px', backgroundColor: 'white' }}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminLogs;