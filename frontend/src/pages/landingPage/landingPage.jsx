import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import styles from './landingPage.module.css';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <>
      <Header />
      <div className={styles.hero}>
        <div className={styles.contentWrapper}>
          <h1 className={styles.heading}>Create Stunning Designs in Minutes</h1>
          <p className={styles.subheading}>
            Unleash your creativity with our powerful design tools. 
            No experience needed.
          </p>
          
          <div className={styles.buttonGroup}>
            <button 
              className={styles.primaryButton}
              onClick={() => navigate("/signup")}
            >
              Start Designing Free
            </button>
            <button 
              className={styles.secondaryButton}
              onClick={() => navigate("/signup")}
            >
              Try as a Guest
            </button>
          </div>

          <label className={styles.disclaimer}>
            No credit card required • High-quality free designs
          </label>

          <button 
            className={styles.marketplaceButton}
            onClick={() => navigate("/marketplace")}
          >
            Explore Our Community Marketplace
          </button>
        </div>
      </div>
      <Footer />
    </>
  );
} 

export default LandingPage;