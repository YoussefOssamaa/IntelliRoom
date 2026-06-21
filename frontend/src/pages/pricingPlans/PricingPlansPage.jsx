import React, { useState, useEffect } from 'react';
import './PricingPlansPage.css';
import Footer from '../../components/common/Footer';
import Navigation from '../../components/common/Navigation';
import { useNavigate } from 'react-router-dom';
import { subscribeToPlan, getPublicPlans, getMySubscription } from '../../services/subscriptionService';

export function PricingPlansPage() {
  const [plans, setPlans] = useState([]);
  const [isAnnual, setIsAnnual] = useState(false); // رجعنا الـ State
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
        const subResponse = await getMySubscription();
        setIsLoggedIn(true);
        if (subResponse?.data?.subscription?.planId) {
          setCurrentPlanId(subResponse.data.subscription.planId._id || subResponse.data.subscription.planId);
        }
      } catch (err) {
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
      // هنا بنحدد هنبعت للباك إند شهري ولا سنوي
      const billingCycle = isAnnual ? 'yearly' : 'monthly';
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

  if (loading) return <div className="flex h-screen w-screen items-center justify-center bg-[#f0fdf4] font-body text-[#333333]">Loading plans...</div>;
  if (error) return <div className="flex justify-center p-10"><p className="text-red-500">{error}</p></div>;

  return (
    <>
      <Navigation />
      <div className='main-wrapper'>
        <div className="deco-shape" style={{ top: '-10%', right: '-5%', width: '500px', height: '500px' }} />
        <div className="deco-shape" style={{ bottom: '10%', left: '-10%', width: '400px', height: '400px', transform: 'rotate(45deg)' }} />

        <div className="header-section">
          <h1 className="main-title">Choose Your Perfect Plan</h1>
          <p className="sub-title">
            Unlock premium features and scale your design workflow.
          </p>
        </div>

        {/* رجعنا زرار الـ Toggle وشغلناه */}
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
          {plans.map((plan) => {
            const isCurrentPlan = currentPlanId === plan._id;

            // معادلة السعر: لو سنوي بنضرب في 12 وناخد 83% (يعني خصم 17%)
            const displayPrice = plan.price === 0 ? 0 :
              (isAnnual ? Math.round(plan.price * 12 * 0.83) : plan.price);

            return (
              <div key={plan._id} className={`card ${isCurrentPlan ? 'current-plan' : ''}`}>

                <h3 className='plan-name'>
                  {plan.name}
                  {isCurrentPlan && <span className="current-badge">Current</span>}
                </h3>

                <p className='description'>{plan.description || 'Access to our core design tools.'}</p>

                <div className="price-tag">
                  <span className="price-currency">EGP</span>
                  {displayPrice}
                  <span className="period">/{isAnnual ? 'yr' : 'mo'}</span>
                </div>

                <hr className="card-divider" />

                <ul className='features'>
                  <li>
                    <span className="checkmark">✓</span>
                    Render Limit: {plan.renderLimit === -1 ? 'Unlimited' : plan.renderLimit}
                  </li>
                  <li>
                    <span className="checkmark">✓</span>
                    3D Model Limit: {plan.model3DLimit === -1 ? 'Unlimited' : plan.model3DLimit}
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
                >
                  {isCurrentPlan
                    ? 'Current Plan'
                    : loadingPlan === plan._id
                      ? 'Processing...'
                      : `Choose ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <Footer />
    </>
  );
}
