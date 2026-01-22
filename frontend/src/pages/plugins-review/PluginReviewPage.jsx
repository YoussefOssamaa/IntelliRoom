import axios from 'axios';
import React, { useEffect, useState } from 'react';
import './PluginReviewPage.css';





const StarRating = ({ rating }) => {
    // Create an array of 5 items (for 5 stars)
    return (
        <div className="star-row">
            {[...Array(5)].map((_, index) => {
                // If the current index is less than the rating, show a filled star
                // Example: If rating is 3, indices 0, 1, 2 are filled.
                const isFilled = index < rating;

                return (
                    <span key={index} className={`star ${isFilled ? 'filled' : 'empty'}`}>
                        ★
                    </span>
                );
            })}
        </div>
    );
};

export function PluginReviewPage() {

    const [loading, setLoading] = useState(true);
    const [plugin, setPlugin] = useState(null);
    const [error, setError] = useState(null);
    const [isFollowing, setIsFollowing] = React.useState(false);

    useEffect(() => {
        const fetchPluginData = async () => {
            try {
                setLoading(true);

                // PASTE YOUR COPIED ID HERE ↓↓↓
                const testID = "695ffe135c71b8356374dc7f"; // <--- Replace with the ID from your browser

                const response = await axios.get(`http://localhost:5000/api/plugins/${testID}`);

                console.log("Data fetched:", response.data); // Check console to be sure
                setPlugin(response.data);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setError("Failed to connect to backend.");
                setLoading(false);
            }
        };

        fetchPluginData();
    }, []);


    useEffect(() => {
        document.title = "Plugin Review | IntelliRoom";
    }, []);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!plugin) return null;




    return (

        <div className='main-container'>
            <div className="review-page-container">

                {/* --- LEFT HALF: Visual/Plugin Display --- */}
                <div className="visual-side">
                    <div className="plugin-placeholder">
                        {/* This is where your actual Plugin or Image will go later */}
                        <h3>Plugin Preview Area</h3>
                    </div>
                </div>

                {/* --- RIGHT HALF: Information --- */}
                <div className="info-side">
                    <div className="info-content">
                        <h2>{plugin.plugin_name}</h2>
                        <div>
                            <div className='follow-row'>
                                <h4 className='owner-name'>by {plugin.plugin_author}</h4>
                                <button className=
                                    {`follow-btn ${isFollowing ? 'following' : ''}`}
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
                            <h3>Reviews({plugin.plugin_reviews.length})</h3>
                            <div>
                                <div className='user-name-and-review'>
                                    <h4>yousef</h4>
                                    <div >
                                        <StarRating rating={4} />
                                    </div>
                                </div>
                                <p>very good features, helps me alot</p>
                            </div>
                            <div>
                                <div className='user-name-and-review'>
                                    <h4>Mohammed</h4>
                                    <div >
                                        <StarRating rating={2} />
                                    </div>
                                </div>
                                <p>not as good as expected</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}