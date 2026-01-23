import React, { useState } from 'react';
import './PricingPlansPage.css';

export function PricingPlansPage() {
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      name: 'Free',
      monthlyPrice: 0,
      annualPrice: 0,
      description: 'Perfect for getting started',
      features: [
        '20 designs per month',
        'Standard resolution (FHD)',
        'Basic style library',
        'Community gallery access',
        'Earn credits through voting'
      ],
      highlighted: false
    },
    {
      name: 'Pro',
      monthlyPrice: 29,
      annualPrice: 290,
      description: 'For professional creators',
      features: [
        'Unlimited designs',
        'Unlimited downloads',
        'High resolution (4K)',
        'Full style library + marketplace',
        'Advanced features (masking, batch)',
        'Priority processing',
        'Style mixing',
        'Priority support'
      ],
      highlighted: true
    },
    {
      name: 'Business',
      monthlyPrice: 99,
      annualPrice: 990,
      description: 'For teams and enterprises',
      features: [
        'Everything in Pro',
        'API access',
        'Team collaboration',
        'White-label options',
        'Custom integrations',
        'Dedicated support',
        'Custom training',
        'SLA guarantee'
      ],
      highlighted: false
    }
  ];

  return (
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
          
          borderRadius: '70px', // Extra rounded
          transform: 'rotate(45deg)' // Different rotation
        }} 
      />

      <div className="header-section">
        <h1 className="main-title">Choose Your Perfect Plan</h1>
        <p className="sub-title">
          Choose the plan that suits you best. No hidden fees.
        </p>
      </div>
      
      {/* --- UPDATED TOGGLE SECTION --- */}
      <div className="toggle-area">
        <span className={`label-text ${!isAnnual ? 'active-text' : ''}`}>Monthly</span>
        
        {/* The Switch Container */}
        <div 
          className={`toggle-switch ${isAnnual ? 'active' : ''}`} 
          onClick={() => setIsAnnual(!isAnnual)}
        >
          {/* The Moving Circle (Knob) */}
          <div className="switch-knob"></div>
        </div>
        
        <span className={`label-text ${isAnnual ? 'active-text' : ''}`}>Annual</span>
        
        {/* The Savings Badge */}
        <span className={`save-badge ${isAnnual ? 'active-save-badge' : ''}`}>Save 17%</span>
      </div>

      <div className='cards-container'>
        {plans.map((plan, index) => (
          <div 
            key={index} 
            className={`card ${plan.highlighted ? 'popular-card' : ''}`}
          >
            {plan.highlighted && <div className="popular-badge">Most Popular</div>}

            <h3 className='plan-name'>{plan.name}</h3>
            <p className='description'>{plan.description}</p>
            
            <div className="price-tag">
              ${isAnnual ? plan.annualPrice : plan.monthlyPrice}
              <span className="period">/{isAnnual ? 'year' : 'month'}</span>
            </div>

            <hr className="card-divider" />

            <ul className='features'>
              {plan.features.map((feature, i) => (
                <li key={i}>
                  <span className="checkmark">✓</span> {feature}
                </li>
              ))}
            </ul>

            <button className="cta-button">Choose {plan.name}</button>
          </div>
        ))}
      </div>
    </div>
  );
}