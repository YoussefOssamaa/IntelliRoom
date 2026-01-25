import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import './PluginReviewPage.css';

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

export default function PluginReviewPage() {

    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [plugin, setPlugin] = useState(null);
    const [error, setError] = useState(null);
    const [isFollowing, setIsFollowing] = React.useState(false);

    useEffect(() => {
        const fetchPluginData = async () => {
            try {
                setLoading(true);

                const response = await axios.get(`http://localhost:5000/api/plugins/${id}`);

                setPlugin(response.data);
                setLoading(false);

            } catch (err) {
                console.error(err);
                setError("Failed to load plugin details.");
                setLoading(false);
            }
        };

        if (id) {
            fetchPluginData();
        }
    }, [id]);


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
                    <div className="plugin-placeholder">
                        <h3>Plugin Preview Area</h3>
                    </div>
                </div>

                <div className="info-side">
                    <button className="back-btn" onClick={() => navigate(-1)}>
                        <span>&#8592;</span> Back to Marketplace
                    </button>
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
                                <h5 key={index}>{item}</h5>
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