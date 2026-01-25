import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MarketplacePage from './screens/PluginMarketplace';
import { PricingPlansPage } from './pages/pricingPlans/PricingPlansPage';
import { PluginReviewPage } from './pages/plugins-review/PluginReviewPage';
import UploadImagePage from './screens/uploadImage';
import LoginModal from './pages/auth/login';

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginModal />} />
        <Route path="/" element={<MarketplacePage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/pricingPlans" element={<PricingPlansPage />} />
        <Route path="/pluginReview" element={<PluginReviewPage />} />
        <Route path="/upload" element={<UploadImagePage />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
