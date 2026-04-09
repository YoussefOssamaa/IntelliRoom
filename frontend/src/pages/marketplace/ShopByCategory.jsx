import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const ShopByCategory = () => {
    const navigate = useNavigate();
    const sliderRef = useRef(null);

    const slide = (direction) => {
        if (sliderRef.current) {
            const slideAmount = sliderRef.current.clientWidth / 2; 
            sliderRef.current.scrollBy({
                left: direction === 'left' ? -slideAmount : slideAmount,
                behavior: 'smooth'
            });
        }
    };

    // The Category Data
    const categories = [
        { 
            id: 'seating', 
            name: 'Seating', 
            itemCount: '1,240 items',
            image: 'https://images.unsplash.com/photo-1506898667547-42e22a46e125?auto=format&fit=crop&w=600&q=80' 
        },
        { 
            id: 'tables', 
            name: 'Tables', 
            itemCount: '850 items',
            image: 'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?auto=format&fit=crop&w=600&q=80' 
        },
        { 
            id: 'lighting', 
            name: 'Lighting', 
            itemCount: '620 items',
            image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=600&q=80' 
        },
        { 
            id: 'decor', 
            name: 'Decor & Accents', 
            itemCount: '2,100 items',
            image: 'https://images.unsplash.com/photo-1513161455079-7dc1de15ef3e?auto=format&fit=crop&w=600&q=80' 
        },
        { 
            id: 'storage', 
            name: 'Storage', 
            itemCount: '430 items',
            image: 'https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?auto=format&fit=crop&w=600&q=80' 
        }
    ];

    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            
            {/* Header & Controls */}
            <div className="flex items-end justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Shop by Category</h2>
                    <p className="mt-2 text-lg text-gray-500">Find the perfect piece for your space.</p>
                </div>
                
                {/* Custom Left/Right Navigation Buttons */}
                <div className="hidden md:flex space-x-3">
                    <button 
                        onClick={() => slide('left')}
                        className="p-3 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-sky-50 hover:text-sky-500 hover:border-sky-200 transition-all shadow-sm"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <button 
                        onClick={() => slide('right')}
                        className="p-3 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-sky-50 hover:text-sky-500 hover:border-sky-200 transition-all shadow-sm"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                    </button>
                </div>
            </div>

            {/* The Slider Container */}
            <div 
                ref={sliderRef}
                className="flex gap-4 sm:gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-8"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {categories.map((category) => (
                    <div 
                        key={category.id} 
                        className="relative min-w-[75%] sm:min-w-[45%] md:min-w-[30%] lg:min-w-[22%] aspect-[4/5] rounded-3xl overflow-hidden snap-center group cursor-pointer shadow-md hover:shadow-xl transition-shadow"
                        onClick={() => navigate(`/ecomm/category/${category.id}`)} 
                    >
                        <img 
                            src={category.image} 
                            alt={category.name} 
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out !rounded-none"
                            style={{ borderRadius: '0px', clipPath: 'none' }}
                        />
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/10 to-transparent"></div>

                        <div className="absolute bottom-0 left-0 p-6 w-full">
                            <h3 className="text-2xl font-extrabold text-white tracking-tight mb-1 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                {category.name}
                            </h3>
                            <p className="text-sm text-sky-300 font-medium opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 delay-75">
                                {category.itemCount}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
            
        </div>
    );
};

export default ShopByCategory;