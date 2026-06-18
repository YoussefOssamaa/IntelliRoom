import React from 'react';
import { useNavigate } from 'react-router-dom';

const PaymentSuccess = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-md w-full text-center">
        
        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-emerald-100 text-emerald-600 mb-6">
          <svg className="w-10 h-10 animate-[bounce_1s_ease-in-out]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        
        <h1 className="text-2xl font-extrabold text-slate-900 mt-6">Payment Successful!</h1>
        <p className="text-slate-500 mt-2">
          Your subscription has been activated successfully. Welcome to IntelliRoom premium features!
        </p>
        
        <button 
          onClick={() => navigate('/dashboard')}
          className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md font-medium w-full mt-8"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccess;