import axios from '../../config/axios.config';
import { useParams, useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import './PluginReviewPage.css';
import pluginImg from './robot.avif';

const StarRating = ({ rating }) => {
    return (
        <div className="star-row">
            {[...Array(5)].map((_, index) => {
                const isFilled = index < rating;

                return (
                    <span key={index} className={`star ${isFilled ? 'filled' : 'empty'}`}>
                        &#9733;
                    </span>
                );
            })}
        </div>
    );
};



export function PluginReviewPage() {

    const { id } = useParams();
    const navigate = useNavigate();


    const [loading, setLoading] = useState(true);
    const [plugin, setPlugin] = useState(null);
    const [error, setError] = useState(null);
    const [isFollowing, setIsFollowing] = useState(false);

    useEffect(() => {
        const fetchPluginData = async () => {
            try {
                // await new Promise(resolve => setTimeout(resolve, 1000)); artificial delay
                const response = await axios.get(`/plugins/${id}`);
                setPlugin(response.data);
            } catch (err) {
                console.error("Error fetching plugin:", err);
                setError("Failed to load plugin details.");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchPluginData();
        } else {
            setLoading(false);
            setError("No plugin ID provided in the URL.");
        }
    }, [id]);

    useEffect(() => {
        // Dynamic tab title based on the plugin name
        document.title = plugin ? `${plugin.plugin_name} | IntelliRoom` : "Plugin Review | IntelliRoom";
    }, [plugin]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#f8f9fa]">
                
                <div className="relative flex items-center justify-center">
                    
                    <div className="w-24 h-24 rounded-full border-4 border-[#e0e0e0] border-t-[#00e676] animate-spin"></div>
                    
                    <span className="absolute text-sm font-bold text-[#333333] animate-pulse">
                        Loading
                    </span>
                    
                </div>
                
            </div>
        );
    }

    if (error) return <div className="text-center mt-20 text-red-500">{error}</div>;
    if (!plugin) return <div className="text-center mt-20">Plugin not found.</div>;

    const mockReviews = [
        { user_name: "Sarah Jenkins", rating: 5, comment: "Absolutely incredible! The AI lighting adjustments saved me hours of manual tweaking. A must-have for modern living room concepts." },
        { user_name: "Marcus T.", rating: 4, comment: "Really solid texture pack. I just wish there were a few more options for hardwood floors, but otherwise it works seamlessly." },
        { user_name: "Elena Rostova", rating: 5, comment: "The 3D rendering speed on this plugin is unmatched. My clients were blown away by the live preview feature." },
        { user_name: "David Chen", rating: 5, comment: "Worth every single credit. Completely transformed my workflow." }
    ];

    return (

        <div className='main-container'>
            <div className="review-page-container">

                <div className="visual-side relative" style={{ padding: 0, overflow: 'hidden' }}>
                    {plugin.image_url ? (
                        <>
                            {/* 1. Full Bleed Background Image */}
                            <img
                                src={plugin.image_url}
                                alt={plugin.plugin_name}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                            />
                            
                            {/* 2. Soft Gradient Overlay (Ensures text is readable on bright images) */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"></div>

                            {/* 3. The Glassmorphism Floating Panel */}
                            <div className="absolute bottom-8 left-8 right-8 z-10 p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.2)] flex justify-between items-center">
                                <div>
                                    <span className="px-3 py-1 bg-black/40 text-white/90 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-sm border border-white/10 mb-2 inline-block">
                                        Render Preview
                                    </span>
                                    <h3 className="text-white text-2xl font-bold drop-shadow-lg">
                                        Interactive View
                                    </h3>
                                </div>
                                
                                {/* Frosted Glass Button */}
                                <button className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl backdrop-blur-lg border border-white/40 transition-all duration-300 shadow-lg flex items-center gap-2 group">
                                    <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                    Live Preview
                                </button>
                            </div>
                        </>
                    ) : (
                        // Fallback if no image exists
                        <div className="w-full h-full flex flex-col items-center justify-center bg-[#e1e4e8] text-[#7f8c8d]">
                            <svg className="w-16 h-16 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            <h3 className="text-xl font-medium">No Preview Available</h3>
                        </div>
                    )}
                </div>

                <div className="info-side">
                    <div className="info-content">
                        {/* Title and Author */}
                        <h2 style={{ fontSize: '2rem', marginBottom: '10px', color: '#111827' }}>
                            {plugin.plugin_name}
                        </h2>
                        <div className='follow-row' style={{ marginBottom: '20px' }}>
                            <h4 className='owner-name' style={{ color: '#6B7280', fontWeight: 'normal' }}>
                                by <span style={{ color: '#111827', fontWeight: 'bold' }}>{plugin.plugin_author?.user_name || "Unknown Author"}</span>
                            </h4>
                            <button className={`follow-btn ${isFollowing ? 'following' : ''}`}
                                onClick={() => setIsFollowing(!isFollowing)}>
                                {isFollowing ? 'Following' : 'Follow'}
                            </button>
                        </div>

                        {/* bento box stats */}
                        <div className="grid grid-cols-2 gap-3 my-6">
                            {/* Price Box (Spans both columns) */}
                            <div className="col-span-2 bg-[#EEF2FF] p-5 rounded-2xl flex items-center justify-between border border-[#E0E7FF] shadow-sm">
                                <span className="text-[#4F46E5] font-semibold text-lg">Price</span>
                                <span className="text-[#4338CA] font-extrabold text-2xl">
                                    {plugin.plugin_price === 0 ? "Free" : `${plugin.plugin_price} Credits`}
                                </span>
                            </div>

                            {/* Rating Box */}
                            <div className="bg-[#F9FAFB] p-4 rounded-2xl flex flex-col items-center justify-center border border-[#F3F4F6] shadow-sm">
                                <span className="text-[#6B7280] text-sm font-medium mb-1">Rating</span>
                                <span className="text-[#111827] font-bold text-xl flex items-center gap-1">
                                    <span className="text-[#F59E0B]">&#9733;</span> {plugin.plugin_rating}
                                </span>
                            </div>

                            {/* Downloads Box */}
                            <div className="bg-[#F9FAFB] p-4 rounded-2xl flex flex-col items-center justify-center border border-[#F3F4F6] shadow-sm">
                                <span className="text-[#6B7280] text-sm font-medium mb-1">Downloads</span>
                                <span className="text-[#111827] font-bold text-xl">{plugin.number_of_downloads.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            <button className='get-item-btn'>Get item</button>
                            <button className='preview-item-btn' style={{ backgroundColor: '#F3F4F6', color: '#374151' }}>Preview item</button>
                        </div>

                        <hr className="divider" />

                        {/* Description */}
                        <div className="description">
                            <h3 style={{ marginBottom: '10px', marginTop: '10px', fontSize: '1.2rem' }}>Description</h3>
                            <p style={{ color: '#4B5563', lineHeight: '1.6' }}>{plugin.plugin_description}</p>
                        </div>

                        <hr className="divider" />

                        {/* ==========================================
                            2. THE PILL TAGS FOR FEATURES
                            ========================================== */}
                        <div className='plugin-info'>
                            <h3 style={{ marginBottom: '15px', marginTop: '10px', fontSize: '1.2rem' }}>What's Included:</h3>
                            
                            <div className="flex flex-wrap gap-2">
                                {plugin.what_is_included?.map((item, index) => (
                                    <span
                                        key={index}
                                        className="px-4 py-2 bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0] rounded-full text-sm font-semibold shadow-sm transition-transform hover:-translate-y-1 cursor-default"
                                    >
                                        {item}
                                    </span>
                                ))}
                            </div>

                            {/* Fallback for empty array */}
                            {(!plugin.what_is_included || plugin.what_is_included.length === 0) && (
                                <p style={{ color: '#666', fontStyle: 'italic' }}>No included items listed.</p>
                            )}
                        </div>

                        <hr className="divider" />

                        {/* ... (Keep your existing users-reviews section here) ... */}

                        {/* ==========================================
                            3. THE AIRBNB-STYLE REVIEW CARDS
                            ========================================== */}
                        <div className="mt-8 pb-10">
                            <h3 className="text-xl font-bold text-[#111827] mb-6 flex items-center gap-2">
                                Reviews 
                                <span className="text-[#6B7280] text-base font-normal bg-[#F3F4F6] px-3 py-1 rounded-full">
                                    {plugin.plugin_reviews?.length || 0}
                                </span>
                            </h3>
                            
                            {/* The Grid: 1 column on small screens, 2 columns on larger screens */}
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                                {plugin.plugin_reviews?.length > 0 ? (
                                    plugin.plugin_reviews.map((review, index) => {
                                        // Grab the first letter of the user's name for the avatar
                                        const initial = (review.user_name || "U")[0].toUpperCase();
                                        
                                        return (
                                            <div key={index} className="bg-white p-5 rounded-2xl border border-[#F3F4F6] shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all hover:shadow-md hover:border-[#E5E7EB]">
                                                <div className="flex items-center gap-3 mb-3">
                                                    {/* Auto-generated Avatar */}
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#6366F1] to-[#A855F7] text-white flex items-center justify-center font-bold text-lg shadow-sm flex-shrink-0">
                                                        {initial}
                                                    </div>
                                                    
                                                    {/* Name and Stars */}
                                                    <div>
                                                        <h4 className="font-semibold text-[#111827] leading-tight">
                                                            {review.user_name || "Anonymous User"}
                                                        </h4>
                                                        <div className="mt-1 scale-90 origin-left">
                                                            <StarRating rating={review.rating || 5} />
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Review Text */}
                                                <p className="text-[#4B5563] text-sm leading-relaxed">
                                                    "{review.comment || review.review_text || "No comment provided"}"
                                                </p>
                                            </div>
                                        );
                                    })
                                ) : (
                                    // Empty State
                                    <div className="col-span-full bg-[#F9FAFB] rounded-2xl p-8 text-center border border-[#F3F4F6]">
                                        <svg className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                                        <p className="text-[#6B7280] font-medium">No reviews yet.</p>
                                        <p className="text-[#9CA3AF] text-sm mt-1">Be the first to share your thoughts on this plugin!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}