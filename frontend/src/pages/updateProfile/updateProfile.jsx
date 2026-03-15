{/*
import React from 'react';
import './UpdateProfile.css';
import Header from '../../pages/dashboard/Header';
import Footer from '../../components/common/Footer';

export function UpdateProfile() {
  return (
    <>
      <Header />
      <div className='main-wrapper'>
        
        <div className="deco-shape" style={{ top: '-10%', right: '-15%', width: '400px', height: '400px', backgroundColor: '#5048E5', opacity: '0.1' }} />
        <div className="deco-shape" style={{ bottom: '5%', left: '-10%', width: '300px', height: '300px', backgroundColor: '#F59F0A', opacity: '0.1' }} />

        <div className="profile-page-content">
          
          <div className="header-flex">
            <h1 className="main-title">Update Personal Information</h1>
            <button className="cta-button save-all-btn">Save all Changes</button>
          </div>

          <div className="profile-grid">
            
            <div className="card profile-card">
              <h3 className="plan-name">Basic Details</h3>
              <div className="input-field">
                <label>Full Name</label>
                <input type="text" placeholder="Enter your full name" />
              </div>
              <div className="input-field">
                <label>User Name</label>
                <input type="text" placeholder="Username" />
              </div>
              <div className="input-field">
                <label>Email Address</label>
                <input type="email" placeholder="email@example.com" />
              </div>
            </div>

            
            <div className="card profile-card">
              <h3 className="plan-name">Security</h3>
              <div className="input-field">
                <label>New Password</label>
                <input type="password" placeholder="••••••••" />
              </div>
              <div className="input-field">
                <label>Re-Password</label>
                <input type="password" placeholder="••••••••" />
              </div>
            </div>

            
            <div className="card profile-card wide-card">
              <h3 className="plan-name">Billing History</h3>
              <div className="billing-placeholder">
                <p className="description">No billing history found for your account.</p>
              </div>
            </div>

            
            <div className="card profile-card wide-card">
              <h3 className="plan-name">Notifications</h3>
              <div className="features">
                <li><span className="checkmark">✓</span> Email Notifications when profile changes</li>
                <li><span className="checkmark">✓</span> Security alerts and login attempts</li>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}


*/}
import React, { useState } from 'react';
import './updateProfile.css';
import Header from '../../pages/dashboard/Header';
import Footer from '../../components/common/Footer';

export function UpdateProfile() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    user_name: '',
  });

  const [loading, setLoading] = useState(false);
  const userId = localStorage.getItem('userId');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/users/update/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) alert("Profile updated! ✅");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className='main-wrapper'>
        <div className="deco-shape" style={{ top: '-10%', right: '-15%', width: '400px', height: '400px', backgroundColor: '#5048E5', opacity: '0.1' }} />
        <div className="deco-shape" style={{ bottom: '5%', left: '-10%', width: '300px', height: '300px', backgroundColor: '#F59F0A', opacity: '0.1' }} />

        <div className="profile-page-content">
          {/* 1. الهيدر خارج الفورم لضمان المسافات */}
          <div className="header-flex">
            <h1 className="main-title">Update Personal Information</h1>
            {/* ربط الزرار بالفورم عن طريق الـ id */}
            <button form="profile-form" type="submit" className="cta-button save-all-btn" disabled={loading}>
              {loading ? 'Saving...' : 'Save all Changes'}
            </button>
          </div>

          {/* 2. جعل الفورم هو نفسه الـ profile-grid */}
          <form id="profile-form" onSubmit={handleSubmit} className="profile-grid">
            
            {/* Box 1: Basic Details */}
            <div className="card profile-card">
              <h3 className="plan-name">Basic Details</h3>
              <div className="input-field">
                <label>First Name</label>
                <input name="firstName" value={formData.firstName} onChange={handleChange} type="text" placeholder="First Name" />
              </div>
              <div className="input-field">
                <label>Last Name</label>
                <input name="lastName" value={formData.lastName} onChange={handleChange} type="text" placeholder="Last Name" />
              </div>
              <div className="input-field">
                <label>User Name</label>
                <input name="user_name" value={formData.user_name} onChange={handleChange} type="text" placeholder="Username" />
              </div>
            </div>

            {/* Box 2: Security */}
            <div className="card profile-card">
              <h3 className="plan-name">Security</h3>
              <div className="input-field">
                <label>New Password</label>
                <input type="password" placeholder="••••••••" disabled />
              </div>
              <div className="input-field">
                <label>Re-Password</label>
                <input type="password" placeholder="••••••••" disabled />
              </div>
            </div>

            {/* Box 3: Billing History */}
            <div className="card profile-card wide-card">
              <h3 className="plan-name">Billing History</h3>
              <div className="billing-placeholder">
                <p className="description">No billing history found for your account.</p>
              </div>
            </div>

            {/* Box 4: Notifications */}
            <div className="card profile-card wide-card">
              <h3 className="plan-name">Notifications</h3>
              <div className="features">
                <li><span className="checkmark">✓</span> Email Notifications when profile changes</li>
                <li><span className="checkmark">✓</span> Security alerts and login attempts</li>
              </div>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
}