import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ProductCard from './ProductCard'; 

const RoomPage = () => {
    const { roomName } = useParams();
    
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Converts "living-room" into "Living Room" for the big header
    const displayTitle = roomName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    useEffect(() => {
        const fetchRoomProducts = async () => {
            setIsLoading(true);
            try {
                setTimeout(() => {
                    setProducts([]); 
                    setIsLoading(false);
                }, 800);
            } catch (error) {
                console.error("Failed to fetch room products:", error);
                setIsLoading(false);
            }
        };

        fetchRoomProducts();
    }, [roomName]); 

    return (
        <div className="min-h-screen bg-[#f9fafb] flex flex-col">
            
            <div className="bg-white border-b border-[#e0e0e0] pt-8 pb-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Breadcrumbs */}
                    <nav className="flex text-sm text-gray-500 mb-6">
                        <Link to="/marketplace" className="hover:text-text-accent transition-colors">Marketplace</Link>
                        <span className="mx-2">/</span>
                        <span className="text-gray-400 capitalize">Rooms</span>
                        <span className="mx-2">/</span>
                        <span className="font-medium text-text-primary">{displayTitle}</span>
                    </nav>

                    <h1 className="text-4xl md:text-5xl font-extrabold text-text-primary tracking-tight mb-4">
                        The {displayTitle} Collection
                    </h1>
                    <p className="text-lg text-gray-500 max-w-2xl">
                        Discover beautifully curated pieces designed specifically to elevate your {displayTitle.toLowerCase()}.
                    </p>
                </div>
            </div>

            <div className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                
                {isLoading ? (
                    /* Loading Skeleton */
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-text-accent"></div>
                    </div>
                ) : products.length === 0 ? (
                    
                    /* Empty State (If no products match the room yet) */
                    <div className="bg-white p-12 rounded-3xl border border-[#e0e0e0] text-center shadow-sm flex flex-col items-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                            <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-text-primary mb-2">New designs arriving soon</h2>
                        <p className="text-gray-500 max-w-md">We are currently curating the best items for the {displayTitle.toLowerCase()}. Check back later!</p>
                    </div>

                ) : (
                    
                    /* Product Grid */
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                        {products.map((product) => (
                            <ProductCard key={product._id} product={product} />
                        ))}
                    </div>
                )}

            </div>
        </div>
    );
};

export default RoomPage;