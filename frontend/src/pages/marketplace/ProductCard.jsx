import React from "react";
import { Link } from "react-router-dom";
import { useShop } from "../../context/ShopContext";

const ProductCard = ({ product }) => {
  const { cart, favorites, toggleCart, toggleFavorite } = useShop();

  const isInCart = cart.some((item) => item._id === product._id);
  const isFavorite = favorites.some((item) => item._id === product._id);

  const handleCartClick = (e) => {
    e.preventDefault();
    toggleCart(product);
  };

  const handleFavoriteClick = (e) => {
    e.preventDefault();
    toggleFavorite(product);
  };

  return (
    <div className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-[#e0e0e0]/50 hover:shadow-xl hover:border-text-accent/30 transition-all duration-300">
      <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
        {/* Standardized to /ecomm/ */}
        <Link
          to={`/ecomm/product/${product.slug}`}
          className="block w-full h-full"
        >
          <img
            src={product.media?.primaryImage}
            alt={product.name}
            className="absolute top-0 left-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out !rounded-none"
          />
        </Link>

        {/* Sale Badge */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 pointer-events-none z-10">
          {product.pricing?.isOnSale && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
              SALE
            </span>
          )}
        </div>

        <div className="absolute bottom-3 right-3 flex flex-col gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 z-10">
          {/* Favorite Button */}
          <div className="relative group/wishlist flex items-center justify-end">
            <span className="absolute right-full mr-3 px-2.5 py-1.5 bg-gray-900 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-md whitespace-nowrap opacity-0 translate-x-2 group-hover/wishlist:opacity-100 group-hover/wishlist:translate-x-0 transition-all duration-200 pointer-events-none">
              {isFavorite ? "Added to favorites!" : "Add to Favorites"}
              <div className="absolute top-1/2 -right-1 -mt-1 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-4 border-l-gray-900"></div>
            </span>

            <button
              onClick={handleFavoriteClick}
              className={`relative p-2 rounded-full shadow-md transition-colors ${
                isFavorite
                  ? "bg-red-50 text-red-500"
                  : "bg-white text-gray-400 hover:text-red-500 hover:bg-red-50"
              }`}
            >
              <svg
                className="w-5 h-5"
                fill={isFavorite ? "currentColor" : "none"}
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                ></path>
              </svg>
            </button>
          </div>

          {/* Cart Button */}
          <div className="relative group/cart flex items-center justify-end">
            <span className="absolute right-full mr-3 px-2.5 py-1.5 bg-gray-900 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-md whitespace-nowrap opacity-0 translate-x-2 group-hover/cart:opacity-100 group-hover/cart:translate-x-0 transition-all duration-200 pointer-events-none">
              {isInCart ? "Added to cart!" : "Add to Cart"}
              <div className="absolute top-1/2 -right-1 -mt-1 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-4 border-l-gray-900"></div>
            </span>

            <button
              onClick={handleCartClick}
              className={`relative p-2 rounded-full shadow-md transition-colors duration-300 ${
                isInCart
                  ? "bg-blue-50 text-blue-500"
                  : "bg-white text-text-primary hover:text-white hover:bg-text-accent"
              }`}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                {isInCart ? (
                  <svg
                    className="w-5 h-5 animate-[bounce_0.3s_ease-in-out]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3"
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    ></path>
                  </svg>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Standardized to /ecomm/ */}
      <Link
        to={`/ecomm/product/${product.slug}`}
        className="p-4 flex flex-col flex-grow block"
      >
        <div className="flex items-center gap-1 mb-2">
          <svg
            className="w-4 h-4 text-yellow-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
          </svg>
          <span className="text-xs font-bold text-gray-700">
            {product.social?.averageRating || "0.0"}
          </span>
          <span className="text-xs text-gray-400">
            ({product.social?.reviewCount || 0})
          </span>
        </div>

        {/* 🚀 Safely extracts the Category Name from the populated model */}
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
          {product.categorization?.primary?.name ||
            product.categorization?.primary ||
            "Furniture"}
        </div>

        <h3 className="text-sm font-bold text-text-primary group-hover:text-text-accent transition-colors line-clamp-2 mb-1 flex-grow">
          {product.name}
        </h3>

        <div className="mt-2 flex items-center gap-2">
          <span className="text-base font-extrabold text-text-primary">
            ${product.pricing?.currentPrice}
          </span>
          {product.pricing?.isOnSale && (
            <span className="text-xs font-medium text-gray-400 line-through">
              ${product.pricing?.originalPrice}
            </span>
          )}
        </div>
      </Link>
    </div>
  );
};

export default ProductCard;
