import React from 'react';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirm", isDanger = false }) => {
    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', width: '400px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                <h3 style={{ marginTop: 0, marginBottom: '10px', color: '#111827', fontSize: '1.25rem' }}>{title}</h3>
                <p style={{ color: '#4B5563', marginBottom: '24px', lineHeight: '1.5' }}>{message}</p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: 'white', color: '#374151', cursor: 'pointer', fontWeight: '500' }}>
                        Cancel
                    </button>
                    <button onClick={onConfirm} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: isDanger ? '#EF4444' : '#3B82F6', color: 'white', cursor: 'pointer', fontWeight: '500' }}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;