import axios from "axios";
import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { BACKEND_URL } from "../../services/uploadImageService";
import styles from "./uploadImagePage.module.css";
import Header from "../../pages/dashboard/Header";
import Footer from "../../components/common/Footer";

const Icons = {
  Upload: ({ size = 20 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),

  X: ({ size = 18 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),

  Loader2: ({ size = 18 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={styles.spinner}
    >
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
    </svg>
  ),

  Sparkles: ({ size = 20 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  ),

  AlertCircle: ({ size = 18 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),

  CheckCircle2: ({ size = 18 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
};

function UploadImagePage() {
  const [imageFile, setImageFile] = useState(null);
  const [referenceImageFile, setReferenceImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageReferencePreview, setReferenceImagePreview] = useState(null);
  const [inputPrompt, setInputPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const mainFileInputRef = React.useRef(null);
  const referenceFileInputRef = React.useRef(null);
  const [resultPreview, setResultPreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file");
      return;
    }

    // 10 MB photo max size
    if (file.size > 10 * 1024 * 1024) {
      setError("File must be less than 10MB");
      return;
    }

    setError("");
    setIsSuccess(false);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setResultPreview(null); 


  };

  const handleReferenceImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file");
      return;
    }

    // 10 MB photo max size
    if (file.size > 10 * 1024 * 1024) {
      setError("File must be less than 10MB");
      return;
    }

    setError("");
    setIsSuccess(false);
    setReferenceImageFile(file);
    setReferenceImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    setError("");
    setIsSuccess(false);

    if (!imageFile) {
      setError("Please provide an image");
      return;
    }
    if (!inputPrompt.trim()) {
      setError("Please enter a prompt.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("inputPrompt", inputPrompt.trim());
    if (referenceImageFile) {
      formData.append("referenceImage", referenceImageFile);
    }

    
    try {
      const res = await axios.post(`${BACKEND_URL}/uploadImage`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 30000,
      });

      const fullImageUrl = `${BACKEND_URL}${res.data.enhancedImageUrl}`;

      setResultPreview(fullImageUrl);
      setReferenceImagePreview(null);
      setReferenceImageFile(null);
      setIsSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Processing failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />

      <div className={styles.pageLayout}>
        <main className={styles.pageWrapper}>
          <div className={styles.container}>
            {/* LEFT COLUMN */}
            <div className={styles.controls}>
              <h1 className={styles.heading}>
                <Icons.Sparkles size={24} />
                Enhance Your Image
              </h1>

              {error && (
                <div className={styles.errorMessage}>
                  <Icons.AlertCircle />
                  {error}
                </div>
              )}

              {isSuccess && (
                <div className={styles.successMessage}>
                  <Icons.CheckCircle2 />
                  Image processed successfully!
                </div>
              )}

              <div className={styles.inputGroup}>
                <label className={styles.label}>Upload Image</label>

                <div
                  className={`${styles.uploadZone} ${imagePreview ? styles.hasImage : ""}`}
                  onClick={() =>
                    !imagePreview && mainFileInputRef.current?.click()
                  }
                >
                  <input
                    ref={mainFileInputRef}
                    type="file"
                    accept="image/png, image/jpg, image/jpeg, image/webp"
                    onChange={handleImageChange}
                    className={styles.hiddenInput}
                    disabled={loading}
                  />

                  {imagePreview ? (
                    <div className={styles.previewWrapper}>
                      <div className={styles.previewContainer}>
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className={styles.previewImage}
                        />

                        {!loading && (
                          <button
                            type="button"
                            className={styles.clearButton}
                            onClick={(e) => {
                              e.stopPropagation();
                              setImageFile(null);
                              setImagePreview(null);
                              setIsSuccess(false);
                            }}
                          >
                            <Icons.X size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className={styles.uploadPlaceholder}>
                      <div className={styles.uploadIconWrapper}>
                        <Icons.Upload size={36} />
                      </div>

                      <p className={styles.uploadText}>
                        <span className={styles.uploadTextPrimary}>
                          Click to upload
                        </span>{" "}
                        or drag and drop
                      </p>

                      <p className={styles.uploadHint}>
                        PNG, JPG, JPEG, WebP up to 10MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {!isSuccess && (
                <div className={styles.inputGroup}>
                  <label className={styles.label}>
                    Upload Reference Image (Optional)
                  </label>

                  <div
                    className={`${styles.uploadZone} ${
                      imageReferencePreview ? styles.hasImage : ""
                    }`}
                    onClick={() =>
                      !imageReferencePreview &&
                      referenceFileInputRef.current?.click()
                    }
                  >
                    <input
                      ref={referenceFileInputRef}
                      type="file"
                      accept="image/png, image/jpg, image/jpeg, image/webp"
                      onChange={handleReferenceImageChange}
                      className={styles.hiddenInput}
                      disabled={loading}
                    />

                    {imageReferencePreview ? (
                      <div className={styles.previewWrapper}>
                        <div className={styles.previewContainer}>
                          <img
                            src={imageReferencePreview}
                            alt="Preview"
                            className={styles.previewImage}
                          />

                          {!loading && (
                            <button
                              type="button"
                              className={styles.clearButton}
                              onClick={(e) => {
                                e.stopPropagation();
                                setReferenceImageFile(null);
                                setReferenceImagePreview(null);
                                setIsSuccess(false);
                              }}
                            >
                              <Icons.X size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className={styles.uploadPlaceholder}>
                        <div className={styles.uploadIconWrapper}>
                          <Icons.Upload size={36} />
                        </div>

                        <p className={styles.uploadText}>
                          <span className={styles.uploadTextPrimary}>
                            Click to upload
                          </span>{" "}
                          or drag and drop
                        </p>

                        <p className={styles.uploadHint}>
                          PNG, JPG, JPEG, WebP up to 10MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className={styles.inputGroup}>
                <textarea
                  placeholder="Describe how you want to modify this image..."
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  className={styles.textarea}
                  rows={4}
                />
              </div>

              <div className={styles.buttonGroup}>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !imageFile || !inputPrompt.trim()}
                  className={styles.primaryButton}
                >
                  {loading ? (
                    <>
                      <Icons.Loader2 />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Icons.Sparkles />
                      Generate Image
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN */}
              <div className={styles.previewSection}>
                {resultPreview ? (
                  <div className={styles.largePreviewWrapper}>
                    <img
                      src={resultPreview}
                      alt="Generated result"
                      className={styles.largePreviewImage}
                    />
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <Icons.Sparkles size={40} />
                    <p>Your generated image will appear here</p>
                  </div>
                )}
              </div>
          </div>
        </main>
      </div>

      <Footer />
    </>
  );
}

export default UploadImagePage;
