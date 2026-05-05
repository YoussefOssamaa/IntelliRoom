import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
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
import CategoryPage from "./pages/marketplace/CategoryPage";
import ProductDetailsPage from "./pages/marketplace/ProductDetailsPage";

import PlannerPage from "./pages/planner/PlannerPage";
import { UpdateProfile } from "./pages/updateProfile/updateProfile";
import { Community } from "./pages/community/community";
import Checkout from "./pages/checkout/Checkout";

import { ShopProvider } from "./context/ShopContext";
import CartPage from "./pages/marketplace/CartPage";
import MarketHeader from "./pages/marketplace/MarketHeader";
import FavoritesPage from "./pages/marketplace/FavoritesPage";
import RoomPage from "./pages/marketplace/RoomPage";
import CheckoutPage from "./pages/marketplace/CheckoutPage";

import AdminLayout from "./pages/marketplace/admin/AdminLayout";
import AdminProductsPage from "./pages/marketplace/admin/AdminProductsPage";
import AdminProductGridPage from "./pages/marketplace/admin/AdminProductGridPage";
import AdminProductCreatePage from "./pages/marketplace/admin/AdminProductCreatePage";
import AdminProductEditPage from "./pages/marketplace/admin/AdminProductEditPage";
import AdminCategoriesPage from "./pages/marketplace/admin/AdminCategoriesPage";
import AdminCategoryCreatePage from "./pages/marketplace/admin/AdminCategoryCreatePage";
import AdminCategoryEditPage from "./pages/marketplace/admin/AdminCategoryEditPage";
import AdminRoomsPage from './pages/marketplace/admin/AdminRoomsPage';
import AdminOrdersPage from './pages/marketplace/admin/AdminOrdersPage';
import SearchInput from  "./components/common/SearchInput";
import AdminRoomFormPage from "./pages/marketplace/admin/AdminRoomFormPage";


const MarketplaceLayout = () => {
  return (
    <ShopProvider>
      <MarketHeader />
      <Outlet />
    </ShopProvider>
  );
};

const AppRoutes = () => {
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
            element={<CategoryPage />}
          />
          <Route path="/ecomm/cart" element={<CartPage />} />
          <Route
            path="/ecomm/wishlist"
            element={<FavoritesPage user={null} />}
          />
          <Route path="/ecomm/room/:roomName" element={<RoomPage />} />
          <Route path="/ecomm/checkout" element={<CheckoutPage />} />
        </Route>

        {/* The Private Admin Dashboard */}
        <Route path="/ecomm/admin" element={<AdminLayout />}>
          {/* <Route index element={<AdminOverview />} /> */}

          <Route
            index
            element={
              <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <h1 className="text-3xl font-bold text-gray-400 mb-2">
                  Dashboard Overview
                </h1>
                <p className="text-gray-500">
                  Analytics and metrics will go here soon!
                </p>
              </div>
            }
          />
          <Route path="products/list" element={<AdminProductsPage />} />
          <Route path="products/grid" element={<AdminProductGridPage />} />
          <Route path="products/create" element={<AdminProductCreatePage />} />
          <Route path="products/edit/:slug" element={<AdminProductEditPage />} />
          <Route path="categories/list" element={<AdminCategoriesPage />} />
          <Route path="categories/create" element={<AdminCategoryCreatePage />} />
          <Route path="categories/edit/:id?" element={<AdminCategoryEditPage />} />
          <Route path="rooms" element={<AdminRoomsPage />} />
          <Route path="rooms/create" element={<AdminRoomFormPage />} />
          <Route path="rooms/edit/:id" element={<AdminRoomFormPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="search" element={<SearchInput />} />
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

        <Route
          path="/marketplace/pluginReview/:id"
          element={<PluginReviewPage />}
        />
        <Route path="/upload" element={<UploadImagePage />} />
        {/* <Route path="/dashboard" element={<DashboardPage />} /> */}
        <Route path="/updateProfile" element={<UpdateProfile />} />
        <Route path="/planner" element={<PlannerPage />} />
        <Route path="/community" element={<Community />} />
        <Route path="/checkout" element={<Checkout />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
