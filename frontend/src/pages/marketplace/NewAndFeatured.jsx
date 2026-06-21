import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../config/axios.config'; 

const NewAndFeatured = () => {
    const navigate = useNavigate();

    const [newProducts, setNewProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchNewArrivals = async () => {
            try {
                const response = await axios.get('/products?limit=8');
                const fetched = response.data.data || response.data;
                
                if (Array.isArray(fetched)) {
                    setNewProducts(fetched.slice(0, 8));
                }
            } catch (error) {
                console.error("Failed to fetch new products:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchNewArrivals();
    }, []);

    // 🚀 NEW LOGIC: Vertical Rectangles!
    // We alternate row-span-2 (Tall) and row-span-1 (Square)
    const getGridClass = (index) => {
        // Indices 1, 3, 4, and 6 will be tall vertical rectangles
        if (index === 1 || index === 3 || index === 4 || index === 6) {
            return 'row-span-2'; 
        }
        // The rest will be perfect squares
        return 'row-span-1';
    };

    /* =========================================================================
       OLD CODE - PRESERVED AND COMMENTED OUT
       =========================================================================
    const featuredItems = [
        {
            id: 'community-spotlight',
            tag: 'Community Spotlight',
            title: 'living room interior design',
            description: 'Designed by @sarah_designs. See how she perfectly blended natural wood textures with our new indoor plant assets.',
            linkText: 'more community designs',
            targetUrl: '/marketplace/room/biophilic-loft',
            image: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80'
        },
        ...
    ];
    ========================================================================= */

    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-gray-200 mt-8">
            
            {/* Header */}
            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">New Arrivals</h3>
                    <p className="text-lg text-gray-500 mt-2">Discover the latest pieces added to the marketplace.</p>
                </div>
                <button 
                    onClick={() => navigate('/ecomm')}
                    className="text-sky-600 hover:text-sky-700 font-bold tracking-wide transition-colors"
                >
                    SHOP ALL NEW
                </button>
            </div>

            {/* 🚀 NEW GRID LAYOUT: 
                - grid-cols-2 on mobile, grid-cols-4 on desktop
                - grid-flow-dense perfectly packs the squares into the gaps 
                - auto-rows-[250px] forces a strict height so math works out perfectly
            */}
            {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[250px] grid-flow-dense">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((skeleton, index) => (
                        <div key={skeleton} className={`bg-gray-200 animate-pulse ${getGridClass(index)}`}></div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[250px] grid-flow-dense">
                    {newProducts.map((product, index) => (
                        <div 
                            key={product._id} 
                            onClick={() => navigate(`/ecomm/product/${product.slug}`)}
                            className={`group relative overflow-hidden rounded-none cursor-pointer border border-gray-200 ${getGridClass(index)}`}
                        >
                            {/* Product Image */}
                            <img 
                                src={product.media?.primaryImage || '/images/default-product.jpg'} 
                                alt={product.name} 
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            
                            {/* Dark gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>

                            {/* Top Left Tag */}
                            <div className="absolute top-4 left-4 flex gap-2">
                                <span className="bg-white text-gray-900 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-none shadow-sm">
                                    NEW
                                </span>
                            </div>

                            {/* Product Info (Bottom Left) */}
                            <div className="absolute bottom-0 left-0 p-5 flex flex-col w-full">
                                <p className="text-sky-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">
                                    {product.categorization?.primary?.name || "Furniture"}
                                </p>
                                <h4 className="text-white text-lg sm:text-xl font-bold line-clamp-1 mb-1">
                                    {product.name}
                                </h4>
                                <div className="flex items-center gap-3">
                                    <span className="text-white font-extrabold text-base sm:text-lg">
                                        ${product.pricing?.currentPrice}
                                    </span>
                                    {product.pricing?.isOnSale && (
                                        <span className="text-gray-400 font-medium text-xs sm:text-sm line-through">
                                            ${product.pricing?.originalPrice}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default NewAndFeatured;