import React, { useState, useEffect } from 'react';
import './updateProfile.css'; // للحفاظ على تنسيقات الحقول والـ Inputs
import '../../pages/dashboard/DashboardPage.css'; // وراثة نظام توزيع الـ Layout والـ Cards للداشبورد
import Header from '../../pages/dashboard/Header';
import Footer from '../../components/common/Footer';
import { useAuth } from '../../utils/authContext';
import { useNavigate } from 'react-router-dom';
import axios from '../../config/axios.config';

export function UpdateProfile() {
  const navigate = useNavigate();
  const { user, updateUserLocalState } = useAuth();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    user_name: '',
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        user_name: user.user_name || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.put('/updateProfile', formData, {
        withCredentials: true
      });
      
      if (response.status === 200 || response.data) {
        updateUserLocalState(formData);
        alert("Profile updated successfully! ✅");
      }
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Failed to update profile. ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      
      <div className="dashboard-layout pt-[72px]">
        <div className="content-wrapper">
          
          {/* ── SIDEBAR (تطابق كامل مع الداشبورد) ── */}
          <aside className="sidebar">
            <ul className="nav-list">
              <li onClick={() => navigate("/dashboard")} className="nav-item">
                <IconDashboard />
                <span>Overview</span>
              </li>
              <li onClick={() => navigate("/projects")} className="nav-item">
                <IconFolder />
                <span>My Projects</span>
              </li>
              <li onClick={() => navigate("/upload")} className="nav-item">
                <IconAIStudio />
                <span>AI Studio</span>
              </li>
              <li onClick={() => navigate("/planner")} className="nav-item">
                <IconBlueprint />
                <span>Architect</span>
              </li>
              <li onClick={() => navigate("/ecomm")} className="nav-item">
                <IconCart />
                <span>Shop</span>
              </li>
              <div className="nav-divider" />
              <li className="nav-item active">
                <IconPerson />
                <span>Settings</span>
              </li>
            </ul>
          </aside>

          {/* ── MAIN AREA ── */}
          <main className="main-area">
            
            {/* عنوان الصفحة بهوية نظام الداشبورد */}
            <div className="welcome-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p className="welcome-eyebrow">Settings</p>
                <h1 className="welcome-title">
                  Account <span>Settings</span>
                </h1>
                <p className="welcome-subtitle">
                  Update your personal details and adjust configuration safety.
                </p>
              </div>
              
              <button form="profile-form" type="submit" className="btn-accent" disabled={loading}>
                {loading ? 'Saving...' : 'Save all Changes'}
              </button>
            </div>

            {/* شبكة النماذج باستخدام كلاسات الداشبورد النظيفة */}
            <form id="profile-form" onSubmit={handleSubmit} className="stats-grid">
              
              {/* Card 1: Basic Details */}
              <div className="stat-card">
                <span className="stat-label">Basic Details</span>
                <div style={{ marginTop: '1rem' }}>
                  <div className="input-field">
                    <label>First Name</label>
                    <input name="firstName" value={formData.firstName} onChange={handleChange} type="text" required />
                  </div>
                  <div className="input-field">
                    <label>Last Name</label>
                    <input name="lastName" value={formData.lastName} onChange={handleChange} type="text" required />
                  </div>
                  <div className="input-field">
                    <label>User Name</label>
                    <input name="user_name" value={formData.user_name} onChange={handleChange} type="text" required />
                  </div>
                </div>
              </div>

              {/* Card 2: Security */}
              <div className="stat-card">
                <span className="stat-label">Security & Authentication</span>
                <div style={{ marginTop: '1rem' }}>
                  <div className="input-field">
                    <label>New Password</label>
                    <input type="password" placeholder="••••••••" disabled />
                  </div>
                  <div className="input-field">
                    <label>Confirm Password</label>
                    <input type="password" placeholder="••••••••" disabled />
                  </div>
                  <p className="credits-hint" style={{ fontSize: '0.75rem' }}>Password management will be available in next security update.</p>
                </div>
              </div>

              {/* Card 3: Billing History (Wide) */}
              <div className="stat-card" style={{ gridColumn: '1 / -1' }}>
                <span className="stat-label">Billing History</span>
                <div className="billing-placeholder" style={{ marginTop: '1rem' }}>
                  <p className="credits-hint" style={{ textAlign: 'center' }}>No billing history found for your account.</p>
                </div>
              </div>

              {/* Card 4: Notifications (Wide) */}
              <div className="stat-card" style={{ gridColumn: '1 / -1' }}>
                <span className="stat-label">System Notifications</span>
                <div style={{ marginTop: '1rem', color: 'var(--carbon-60)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div><span style={{ color: 'var(--accent)', marginRight: '8px' }}>✓</span> Receive instant email notifications upon profile updates.</div>
                  <div><span style={{ color: 'var(--accent)', marginRight: '8px' }}>✓</span> Secure critical logs recorded on login attempts.</div>
                </div>
              </div>

            </form>

          </main>
        </div>
      </div>
      
      <Footer />
    </>
  );
}

/* ══════════════════════════════════
   مكتبة الـ SVGs الموحدة للـ Sidebar
══════════════════════════════════ */
const IconDashboard = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
);
const IconFolder = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
);
const IconCart = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
);
const IconPerson = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
);
const IconAIStudio = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l-.813-5.096A4 4 0 005.096 12.813L0 12l5.096-.813a4 4 0 003.091-3.091L9 3l.813 5.096a4 4 0 003.091 3.091L18 12l-5.096.813a4 4 0 00-3.091 3.091zM19.5 7.5L19 10l-.5-2.5L16 7l2.5-.5L19 4l.5 2.5L22 7l-2.5.5z" /></svg>
);
const IconBlueprint = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
);