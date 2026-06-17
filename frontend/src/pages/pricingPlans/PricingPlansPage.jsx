import React, { useState, useEffect } from 'react';
import './PricingPlansPage.css';
import Header from '../../pages/dashboard/Header';
import Footer from '../../components/common/Footer';
import { useNavigate } from 'react-router-dom';
import { subscribeToPlan, getPublicPlans } from '../../services/subscriptionService';

export function PricingPlansPage() {
  const [plans, setPlans] = useState([]);
  const [isAnnual, setIsAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await getPublicPlans();
        setPlans(response.data || []);
        setLoading(false);
      } catch (err) {
        setError(err.message || 'Error fetching plans');
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  const handleSubscribe = async (planId) => {
    setLoadingPlan(planId);
    try {
      const billingCycle = isAnnual ? 'annual' : 'monthly';
      const response = await subscribeToPlan(planId, billingCycle);
      if (response.success && response.checkoutUrl) {
        window.location.href = response.checkoutUrl;
        return;
      }
    } catch (error) {
      alert("Failed to initiate subscription");
    }
    setLoadingPlan(null);
  };

  if (loading) return <div className="flex justify-center p-10"><p>Loading plans...</p></div>;
  if (error) return <div className="flex justify-center p-10"><p className="text-red-500">{error}</p></div>;

  return (
    <>
    <Header />
    <div className='main-wrapper'>
      <div 
        className="deco-shape" 
        style={{ 
          top: '-22%', 
          right: '-32%', 
          width: '600px', 
          height: '600px',
          backgroundColor: '#D946EF',
          opacity: '0.15'
        }} 
      />
      <div 
        className="deco-shape" 
        style={{ 
          top: '70%', 
          left: '-25%', 
          width: '600px', 
          height: '600px',
          borderRadius: '70px',
          transform: 'rotate(45deg)'
        }} 
      />
      <div className="header-section">
        <h1 className="main-title">Choose Your Perfect Plan</h1>
        <p className="sub-title">
          Choose the plan that suits you best. No hidden fees.
        </p>
      </div>
      
      <div className="toggle-area">
        <span className={`label-text ${!isAnnual ? 'active-text' : ''}`}>Monthly</span>
        
        <div 
          className={`toggle-switch ${isAnnual ? 'active' : ''}`} 
          onClick={() => setIsAnnual(!isAnnual)}
        >
          <div className="switch-knob"></div>
        </div>
        
        <span className={`label-text ${isAnnual ? 'active-text' : ''}`}>Annual</span>
        
        <span className={`save-badge ${isAnnual ? 'active-save-badge' : ''}`}>Save 17%</span>
      </div>

      <div className='cards-container'>
        {plans.map((plan) => (
          <div 
            key={plan._id} 
            className="card"
          >
            <h3 className='plan-name'>{plan.name}</h3>
            <p className='description'>{plan.description || ''}</p>
            
            <div className="price-tag">
              ${plan.price}
              <span className="period">/{isAnnual ? 'year' : 'month'}</span>
            </div>

            <hr className="card-divider" />

            <ul className='features'>
              <li>
                <span className="checkmark">✓</span> Render Limit: {plan.renderLimit === -1 ? 'Unlimited' : plan.renderLimit}
              </li>
              <li>
                <span className="checkmark">✓</span> 3D Model Limit: {plan.model3DLimit === -1 ? 'Unlimited' : plan.model3DLimit}
              </li>
              {plan.availableFeatures && plan.availableFeatures.map((feature, i) => (
                <li key={i}>
                  <span className="checkmark">✓</span> {feature}
                </li>
              ))}
            </ul>

            <button 
              className="cta-button" 
              onClick={() => handleSubscribe(plan._id)} 
              disabled={loadingPlan === plan._id}
            >
              {loadingPlan === plan._id ? 'Processing...' : `Choose ${plan.name}`}
            </button>
          </div>
        ))}
      </div>
    </div>
    <Footer />
    </>
  );
}