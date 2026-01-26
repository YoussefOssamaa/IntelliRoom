import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import './PluginReviewPage.css';
import PlugInImg from './robot.avif';


const mockPlugin = {
    _id: "1",
    plugin_name: "Living Room Genius AI",
    plugin_description: "friendly Robot",


    image_url: PlugInImg,

    plugin_author: {
        user_name: "Alharith Mujeeb",
        email: "demo@example.com",
    },
    plugin_rating: 4.8,
    plugin_reviews: [
        { user_name: "Alice", rating: 5, comment: "Amazing tool!" },
        { user_name: "Bob", rating: 4, comment: "Very useful but needs more styles." }
    ],
    what_is_included: ["3D Rendering", "Lighting Adjustments", "Texture Pack"],
    plugin_price: 150,
    number_of_downloads: 1205
};

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


    // to be used after discussion
    // const [loading, setLoading] = useState(true);
    // const [plugin, setPlugin] = useState(null);
    // const [error, setError] = useState(null);
    // const [isFollowing, setIsFollowing] = React.useState(false);




    const [loading, setLoading] = useState(false);
    const [plugin, setPlugin] = useState(mockPlugin);
    const [error, setError] = useState(null);
    const [isFollowing, setIsFollowing] = useState(false);


    // to be used after discussion
    // useEffect(() => {
    //     const fetchPluginData = async () => {
    //         try {
    //             setLoading(true);

    //             const response = await axios.get(`http://localhost:5000/api/plugins/${id}`);

    //             setPlugin(response.data);
    //             setLoading(false);

    //         } catch (err) {
    //             console.error(err);
    //             setError("Failed to load plugin details.");
    //             setLoading(false);
    //         }
    //     };

    //     if (id) {
    //         fetchPluginData();
    //     }
    // }, [id]);


    useEffect(() => {
        document.title = "Plugin Review | IntelliRoom";
    }, []);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!plugin) return null;

    return (

        <div className='main-container'>
            <div className="review-page-container">

                <div className="visual-side">
                    {/* <div className="plugin-placeholder">
                        <h3>Plugin Preview Area</h3>
                    </div> */}
                    <div className="plugin-placeholder" style={{ padding: 0, overflow: 'hidden' }}>
                        {plugin.image_url ? (
                            <img
                                src={plugin.image_url}
                                alt={plugin.plugin_name}
                                className="w-full h-full object-cover"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            // Fallback if no image exists
                            <div style={{ padding: '20px', textAlign: 'center' }}>
                                <h3>No Preview Available</h3>
                            </div>
                        )}
                    </div>
                </div>

                <div className="info-side">
                    {/* to be edited */}
                    {/* <button className="back-btn" onClick={() => navigate(-1)}>
                        <span>&#8592;</span> Go Back
                    </button> */}
                    <div className="info-content">
                        <h2>{plugin.plugin_name}</h2>
                        <div>
                            <div className='follow-row'>
                                <h4 className='owner-name'>
                                    by {plugin.plugin_author?.user_name || "Unknown Author"}
                                </h4>

                                <button className={`follow-btn ${isFollowing ? 'following' : ''}`}
                                    onClick={() => setIsFollowing(!isFollowing)}>
                                    {isFollowing ? 'Following' : 'Follow'}
                                </button>
                            </div>
                            <p className='downloads-number'>{plugin.number_of_downloads} downloads</p>
                            <p className='rating'>&#9733; {plugin.plugin_rating}</p>
                        </div>

                        <hr className="divider" />

                        <div className="description">
                            <h2 className='credits-points'>
                                {plugin.plugin_price === 0 ? "Free" : `${plugin.plugin_price} Credits`}
                            </h2>
                            <div>
                                <button className='get-item-btn'>Get item</button>
                            </div>
                            <div>
                                <button className='preview-item-btn'>Preview item</button>
                            </div>
                            <h3>Description</h3>
                            <p>{plugin.plugin_description}</p>
                        </div>

                        <hr className="divider" />

                        <div className='plugin-info'>
                            <h3>What's Included:</h3>
                            {plugin.what_is_included.map((item, index) => (
                                <h5
                                    key={index}
                                    style={{ marginBottom: '10px', fontWeight: 'normal', color: '#555' }}
                                >
                                    • {item}
                                </h5>
                            ))}
                        </div>

                        <hr className="divider" />

                        <div className='users-reviews'>
                            <h3>Reviews ({plugin.plugin_reviews.length})</h3>
                            <div>
                                {plugin.plugin_reviews && plugin.plugin_reviews.length > 0 ? (
                                    plugin.plugin_reviews.map((review, index) => (
                                        <div key={index} style={{ marginBottom: '20px' }}>
                                            <div className='user-name-and-review'>
                                                <h4>{review.user_name || "User"}</h4>
                                                <div>
                                                    <StarRating rating={review.rating || 5} />
                                                </div>
                                            </div>
                                            <p>{review.comment || review.review_text || "No comment provided"}</p>
                                            <hr className="divider" style={{ opacity: 0.3 }} />
                                        </div>
                                    ))
                                ) : (
                                    <p style={{ color: '#666', fontStyle: 'italic' }}>
                                        No reviews yet.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}