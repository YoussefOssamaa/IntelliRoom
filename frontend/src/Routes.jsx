import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
  Navigate // Fixed missing import
} from "react-router-dom";

import MarketplacePage from "./screens/PluginMarketplace";
import { PricingPlansPage } from "./pages/pricingPlans/PricingPlansPage";
import { PluginReviewPage } from "./pages/plugins-review/PluginReviewPage";
import UploadImagePage from "./pages/uploadImage/uploadImagePage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import LoginModal from "./pages/auth/login";
import SignUpModal from "./pages/auth/signUp";
import ProtectedRoute from "./components/protectedRoute";
import LandingPage from "./pages/landingPage/landingPage";
import Ecomm from "./pages/marketplace/MarketPlacePage";
import CategoryListingPage from "./pages/marketplace/CategoryListingPage";
import ProductDetailsPage from "./pages/marketplace/ProductDetailsPage";
import PlannerPage from "./pages/planner/PlannerPage";
import { UpdateProfile } from "./pages/updateProfile/updateProfile";
import { Community } from "./pages/community/community";
import Checkout from "./pages/checkout/Checkout";
import { ShopProvider } from "./context/ShopContext";
import CartPage from "./pages/marketplace/CartPage";
import MarketHeader from "./pages/marketplace/MarketHeader";
import FavoritesPage from "./pages/marketplace/FavoritesPage";
// import RoomPage from "./pages/marketplace/RoomPage"; // Add correct path to RoomPage

import AdminLogin from "./pages/admin/AdminLogin";
import UsersDashboard from "./pages/admin/UsersDashboard";
import ManageAdmins from "./pages/admin/ManageAdmins";
import AdminLogs from "./pages/admin/AdminLogs";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute"; 
import AdminLayout from "./layouts/AdminLayout"; 

const MarketplaceLayout = () => {
  return (
    <ShopProvider>
      <MarketHeader />
      <Outlet />
    </ShopProvider>
  );
};

const AppRoutes = () => {
  const hostname = window.location.hostname;

  const isAdminSubdomain = hostname.split(".")[0] === "admin" || hostname === "admin.localhost";
  
  if (isAdminSubdomain) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<AdminLogin />} />

          <Route element={<ProtectedAdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/dashboard/users" element={<UsersDashboard />} />
              <Route path="/manage-admins" element={<ManageAdmins />} />
              <Route path="/logs" element={<AdminLogs />} />
            </Route>
          </Route>

          <Route
            path="*"
            element={<Navigate to="/dashboard/users" replace />}
          />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginModal />} />
        <Route path="/signUp" element={<SignUpModal />} />
        <Route
          path="/test"
          element={
            <ProtectedRoute>
              <h1>Protected Route</h1>
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<LandingPage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/pricingPlans" element={<PricingPlansPage />} />
        <Route path="/pluginReview/:id" element={<PluginReviewPage />} />

        <Route element={<MarketplaceLayout />}>
          <Route path="/ecomm" element={<Ecomm />} />
          <Route path="/ecomm/product/:slug" element={<ProductDetailsPage />} />
          <Route
            path="/ecomm/category/:categoryId"
            element={<CategoryListingPage />}
          />
          <Route path="/ecomm/cart" element={<CartPage />} />
          <Route
            path="/ecomm/wishlist"
            element={<FavoritesPage user={null} />}
          />
          {/* Ensure RoomPage is imported at the top */}
          <Route path="/marketplace/room/:roomName" element={<RoomPage />} />
        </Route>

        <Route path="/upload" element={<UploadImagePage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route path="/updateProfile" element={<UpdateProfile />} />
        <Route path="/planner" element={<PlannerPage />} />
        <Route path="/community" element={<Community />} />
        <Route path="/checkout" element={<Checkout />} />

      </Routes>
    </Router>
  );
};

export default AppRoutes;