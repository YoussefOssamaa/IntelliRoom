import React, { useState, useRef } from 'react'
import { generateImage, getHistory, getImageUrl } from '../services/comfyService'
import './ImageGenerator.css'

function ImageGenerator() {
  const [prompt, setPrompt] = useState('beautiful modern living room, arabic interior design, ornate patterns, warm lighting, luxurious')
  const [negativePrompt, setNegativePrompt] = useState('text, watermark, blurry, low quality')
  const [uploadedImage, setUploadedImage] = useState(null)
  const [uploadedImagePreview, setUploadedImagePreview] = useState(null)
  const [generatedImage, setGeneratedImage] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [status, setStatus] = useState(null)
  const [promptId, setPromptId] = useState(null)
  const fileInputRef = useRef(null)

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setUploadedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setUploadedImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      setUploadedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setUploadedImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const clearUploadedImage = () => {
    setUploadedImage(null)
    setUploadedImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setStatus({ type: 'error', message: 'Please enter a prompt' })
      return
    }

    setIsGenerating(true)
    setStatus({ type: 'info', message: 'Submitting workflow to ComfyUI...' })
    setGeneratedImage(null)

    try {
      // Generate image
      const newPromptId = await generateImage(prompt, negativePrompt)
      setPromptId(newPromptId)
      setStatus({ type: 'info', message: 'Generating image... This may take a minute.' })

      // Poll for completion
      let attempts = 0
      const maxAttempts = 60 // 2 minutes max
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        try {
          const history = await getHistory(newPromptId)
          const outputs = history[newPromptId]?.outputs
          
          if (outputs && outputs['9']?.images?.[0]) {
            const imageInfo = outputs['9'].images[0]
            const imageUrl = getImageUrl(imageInfo.filename)
            setGeneratedImage({ url: imageUrl, filename: imageInfo.filename })
            setStatus({ type: 'success', message: 'Image generated successfully!' })
            break
          }
        } catch (err) {
          // History not ready yet, continue polling
        }
        
        attempts++
      }

      if (attempts >= maxAttempts) {
        setStatus({ type: 'error', message: 'Generation timed out. Please try again.' })
      }

    } catch (error) {
      console.error('Generation error:', error)
      setStatus({ type: 'error', message: `Error: ${error.message}` })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="image-generator">
      <div className="generator-layout">
        {/* Left Panel - Inputs */}
        <div className="input-panel">
          <div className="panel-section">
            <h2>📝 Prompt</h2>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to generate..."
              rows={4}
            />
          </div>

          <div className="panel-section">
            <h2>🚫 Negative Prompt</h2>
            <input
              type="text"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="Things to avoid in the image..."
            />
          </div>

          <div className="panel-section">
            <h2>📷 Reference Image (Optional)</h2>
            <div 
              className={`upload-area ${uploadedImagePreview ? 'has-image' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              {uploadedImagePreview ? (
                <div className="preview-container">
                  <img src={uploadedImagePreview} alt="Uploaded preview" />
                  <button 
                    className="clear-btn"
                    onClick={(e) => { e.stopPropagation(); clearUploadedImage(); }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="upload-placeholder">
                  <span className="upload-icon">📁</span>
                  <p>Click or drag to upload image</p>
                  <span className="upload-hint">For future img2img features</span>
                </div>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              style={{ display: 'none' }}
            />
          </div>

          <button 
            className="generate-btn"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <span className="spinner"></span>
                Generating...
              </>
            ) : (
              '✨ Generate Image'
            )}
          </button>

          {status && (
            <div className={`status-message ${status.type}`}>
              {status.message}
            </div>
          )}
        </div>

        {/* Right Panel - Output */}
        <div className="output-panel">
          <h2>🖼️ Generated Result</h2>
          <div className="result-area">
            {generatedImage ? (
              <div className="result-image">
                <img src={generatedImage.url} alt="Generated result" />
                <div className="result-info">
                  <p><strong>Prompt ID:</strong> {promptId}</p>
                  <p><strong>Filename:</strong> {generatedImage.filename}</p>
                  <a 
                    href={generatedImage.url} 
                    download={generatedImage.filename}
                    className="download-btn"
                  >
                    ⬇️ Download
                  </a>
                </div>
              </div>
            ) : (
              <div className="result-placeholder">
                <span className="placeholder-icon">🎨</span>
                <p>Your generated image will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImageGenerator
