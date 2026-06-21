import React, { useState, useEffect } from 'react';
import './PricingPlansPage.css';
import Footer from '../../components/common/Footer';
import { useNavigate } from 'react-router-dom';
import Navigation from '../../components/common/Navigation';

import { subscribeToPlan, getPublicPlans, getMySubscription } from '../../services/subscriptionService';

export function PricingPlansPage() {
  const [plans, setPlans] = useState([]);
  const [isAnnual, setIsAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getPublicPlans();
        setPlans(response.data || []);
      } catch (err) {
        setError(err.message || 'Error fetching plans');
      }

      try {
        // Attempt to fetch current user's subscription
        const subResponse = await getMySubscription();
        setIsLoggedIn(true); // If this succeeds, the user is logged in
        if (subResponse?.data?.subscription?.planId) {
          setCurrentPlanId(subResponse.data.subscription.planId._id || subResponse.data.subscription.planId);
        }
      } catch (err) {
        // Request fails (e.g., 401 Unauthorized), meaning user is not logged in
        setIsLoggedIn(false);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubscribe = async (planId) => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }

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
      <Navigation />
      <div className='main-wrapper'>
        <div
          className="deco-shape"
          style={{
            top: "-22%",
            right: "-32%",
            width: "600px",
            height: "600px",
            backgroundColor: "#D946EF",
            opacity: "0.15",
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
          <span className={`label-text EGP {!isAnnual ? 'active-text' : ''}`}>Monthly</span>

          <div
            className={`toggle-switch EGP {isAnnual ? 'active' : ''}`}
            onClick={() => setIsAnnual(!isAnnual)}
          >
            <div className="switch-knob"></div>
          </div>

          <span className={`label-text EGP {isAnnual ? 'active-text' : ''}`}>Annual</span>

          <span className={`save-badge EGP {isAnnual ? 'active-save-badge' : ''}`}>Save 17%</span>
        </div>

        <div className='cards-container'>
          {plans.map((plan) => {
            const isCurrentPlan = currentPlanId === plan._id;

            return (
              <div
                key={plan._id}
                className={`card EGP {isCurrentPlan ? 'border-2 border-indigo-500' : ''}`}
              >
                <h3 className='plan-name'>
                  {plan.name}
                  {isCurrentPlan && (
                    <span className="ml-2 text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full align-middle">
                      Current
                    </span>
                  )}
                </h3>
                <p className='description'>{plan.description || ''}</p>

                <div className="price-tag">
                  EGP {plan.price}
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
                  disabled={loadingPlan === plan._id || isCurrentPlan}
                  style={isCurrentPlan ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                >
                  {isCurrentPlan ? 'Current Plan' : loadingPlan === plan._id ? 'Processing...' : `Choose EGP {plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
        <Footer />
      </div>
    </>
  );
}
