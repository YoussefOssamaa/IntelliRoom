import React from 'react';
import { useNavigate } from 'react-router-dom';

const NewAndFeatured = () => {
    const navigate = useNavigate();

    // The 3 distinct editorial columns
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
        {
            id: 'new-ai-model',
            tag: 'New AI Update',
            title: 'Generating: Japandi Style',
            description: 'Our newest diffusion model update just dropped. You can now generate flawless Japanese-Scandinavian fusion interiors.',
            linkText: 'Try it in the Studio',
            targetUrl: '/upload', 
            image: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=800&q=80'
        },
        {
            id: 'new-arrivals',
            tag: 'Just Landed',
            title: 'The Spring \'26 Seating Collection',
            description: 'Curved silhouettes and sustainable fabrics. Discover the newest pieces added to the IntelliRoom marketplace this week.',
            linkText: 'Shop New Arrivals',
            targetUrl: '/marketplace/category/seating',
            image: 'https://images.unsplash.com/photo-1505693314120-0d443867891c?auto=format&fit=crop&w=800&q=80'
        }
    ];

    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-gray-200 mt-8">
            
            {/* Header */}
            <div className="mb-10">
                <h3 className="text-3xl font-extrabold text-text-primary tracking-tight">New & Featured</h3>
                <p className="text-lg text-gray-500 mt-2">Discover the latest designs, AI updates, and marketplace additions.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                {featuredItems.map((item) => (
                    <div key={item.id} className="group flex flex-col cursor-pointer" onClick={() => navigate(item.targetUrl)}>
                        
                        {/* Image Container */}
                        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-6 bg-gray-100 shadow-sm">
                            <img 
                                src={item.image} 
                                alt={item.title} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out !rounded-none"
                                style={{ borderRadius: '0px', clipPath: 'none' }}
                            />
                        </div>

                        {/* Text Content */}
                        <div className="flex flex-col flex-grow">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                                {item.tag}
                            </p>
                            
                            <h4 className="text-xl font-bold text-text-primary mb-3 group-hover:text-text-accent transition-colors leading-tight">
                                {item.title}
                            </h4>
                            
                            <p className="text-sm text-gray-600 mb-6 leading-relaxed flex-grow">
                                {item.description}
                            </p>
                            
                            {/* Call to Action Link */}
                            <div className="inline-flex items-center text-sm font-bold text-text-primary group-hover:text-text-accent transition-colors mt-auto">
                                {item.linkText}
                                <svg className="w-4 h-4 ml-1.5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                                </svg>
                            </div>
                        </div>

                    </div>
                ))}
            </div>

        </div>
    );
};

export default NewAndFeatured;