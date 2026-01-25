import axios from 'axios';
import React, { useState } from 'react';
import {Routes, Route, replace} from 'react-router-dom'
import { BACKEND_URL } from '../../services/uploadImageService';
//import './upload.css'



function UploadImage() {
    const [imageFile, setImageFile ] = useState (null)
    const [imagePreview, setImagePreview] = useState (null)
    const [inputPrompt , setInputPrompt] = useState ('')
    const [replacementPrompt , setReplacementPrompt] = useState ('')
    const [loading , setLoading] = useState (false)
    const [workflowNumber, setWorkflowNumber] = useState('1');  // wf 1 by default


    const handleImageChange = (e)=> {
        
        const file = e.target.files[0]
        if (!file) return

        setImageFile (file)
        setImagePreview (URL.createObjectURL(file))
    }


    const handleSubmit = async () => {
        if (!imageFile) {
            alert ('Please provide an image and a prompt')
            return
        }


        setLoading (true)

        const formData = new FormData ()
        formData.append ("image" , imageFile)
        formData.append ("inputPrompt" , inputPrompt)
        formData.append ("replacementPrompt" , replacementPrompt)
        formData.append ("workflowNumber" , workflowNumber)  

        try{

            const res = await axios.post(`${BACKEND_URL}/uploadImage`, 
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            )


            console.log('Responseeeeee from server:', res.data);
            
           const fullImageUrl = `${BACKEND_URL}${res.data.enhancedImageUrl}`;
            setImagePreview(fullImageUrl);  
            setLoading(false)

        }
        catch(err){
            console.error(err);
            alert("Processing failed");
            setLoading(false)
        }
    } 

    return (
<>
            
                
                
        <div> 
        <h1>Upload Image Page</h1> 

        
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
        <textarea
        placeholder = "Object Replacement Prompt"
        value = {replacementPrompt}
        onChange={(e)=> { setReplacementPrompt (e.target.value)} }
        />

        <br /><br />


        <label>
            Choose Workflow:
            <select 
                value ={workflowNumber}
                onChange={(e)=>{ setWorkflowNumber (e.target.value) }}>
                <option value="1">Empty Room Workflow </option>
                <option value="2">Ultimate Upscale Workflow </option>
                <option value="3">Sketch Workflow</option>
                <option value="4">Object Replacement Workflow </option>
                <option value="5">Object Replacement with Stable Diffusion Workflow </option>
            </select>

        </label>



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