import axios from 'axios';
import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { BACKEND_URL } from '../../services/uploadImageService';
import styles from './uploadImagePage.module.css'; 
import Header from '../../pages/dashboard/Header';
import Footer from '../../components/common/Footer';


function UploadImagePage() {
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [inputPrompt, setInputPrompt] = useState('');
    const [replacementPrompt, setReplacementPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [workflowNumber, setWorkflowNumber] = useState('1');

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleSubmit = async () => {
        if (!imageFile) {
            alert('Please provide an image and a prompt');
            return;
        }
        setLoading(true);
        const formData = new FormData();
        formData.append("image", imageFile);
        formData.append("inputPrompt", inputPrompt);
        formData.append("replacementPrompt", replacementPrompt);
        formData.append("workflowNumber", workflowNumber);
        
        try {
            const res = await axios.post(
                `${BACKEND_URL}/uploadImage`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            console.log('Response from server:', res.data);
            
            const fullImageUrl = `${BACKEND_URL}${res.data.enhancedImageUrl}`;
            setImagePreview(fullImageUrl);
            setLoading(false);
        } catch (err) {
            console.error(err);
            alert("Processing failed");
            setLoading(false);
        }
    };

    return (
        <>
        <Header />
        <div className={styles.pageWrapper}>
            <div className={styles.container}>
                <h1 className={styles.heading}>Upload Image Page</h1>
                
                <input 
                    type='file' 
                    accept='image/*'
                    onChange={handleImageChange}
                    className={styles.fileInput}
                />
                
                {imagePreview && (
                    <div className={styles.imagePreview}>
                        <img 
                            src={imagePreview} 
                            alt="Preview"
                            className={styles.previewImage}
                        />
                    </div>
                )}
                
                <textarea
                    placeholder="Enter A Prompt"
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    className={styles.textarea}
                />
                
                <textarea
                    placeholder="Object Replacement Prompt"
                    value={replacementPrompt}
                    onChange={(e) => setReplacementPrompt(e.target.value)}
                    className={styles.textarea}
                />
                
                <label className={styles.label}>
                    Choose Workflow:
                    <select 
                        value={workflowNumber}
                        onChange={(e) => setWorkflowNumber(e.target.value)}
                        className={styles.select}
                    >
                        <option value="1">Empty Room Workflow</option>
                        <option value="2">Ultimate Upscale Workflow</option>
                        <option value="3">Sketch Workflow</option>
                        <option value="4">Object Replacement Workflow</option>
                        <option value="5">Object Replacement with Stable Diffusion Workflow</option>
                    </select>
                </label>
                
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className={styles.button}
                >
                    {loading ? "Processing..." : "Send"}
                </button>
            </div>
        </div>
        
        <Footer />

        </>
    );
}

export default UploadImagePage;