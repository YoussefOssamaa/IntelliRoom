import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MarketplacePage from './screens/PluginMarketplace';
import { PricingPlansPage } from './pages/pricingPlans/PricingPlansPage';
import { PluginReviewPage } from './pages/plugins-review/PluginReviewPage';
import UploadImagePage from './pages/uploadImage/uploadImagePage';
import DashboardPage from './pages/dashboard/DashboardPage';
import LoginModal from './pages/auth/login';
import SignUpModal from './pages/auth/signUp';
import ProtectedRoute from './components/protectedRoute';

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginModal />} />
        <Route path="/signUp" element={<SignUpModal />} />
        <Route path="/test" element={
          <ProtectedRoute>
            <h1>Protected Route</h1>
          </ProtectedRoute>} 
        />
        
        <Route path="/" element={<MarketplacePage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/pricingPlans" element={<PricingPlansPage />} />
        <Route path="/pluginReview" element={<PluginReviewPage />} />
        <Route path="/upload" element={<UploadImagePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />

      </Routes>
    </Router>
  );
};

export default AppRoutes;
