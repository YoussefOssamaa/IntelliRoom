import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import MarketplacePage from './screens/PluginMarketplace';
import { PricingPlansPage } from './pages/pricingPlans/PricingPlansPage';
import { PluginReviewPage } from './pages/plugins-review/PluginReviewPage';
import UploadImagePage from './pages/uploadImage/uploadImagePage';
import DashboardPage from './pages/dashboard/DashboardPage';
import LoginModal from './pages/auth/login';
import SignUpModal from './pages/auth/signUp';
import ProtectedRoute from './components/protectedRoute';
import LandingPage from './pages/landingPage/landingPage';
import Ecomm from './pages/marketplace/MarketPlacePage';
import CategoryListingPage from './pages/marketplace/CategoryListingPage';
import ProductDetailsPage from './pages/marketplace/ProductDetailsPage';

import { ShopProvider } from './context/ShopContext';
import CartPage from './pages/marketplace/CartPage';
import MarketHeader from './pages/marketplace/MarketHeader';
import FavoritesPage from './pages/marketplace/FavoritesPage';


const MarketplaceLayout = () => {
  return (
    <ShopProvider>
      <MarketHeader />
      <Outlet /> 
    </ShopProvider>
  )
}

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
        <Route path="/pluginReview/:id" element={<PluginReviewPage />} />

        <Route element={<MarketplaceLayout />}>
            <Route path="/ecomm" element={<Ecomm />} />
            <Route path="/ecomm/product/:slug" element={<ProductDetailsPage />} />
            <Route path="/ecomm/category/:categoryId" element={<CategoryListingPage />} />
            <Route path="/ecomm/cart" element={<CartPage />} />
            <Route path="/ecomm/wishlist" element={<FavoritesPage user={null} />} />
            <Route path="/marketplace/room/:roomName" element={<RoomPage />} />
      </Route>


        <Route path="/upload" element={<UploadImagePage />} />
        <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>} 
        />

      </Routes>
    </Router>
  
  );
};

export default AppRoutes;
