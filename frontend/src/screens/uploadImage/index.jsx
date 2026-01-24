import axios from 'axios';
import React, { useState } from 'react';
import {Routes, Route} from 'react-router-dom'
import { BACKEND_URL } from '../../services/uploadImageService';




function UploadImage() {
    const [imageFile, setImageFile ] = useState (null)
    const [imagePreview, setImagePreview] = useState (null)
    const [inputPrompt , setInputPrompt] = useState ('')
    const [loading , setLoading] = useState (false)




    const handleImageChange = (e)=> {
        
        const file = e.target.files[0]
        if (!file) return

        setImageFile (file)
        setImagePreview (URL.createObjectURL(file))
    }


    const handleSubmit = async () => {
        if (!imageFile || inputPrompt.length === 0) {
            alert ('Please provide an image and a prompt')
            return
        }


        setLoading (true)

        const formData = new FormData ()
        formData.append ("image" , imageFile)
        formData.append ("inputPrompt" , inputPrompt)

        try{

           /* const res = await axios.post(`${BACKEND_URL}/uploadImage`, 
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            )*/

                const testurl = "test.png" //////

            console.log('Responseeeeee from server:', res.data);
            
           // const fullImageUrl = `${BACKEND_URL}${res.data.enhancedImageUrl}`;
            setImagePreview(testurl);  ////////
            setLoading(false)

        }
        catch(err){
            console.error(err);
            alert("Processing failed");
                const testurl = "test.png" //////
            setImagePreview(testurl);
            
            setLoading(false)
        }
    } 

    return (
<>
            
        <h1>Upload Image Page</h1> 
                
                
        <div> 

        
        <input 
        type='file' 
        accept='image/*'
        onChange={handleImageChange} />

        <br></br>

        {imagePreview && (
                <div style={{ marginTop: '20px' }}>
                    <img 
                        src={imagePreview} 
                        alt="Preview" 
                        style={{ 
                            maxWidth: '100%', 
                            height: 'auto', 
                            display: 'block',
                            borderRadius: '8px',
                            border: '1px solid #ccc' 
                        }} 
                    />
                </div>
            )}


        <br /><br />


        <textarea
        placeholder = "Enter A Prompt"
        value = {inputPrompt}
        onChange={(e)=> { setInputPrompt (e.target.value)} }
        />

        <br /><br />

        <button
        onClick={handleSubmit}  disabled={loading}>
            { loading? "Processing..." : "Send"  }
        </button>

        </div>


</>

  )

} 



export default UploadImage;