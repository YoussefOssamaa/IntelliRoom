import React, { useState } from 'react';
import './community.css';
import Header from '../../pages/dashboard/Header';
import Footer from '../../components/common/Footer';

export function Community() {
  const [activeTab, setActiveTab] = useState('All');

  //  (Tabs)
  const categories = ['All', 'mosque', 'Living room', 'Kitchen', 'Bedroom', 'Courtyard'];

  // Need to put reel image from our data base 
  const designs = [
    { id: 1, category: 'Living room', img: 'https://images.unsplash.com/photo-1583847268964-b28dc2f51ac9?q=80&w=300' },
    { id: 2, category: 'Kitchen', img: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=300' },
    { id: 3, category: 'Bedroom', img: 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?q=80&w=300' },
    { id: 4, category: 'Courtyard', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=300' },
    { id: 5, category: 'mosque', img: 'https://images.unsplash.com/photo-1585128719715-46776b56a0d1?q=80&w=300' },
    { id: 6, category: 'Living room', img: 'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?q=80&w=300' },
  ];

  const filteredDesigns = activeTab === 'All' 
    ? designs 
    : designs.filter(d => d.category === activeTab);

  return (
    <>
      <Header />
      <div className='main-wrapper'>
        
        <div className="deco-shape" style={{ top: '-10%', right: '-15%', width: '400px', height: '400px', backgroundColor: '#5048E5', opacity: '0.1' }} />
        <div className="deco-shape" style={{ bottom: '5%', left: '-10%', width: '300px', height: '300px', backgroundColor: '#F59F0A', opacity: '0.1' }} />

        <div className="profile-page-content">
          
          {/* --- Page Title Section --- */}
          <div className="header-flex" style={{ marginBottom: '40px' }}>
            <div>
              <h1 className="main-title">IntelliRoom Community</h1>
              <p style={{ color: '#666', fontSize: '1rem', marginTop: '5px' }}>
                Explore creative designs and connect with our expert consultants.
              </p>
            </div>
          </div>

          
          
  <div className="card consultant-card full-width-card">
    <div className="consultant-info">
      <div className="consultant-avatar">AK</div>
      <div className="consultant-text">
        <h3 className="consultant-name">Meet a Consultant: Ahmed Karam </h3>
        <p className="consultant-desc">Expert in modern and classical interior design. View Ahmed's professional portfolio and get expert advice.</p>
      </div>
    </div>
    <button className="cta-button view-designs-btn">View Portfolio</button>
  </div>

          {/* 2.(Tabs Section) */}
          <div className="tabs-container">
            {categories.map(tab => (
              <button 
                key={tab} 
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* 3.  (Image Gallery) */}
          <div className="designs-gallery">
            {filteredDesigns.map(design => (
              <div key={design.id} className="design-item">
                <img src={design.img} alt={design.category} />
                <div className="design-overlay">{design.category}</div>
              </div>
            ))}
          </div>

          {/* 4.  (Floating Upload Button) */}
          <button className="floating-upload-btn">
            <span>+</span> Upload Design
          </button>

        </div>
      </div>
      <Footer />
    </>
  );
}
