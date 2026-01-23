import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MarketplacePage from './screens/PluginMarketplace';
import UploadImagePage from './screens/uploadImage';
import { PricingPlansPage } from './pages/pricingPlans/PricingPlansPage';
import { PluginReviewPage } from './pages/plugins-review/PluginReviewPage';

const AppRoutes = () => {
  return (
    <Router>
      <Routes>

        <Route path="/" element={<MarketplacePage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/pricingPlans" element={<PricingPlansPage />} />
        <Route path="/pluginReview" element={<PluginReviewPage />} />
        <Route path="/upload" element={<UploadImagePage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
