import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../config/axios.config";
// import MarketHeader from "./MarketHeader";
import Footer from "../../components/common/Footer";
import ShopByRoom from "./ShopByRoom";
// import Header from "../dashboard/Header";
import ShopByCategory from "./ShopByCategory";
import SpecialOffersSection from "./SpecialOffersSection";
import NewAndFeatured from "./NewAndFeatured";
import ProductFilter from "./ProductFilter";
import AestheticBento from "./AestheticBento";


const MarketplacePage = () => {

  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStyle, setSelectedStyle] = useState("All"); 
  const [priceRange, setPriceRange] = useState("All");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('Recommended');
  const [selectedMaterials, setSelectedMaterials] = useState([]);

  //user data
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userData, setUserData] = useState({
    name: "User.",
    plan: "Not available",
    designsUsed: 12, // Keeping hardcoded for now
    designsLimit: 20, // Keeping hardcoded for now
    credits: 0,
  });
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        //delay
        // await new Promise((resolve) => setTimeout(resolve, 4000));
        const response = await axios.get("/dashboard", {
          withCredentials: true,
        });
        if (response.data && response.data.user_name) {
          const dbUser = response.data;
          setUserData((prevState) => ({
            ...prevState,
            name: dbUser.user_name,
            plan: dbUser.plan
              ? dbUser.plan.charAt(0).toUpperCase() + dbUser.plan.slice(1)
              : "Free",
            credits: dbUser.credits,
            profilePicture: dbUser.profilePicture || null,
            initial: (dbUser.firstName || dbUser.user_name)
              .charAt(0)
              .toUpperCase(),
          }));
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsUserLoading(false);
      }
    };
    fetchUserData();
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-800 font-sans">

      <div className="relative w-full h-[450px] bg-[#f8f9fa] overflow-hidden flex items-center">
        {/* 1. Left-Aligned Fading Image */}
        <div className="absolute inset-y-0 left-0 w-[60%]">
          <img
            src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80"
            alt="Calming interior design"
            className="w-full h-full object-cover !rounded-none"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#f8f9fa]/80 to-[#f8f9fa]"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#f8f9fa]/50 to-transparent w-1/2"></div>
        </div>

        {/* 2. Content Container */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-row items-center justify-between">
          <div className="max-w-lg pr-8">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
              Design first. Shop second.
            </h2>
            <p className="text-lg text-gray-700 font-medium">
              Generate your perfect space with AI, then find the exact furniture
              to bring your vision home.
            </p>
          </div>
          <div className="flex-shrink-0">
            <button
              onClick={() => navigate("/")}
              className="bg-sky-500 hover:bg-sky-600 text-white px-8 py-4 rounded-xl text-lg font-bold shadow-sm transition-all transform hover:-translate-y-0.5"
            >
              Start AI Designing
            </button>
          </div>
        </div>
      </div>

      <SpecialOffersSection />

      <AestheticBento />

      <ShopByRoom />
  
      <ShopByCategory />
      
      <NewAndFeatured />

      <Footer />
    </div>
  );
};

export default MarketplacePage;
