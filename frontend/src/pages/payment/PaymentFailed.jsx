import React from 'react';
import { useNavigate } from 'react-router-dom';

const PaymentFailed = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-md w-full text-center">
        
        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-rose-100 text-rose-600 mb-6">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>
        
        <h1 className="text-2xl font-extrabold text-slate-900 mt-6">Payment Failed</h1>
        <p className="text-slate-500 mt-2">
          We couldn't process your payment. Please check your card details or try a different payment method.
        </p>
        
        <button 
          onClick={() => navigate('/pricingPlans')}
          className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md font-medium w-full mt-8"
        >
          Try Again
        </button>
        
        <button 
          onClick={() => navigate('/')}
          className="border-2 border-slate-200 text-slate-600 bg-transparent px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors w-full mt-3 font-medium"
        >
          Go to Home
        </button>
      </div>
    </div>
  );
};

export default PaymentFailed;