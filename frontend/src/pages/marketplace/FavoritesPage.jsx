import React from 'react';
import { Link } from 'react-router-dom';
import { useShop } from '../../context/ShopContext'; 
import ProductCard from './ProductCard'; 

const FavoritesPage = () => {
    const { user, favorites } = useShop();


    return (
        <div className="min-h-screen bg-[#f9fafb] flex flex-col">
            <div className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                
                <h1 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight mb-8">
                    Your Favorites
                </h1>

                {/* If there is no user */}
                {!user && (
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-8 rounded-r-xl shadow-sm flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
                        <div className="flex items-center gap-3">
                            <svg className="w-6 h-6 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <p className="text-sm text-amber-800 font-medium">
                                <strong className="font-extrabold text-amber-900">Guest Mode:</strong> Your favorites list is temporary. Log in or sign up to make sure your list will be here when you come back!
                            </p>
                        </div>
                        <div className="flex gap-3 shrink-0">
                            <Link to="/login" className="px-4 py-2 bg-white text-amber-700 text-sm font-bold rounded-lg border border-amber-200 hover:bg-amber-50 transition-colors shadow-sm">
                                Log In
                            </Link>
                            <Link to="/signup" className="px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors shadow-sm">
                                Sign Up
                            </Link>
                        </div>
                    </div>
                )}

                {favorites.length === 0 ? (
                    <div className="bg-white p-12 rounded-3xl border border-[#e0e0e0] text-center shadow-sm flex flex-col items-center">
                        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6">
                            <svg className="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-text-primary mb-2">You haven't saved any favorites yet</h2>
                        <p className="text-gray-500 mb-8 max-w-md">Tap the heart icon on any product to save it here for later.</p>
                        <Link to="/marketplace" className="bg-text-accent text-white font-bold py-3 px-8 rounded-xl shadow-md hover:bg-blue-600 hover:shadow-lg transition-all duration-300">
                            Discover Products
                        </Link>
                    </div>
                ) : (
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                        {favorites.map((product) => (
                            <ProductCard key={product._id} product={product} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FavoritesPage;