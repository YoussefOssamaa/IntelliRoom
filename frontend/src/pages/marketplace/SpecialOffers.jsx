import React from 'react';
import { useNavigate } from 'react-router-dom';

const SpecialOffers = () => {
    const navigate = useNavigate();

    const saleProducts = [
        {
            id: 'p1',
            name: 'Astral Velvet Sofa',
            category: 'Seating',
            originalPrice: 1299,
            currentPrice: 899,
            image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80'
        },
        {
            id: 'p2',
            name: 'Lumina Floor Lamp',
            category: 'Lighting',
            originalPrice: 349,
            currentPrice: 199,
            image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=600&q=80'
        },
        {
            id: 'p3',
            name: 'Raw Edge Coffee Table',
            category: 'Tables',
            originalPrice: 550,
            currentPrice: 420,
            image: 'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?auto=format&fit=crop&w=600&q=80'
        },
        {
            id: 'p4',
            name: 'Aero Mesh Lounge Chair',
            category: 'Seating',
            originalPrice: 899,
            currentPrice: 650,
            image: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=600&q=80'
        },
        {
            id: 'p5',
            name: 'Minimalist Oak Desk',
            category: 'Tables',
            originalPrice: 450,
            currentPrice: 320,
            image: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=600&q=80'
        },
        {
            id: 'p6',
            name: 'Cloud Boucle Accent Chair',
            category: 'Seating',
            originalPrice: 650,
            currentPrice: 499,
            image: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=600&q=80'
        },
        {
            id: 'p7',
            name: 'Geometric Pendant Light',
            category: 'Lighting',
            originalPrice: 180,
            currentPrice: 120,
            image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=600&q=80'
        },
        {
            id: 'p8',
            name: 'Woven Arched Cabinet',
            category: 'Storage',
            originalPrice: 1100,
            currentPrice: 850,
            image: 'https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?auto=format&fit=crop&w=600&q=80'
        }
    ];

    const calculateDiscount = (original, current) => {
        return Math.round(((original - current) / original) * 100);
    };

    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            
            {/* Header & Action Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 gap-4">
                <div>
                    <h3 className="text-3xl font-extrabold text-text-primary tracking-tight">Top Picks on Sale</h3>
                    <p className="text-lg text-gray-500 mt-2">Hand-selected pieces at unbeatable prices.</p>
                </div>
                
                <button 
                    onClick={() => navigate('/special-offers')}
                    className="btn-primary flex items-center shadow-sm" 
                    style={{ padding: '10px 24px' }}
                >
                    Explore All Deals
                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                    </svg>
                </button>
            </div>

         
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                {saleProducts.map((product) => (
                    <div key={product.id} className="group cursor-pointer flex flex-col">
                        
                        {/* Product Image & Badge */}
                        <div className="relative aspect-square rounded-2xl overflow-hidden mb-4 bg-gray-100">
                            <img 
                                src={product.image} 
                                alt={product.name} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 !rounded-none"
                                style={{ borderRadius: '0px', clipPath: 'none' }}
                            />
                            {/* Discount Badge */}
                            <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-sm">
                                {calculateDiscount(product.originalPrice, product.currentPrice)}% OFF
                            </div>
                            
                            {/* Quick Add Button */}
                            <button className="absolute bottom-3 right-3 bg-white p-2.5 rounded-full shadow-md text-text-primary opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 hover:text-text-accent">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                            </button>
                        </div>

                        {/* Product Info */}
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{product.category}</p>
                            
                            <h4 className="text-base font-bold text-text-primary group-hover:text-text-accent transition-colors line-clamp-1">
                                {product.name}
                            </h4>
                            
                            {/* Pricing Row */}
                            <div className="mt-2 flex items-center gap-2">
                                <span className="text-lg font-extrabold text-text-primary">
                                    ${product.currentPrice}
                                </span>
                                <span className="text-sm font-medium text-gray-400 line-through">
                                    ${product.originalPrice}
                                </span>
                            </div>
                        </div>

                    </div>
                ))}
            </div>

        </div>
    );
};

export default SpecialOffers;