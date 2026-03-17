import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MarketplacePage from './screens/PluginMarketplace';
import { PricingPlansPage } from './pages/pricingPlans/PricingPlansPage';
import { PluginReviewPage } from './pages/plugins-review/PluginReviewPage';
import UploadImagePage from './pages/uploadImage/UploadImagePage.jsx';
import DashboardPage from './pages/dashboard/DashboardPage';
import LoginModal from './pages/auth/login';
import SignUpModal from './pages/auth/signUp';
import ProtectedRoute from './components/protectedRoute';
import LandingPage from './pages/landingPage/landingPage';
import PlannerPage from './pages/planner/PlannerPage';
import { UpdateProfile } from './pages/updateProfile/updateProfile';


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
        
        <Route path="/" element={<LandingPage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/pricingPlans" element={<PricingPlansPage />} />
        <Route path="/marketplace/pluginReview/:id" element={<PluginReviewPage />} />
        <Route path="/upload" element={<UploadImagePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/updateProfile" element={<UpdateProfile />} />
        <Route path="/planner" element={<PlannerPage />} />

      </Routes>
    </Router>
  );
};

export default AppRoutes;
