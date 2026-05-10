import axios from '../../config/axios.config';
import React, { useState, useRef, useCallback, useEffect } from "react";
import { BACKEND_URL } from "../../services/uploadImageService";
import styles from "./uploadImagePage.module.css";
import Header from "../../pages/dashboard/Header";
import Footer from "../../components/common/Footer";
import ProductCard from "./productCard.jsx";

/* ══════════════════════════════════════════════════════════════
   ICON KIT
   ══════════════════════════════════════════════════════════════ */
const Icons = {
  Upload: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  X: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Loader: ({ size = 17 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className={styles.uploadImage_spinner}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
  Sparkles: ({ size = 17 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  ),
  Alert: ({ size = 15 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" />
      <circle cx="12" cy="16" r="0.5" fill="currentColor" />
    </svg>
  ),
  Check: ({ size = 15 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
    </svg>
  ),
  Download: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Share: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  ),
  Link: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  Image: ({ size = 28 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  Sun: ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  ),
  Moon: ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  Community: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Plus: ({ size = 16, style }) => (
    <svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Bedroom: ({ size = 36 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
      <path d="M2 15h20" />
      <path d="M2 11v8" />
      <path d="M22 11v8" />
      <path d="M6 11V9" />
      <path d="M18 11V9" />
      <rect x="8" y="7" width="8" height="4" rx="1" />
    </svg>
  ),
};

/* ── Social platform colours ───────────────────────────────── */
const SHARE_PLATFORMS = [
  {
    id: "community",
    label: "Community Page",
    meta: "Share with our design community",
    bg: "#b8924a",
    emoji: "🏠",
    action: (url) => { window.location.href = `/community/share?image=${encodeURIComponent(url)}`; },
  },
  {
    id: "twitter",
    label: "X (Twitter)",
    meta: "Post to your followers",
    bg: "#000",
    emoji: "𝕏",
    action: (url) => {
      window.open(`https://twitter.com/intent/tweet?text=Check+out+my+AI-enhanced+room!&url=${encodeURIComponent(url)}`, "_blank");
    },
  },
  {
    id: "facebook",
    label: "Facebook",
    meta: "Share to your timeline",
    bg: "#1877f2",
    emoji: "f",
    action: (url) => {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
    },
  },
  {
    id: "pinterest",
    label: "Pinterest",
    meta: "Save to your board",
    bg: "#e60023",
    emoji: "P",
    action: (url) => {
      window.open(`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=AI+Enhanced+Room`, "_blank");
    },
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    meta: "Send to contacts",
    bg: "#25d366",
    emoji: "💬",
    action: (url) => {
      window.open(`https://wa.me/?text=${encodeURIComponent("Check out my AI-enhanced room! " + url)}`, "_blank");
    },
  },
  {
    id: "instagram",
    label: "Instagram",
    meta: "Download & share to Stories",
    bg: "linear-gradient(45deg,#f58529,#dd2a7b,#8134af)",
    emoji: "📸",
    action: async (url) => {
      /* Instagram has no web share API — download and prompt user */
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `room-enhanced.jpg`;
        a.click();
      } catch { window.open(url, "_blank"); }
    },
  },
];

/* ══════════════════════════════════════════════════════════════
   UPLOAD ZONE sub-component
   ══════════════════════════════════════════════════════════════ */
function UploadZone({ preview, fileName, onFile, onClear, label, optional, disabled, inputRef, icon: IconComponent }) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onFile({ target: { files: [file] } });
  }, [disabled, onFile]);

  return (
    <div className={styles.textAreaContainer} style={{ flex: 1 }}>
      <label className={styles.eyebrow}>
        {label}
        {optional && <span style={{ opacity: 0.6, fontSize: '0.9em', marginLeft: 4 }}>(Optional)</span>}
      </label>
      <div
        className={`${styles.squareUploadZone} ${preview ? styles.hasImage : ""} ${dragging ? styles.uploadImage_dragActive : ""}`}
        onClick={() => !preview && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpg,image/jpeg,image/webp"
          onChange={onFile}
          className={styles.uploadImage_hiddenInput}
          disabled={disabled}
        />

        {preview ? (
          <>
            <img src={preview} alt="Preview" className={styles.squarePreviewImage} />
            {!disabled && (
              <button type="button" className={styles.uploadImage_clearButton}
                onClick={(e) => { e.stopPropagation(); onClear(); }}>
                <Icons.X size={13} />
              </button>
            )}
          </>
        ) : (
          <>
            <div className={styles.squareUploadZoneIcon}>
              {IconComponent ? <IconComponent size={24} /> : <Icons.Upload size={24} />}
            </div>
            <span className={styles.squareUploadText}>
              {label === "Room Image" ? "Upload Current Space" : "Upload Inspiration"}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SHARE DROPDOWN
   ══════════════════════════════════════════════════════════════ */
function ShareDropdown({ url, onClose }) {
  const ref = useRef(null);
  const [copied, setCopied] = useState(false);

  /* close on outside click */
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(url); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div ref={ref} className={styles.uploadImage_shareDropdown}>
      <div className={styles.uploadImage_shareHeader}>Share your creation</div>

      <div className={styles.uploadImage_shareList}>
        {SHARE_PLATFORMS.map((p, i) => (
          <React.Fragment key={p.id}>
            {i === 1 && <div className={styles.uploadImage_shareDivider} />}
            <button
              className={styles.uploadImage_shareItem}
              onClick={() => { p.action(url); onClose(); }}
            >
              <span
                className={styles.uploadImage_shareItemIcon}
                style={{ background: p.bg, color: "#fff", fontWeight: 700, fontFamily: "sans-serif" }}
              >
                {p.emoji}
              </span>
              <span className={styles.uploadImage_shareItemText}>
                {p.label}
                <span className={styles.uploadImage_shareItemMeta}>{p.meta}</span>
              </span>
            </button>
          </React.Fragment>
        ))}
      </div>

      <div className={styles.uploadImage_shareDivider} />

      {/* Copy link row */}
      <div className={styles.uploadImage_shareCopyRow}>
        <input
          readOnly
          value={url}
          className={styles.uploadImage_shareCopyInput}
          onClick={(e) => e.target.select()}
        />
        <button
          className={`${styles.uploadImage_shareCopyBtn} ${copied ? styles.uploadImage_shareCopied : ""}`}
          onClick={handleCopy}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════ */
function UploadImagePage() {
  const [imageFile, setImageFile] = useState(null);
  const [referenceImageFile, setReferenceImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [referencePreview, setReferencePreview] = useState(null);
  const [imageName, setImageName] = useState("");
  const [referenceName, setReferenceName] = useState("");
  const [inputPrompt, setInputPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [resultPreview, setResultPreview] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [matchedProducts, setMatchedProducts] = useState([]);


  const mainRef = useRef(null);
  const referenceRef = useRef(null);

  /* ── file processor ────────────────────────────────────── */
  const processFile = (file, setFile, setPreview, setName, resetResult = false) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please upload a valid image file."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("File must be less than 10 MB."); return; }
    setError(""); setIsSuccess(false);
    setFile(file);
    setPreview(URL.createObjectURL(file));
    setName(file.name);
    if (resetResult) setResultPreview(null);
  };

  const TEST_MODE = false;
  const TEST_IMAGE_URL = `/api/comfyOutputs/test2.png`;

  /* ── submit ────────────────────────────────────────────── */
  const handleSubmit = async () => {
    setError(""); setIsSuccess(false);
    if (!imageFile) { setError("Please upload a room image."); return; }
    if (!inputPrompt.trim()) { setError("Please enter a prompt."); return; }
    setLoading(true);

    if (TEST_MODE) {
      await new Promise(r => setTimeout(r, 1400));
      setResultPreview(TEST_IMAGE_URL);
      setIsSuccess(true);
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("inputPrompt", inputPrompt.trim());
    if (referenceImageFile) formData.append("referenceImage", referenceImageFile);

    try {
      const res = await axios.post('/uploadImage', formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(percentCompleted);
        }
      });
      // baseUrl is e.g. "http://localhost:5000/api", enhancedImageUrl is "/uploads/comfyOutputs/<file>"
      const baseUrl = import.meta.env.VITE_API_URL.replace(/\/api$/, '');
      setResultPreview(`${baseUrl}${res.data.enhancedImageUrl}`);
      setMatchedProducts(res.data.matchedProducts);
      setIsSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || "Processing failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── download ──────────────────────────────────────────── */
  const handleDownload = async () => {
    if (!resultPreview) return;
    try {
      const res = await axios.get(resultPreview, { responseType: 'blob' });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(res.data);
      a.download = `IntelliRoom.net-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { window.open(resultPreview, "_blank"); }
  };


  const handleFeaturedProducts = async () => {
    try {
      const res = await axios.get(`/products/featuredProducts`);
      setFeaturedProducts(res.data);
    } catch (err) {
      console.log(err);
    }
  }


  /* ── step indicator ────────────────────────────────────── */
  const step = !imageFile ? 1 : !inputPrompt.trim() ? 2 : 3;

  return (
    <div
      className={styles.uploadImage_root}
      data-theme={darkMode ? "dark" : "light"}
    >
      {/* Dark mode toggle */}
      <button
        className={styles.uploadImage_themeToggle}
        onClick={() => setDarkMode(d => !d)}
        title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        aria-label="Toggle colour theme"
      >
        {darkMode ? <Icons.Sun size={17} /> : <Icons.Moon size={17} />}
      </button>

      <Header />

      <main className={styles.pageMainContainer}>
        <section className={styles.editorialGrid}>
          {/* Left Side: Room Enhancer Controls */}
          <div className={styles.gridCol5}>
            <div>
              <span className={styles.eyebrow}>POWERED BY INTELLIGENCE</span>
              <h1 className={styles.heroHeading}>Room Enhancer</h1>
              <p className={styles.heroSubtext}>
                Transform your living space with editorial-grade AI visualization. Upload your vision, define your style.
              </p>
            </div>

            <div className={`${styles.cardContainer} ${styles.editorialShadow}`}>
              {/* Feedback */}
              {error && (
                <div className={styles.uploadImage_errorMessage}>
                  <Icons.Alert /> {error}
                </div>
              )}
              {isSuccess && !error && (
                <div className={styles.uploadImage_successMessage}>
                  <Icons.Check /> Image generated successfully.
                </div>
              )}

              {/* Upload Slots */}
              <div className={styles.uploadSquaresGrid}>
                <UploadZone
                  label="Room Image"
                  optional={false}
                  preview={imagePreview}
                  fileName={imageName}
                  inputRef={mainRef}
                  disabled={loading}
                  icon={Icons.Image}
                  onFile={(e) => processFile(e.target.files[0], setImageFile, setImagePreview, setImageName, true)}
                  onClear={() => { setImageFile(null); setImagePreview(null); setImageName(""); setIsSuccess(false); setResultPreview(null); }}
                />

                <UploadZone
                  label="Reference Style"
                  optional={true}
                  preview={referencePreview}
                  fileName={referenceName}
                  inputRef={referenceRef}
                  disabled={loading}
                  icon={Icons.Community}
                  onFile={(e) => processFile(e.target.files[0], setReferenceImageFile, setReferencePreview, setReferenceName)}
                  onClear={() => { setReferenceImageFile(null); setReferencePreview(null); setReferenceName(""); }}
                />
              </div>

              {/* Text Prompt Area */}
              <div className={styles.textAreaContainer}>
                <label className={styles.eyebrow}>Enhancement Prompt</label>
                <textarea
                  className={styles.enhancePrompt}
                  placeholder="e.g., 'A Scandinavian minimalist living room with warm oak textures, floor-to-ceiling linen curtains, and soft afternoon sunlight...'"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Generate Button */}
              <button
                className={styles.generateBtn}
                onClick={handleSubmit}
                disabled={loading || !imageFile || !inputPrompt.trim()}
              >
                <Icons.Sparkles size={20} />
                {loading ? "Generating Image..." : "Generate Image"}
              </button>
            </div>
          </div>

          {/* Right Side: Awaiting Your Creation / Result */}
          <div className={styles.gridCol7}>
            <div className={styles.canvasContainer}>
              {resultPreview ? (
                <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                  <img src={resultPreview} alt="Generated result" className={styles.canvasResultImage} style={{ position: 'absolute' }} />
                  <div style={{ position: "absolute", bottom: "1.5rem", right: "1.5rem", display: "flex", gap: "0.5rem", zIndex: 10 }}>
                    <button className={styles.uploadImage_actionBtn} onClick={() => setShareOpen(o => !o)}>
                      <Icons.Share size={13} /> Share
                    </button>
                    <button className={`${styles.uploadImage_actionBtn} ${styles.uploadImage_actionBtnAccent}`} onClick={handleDownload} style={{ background: 'var(--accent)', color: 'white', borderColor: 'transparent' }}>
                      <Icons.Download size={13} /> Download
                    </button>
                    {shareOpen && (
                      <ShareDropdown url={resultPreview} onClose={() => setShareOpen(false)} />
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.canvasEmpty}>
                    <div className={styles.canvasIconShell}>
                      <Icons.Bedroom />
                    </div>
                    <h3 className={styles.canvasEmptyTitle}>Awaiting your creation</h3>
                    <p className={styles.canvasEmptyText}>
                      Once you hit generate, your AI-enhanced room will materialize here with pixel-perfect lighting and texture.
                    </p>
                  </div>

                  {/* Decorative elements */}
                  <div className={styles.canvasDecoTop}>

                  </div>
                  <div className={styles.canvasDecoBottom}>
                    INTELLIROOM V1.0
                  </div>
                </>
              )}
            </div>
          </div>
        </section>



        {/* Recommended for Your Space - Only show on success */}
        {isSuccess == false && (
          <section className={styles.recommendedSection}>
            <div className={styles.recommendedHeader}>
              <div>
                <span className={styles.recommendedEyebrow}>CURATED COLLECTION</span>
                <h2 className={styles.recommendedTitle}>Featured Products</h2>
                <p className={styles.heroSubtext} style={{ fontSize: '1rem', margin: 0 }}>
                  Discover the latest trends in home decor and furniture.
                </p>
              </div>
              <div className={styles.navArrows}>
                <button className={styles.navArrow}><Icons.Plus size={16} style={{ transform: "rotate(45deg)" }} /></button>
                <button className={styles.navArrow}><Icons.Plus size={16} /></button>
              </div>
            </div>

            <div className={styles.productGrid}>
              <div className={styles.productCard}>
                <div className={styles.productImageWrap}>
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuArw3Y8nseY4_hNfFn_K41TUmDGlLSE7wtL4ni56cojJUKEKYFz6tyhMfqzI5I3ZB6WbY9VzK0E1fDvQSM4Z4yshGuEYc__NwGmOz0RC_wIyx7NkzQBjBB1yDtBhIj3cUKRQAIY_Ny-b94jr__PadEkgEj8sd2Vcr5zTfdUbjXxa24EO_NU3XOxn18qLOD_ytkj4Jexv7_TzmzQ8BpuIQ8A0JJOOtkq6YxS9eFLfB9k0kjdy252YFR1vF2OhX7JFRu91I-3Hr8g1mY" alt="Modern Velvet Sofa" className={styles.productImage} />
                  <div className={styles.productBadge}>New Arrival</div>
                </div>
                <div className={styles.productInfo}>
                  <div>
                    <h4 className={styles.productName}>Modern Velvet Sofa</h4>
                    <span className={styles.productDesc}>Deep Emerald, Solid Oak</span>
                  </div>
                  <span className={styles.productPrice}>$2,450</span>
                </div>
                <div className={styles.productActions}>
                  <button className={styles.viewDetailsBtn}>View Details</button>
                  <button className={styles.addToCartBtn}><Icons.Plus size={16} /></button>
                </div>
              </div>

              <div className={styles.productCard}>
                <div className={styles.productImageWrap}>
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuApXzEKn3A_DQ5tG4VC7pg8lSkeMVWPx5ODKnfTbNJYS25_vRY-4D34WjYuJJ6QrwgwWs5q045agmXfyAK2folhYp-4u7IwjOiZwcvwsy_9KrrnmuxzhEnmfBI0O0RzRDFZVj8SGOJ2zK9DFM2Q48cbNglt1RGvL8A9eY03W6J5bveaMU1GKfgHfx1abje7tqsBZiA8uLJR4gYH354wXLKljke25HdW3fWP4ed7LZ2TDeZisvsgQgDy0eLGzIgR1TbGFRGHSqqCbYU" alt="Minimalist Floor Lamp" className={styles.productImage} />
                  <div className={styles.productBadge}>Editor's Pick</div>
                </div>
                <div className={styles.productInfo}>
                  <div>
                    <h4 className={styles.productName}>Minimalist Lamp</h4>
                    <span className={styles.productDesc}>Matte Black, Warm</span>
                  </div>
                  <span className={styles.productPrice}>$420</span>
                </div>
                <div className={styles.productActions}>
                  <button className={styles.viewDetailsBtn}>View Details</button>
                  <button className={styles.addToCartBtn}><Icons.Plus size={16} /></button>
                </div>
              </div>

              <div className={styles.productCard}>
                <div className={styles.productImageWrap}>
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCEDvMHnFhpvYSxefHGYrjC2xNYvUmX8DSYkZi8GrflZW_NyoWuGOZ3shT8zlRsoiorpqb-Vx7wkPeR7bb-MT_iYn4hWJyByNqiDcGBw4tIzDE2lD_wQgaqhLFoNbGSVSyxtZWYM5bpFwVmpQN2dKbmd2Tkl8OPsTVj13YFNonrmXoJSKwIvu5PdCma1ZaJyX6UJlxgNmM2kxn8N_S0t6-zMAu92sVEO2MXODmkyOYlIlKVd1jR4Y0SbQLyyzj9AALzmSQuf0D0BMg" alt="Abstract Wool Rug" className={styles.productImage} />
                  <div className={styles.productBadge}>Limited</div>
                </div>
                <div className={styles.productInfo}>
                  <div>
                    <h4 className={styles.productName}>Abstract Wool Rug</h4>
                    <span className={styles.productDesc}>Organic Shape, Hand-Tufted</span>
                  </div>
                  <span className={styles.productPrice}>$1,200</span>
                </div>
                <div className={styles.productActions}>
                  <button className={styles.viewDetailsBtn}>View Details</button>
                  <button className={styles.addToCartBtn}><Icons.Plus size={16} /></button>
                </div>
              </div>
            </div>
          </section>
        )}



        {/* Recommended for Your Space - Only show on success */}
        {isSuccess && (
          <section className={styles.recommendedSection}>
            <div className={styles.recommendedHeader}>
              <div>
                <span className={styles.recommendedEyebrow}>AI MATCHED</span>
                <h2 className={styles.recommendedTitle}>Recommended for Your Space</h2>
                <p className={styles.heroSubtext} style={{ fontSize: '1rem', margin: 0 }}>
                  Furniture and decor pieces that best match your enhanced room aesthetic.
                </p>
              </div>
              <div className={styles.navArrows}>
                <button className={styles.navArrow}><Icons.Plus size={16} style={{ transform: "rotate(45deg)" }} /></button>
                <button className={styles.navArrow}><Icons.Plus size={16} /></button>
              </div>
            </div>

            <div className={styles.productGrid}>
              {matchedProducts.length > 0 ? (
                matchedProducts.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))
              ) : (
                <p>No matching products found.</p>
              )}
            </div>
          </section>
        )}
      </main>



      <Footer />




      {/* Toast */}
      {
        toast && (
          <div className={styles.uploadImage_toast}>
            <Icons.Check size={13} /> Link copied to clipboard
          </div>
        )
      }
    </div >
  );
}

export default UploadImagePage;
