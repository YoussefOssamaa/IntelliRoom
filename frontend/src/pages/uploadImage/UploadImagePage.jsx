import axios from '../../config/axios.config';
import React, { useState, useRef, useCallback, useEffect } from "react";
import { BACKEND_URL } from "../../services/uploadImageService";
import styles from "./uploadImagePage.module.css";
import Header from "../../pages/dashboard/Header";
import Footer from "../../components/common/Footer";

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
function UploadZone({ preview, fileName, onFile, onClear, label, optional, disabled, inputRef }) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onFile({ target: { files: [file] } });
  }, [disabled, onFile]);

  return (
    <div className={styles.uploadImage_inputGroup}>
      <label className={styles.uploadImage_label}>
        {label}
        {optional && <span className={styles.uploadImage_labelBadge}>optional</span>}
      </label>
      <div
        className={`${styles.uploadImage_uploadZone} ${preview ? styles.uploadImage_hasImage : ""} ${dragging ? styles.uploadImage_dragActive : ""}`}
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
          <div className={styles.uploadImage_previewWrapper}>
            <div className={styles.uploadImage_previewContainer}>
              <img src={preview} alt="Preview" className={styles.uploadImage_previewImage} />
              {fileName && (
                <div className={styles.uploadImage_previewMeta}>{fileName}</div>
              )}
              {!disabled && (
                <button type="button" className={styles.uploadImage_clearButton}
                  onClick={(e) => { e.stopPropagation(); onClear(); }}>
                  <Icons.X size={13} />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.uploadImage_uploadPlaceholder}>
            <div className={styles.uploadImage_uploadIconWrapper}>
              <Icons.Upload size={20} />
            </div>
            <p className={styles.uploadImage_uploadText}>
              <span className={styles.uploadImage_uploadTextPrimary}>Click to upload</span> or drag & drop
            </p>
            <p className={styles.uploadImage_uploadHint}>PNG · JPG · JPEG · WebP · max 10 MB</p>
          </div>
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
  const TEST_IMAGE_URL = `http://localhost:5000/api/comfyOutputs/test2.png`;

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
      const res = await axios.post(`${BACKEND_URL}/uploadImage`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });
      // BACKEND_URL is e.g. "http://localhost:5000/api", enhancedImageUrl is "/api/comfyOutputs/<file>"
      const baseUrl = BACKEND_URL.replace(/\/api$/, '');
      setResultPreview(`${baseUrl}${res.data.enhancedImageUrl}`);
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
      const res = await fetch(resultPreview);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `IntelliRoomAI-${Date.now()}.jpg`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { window.open(resultPreview, "_blank"); }
  };

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

      <div className={styles.uploadImage_pageWrapper}>

        {/* ── Left strip ───────────────────────────────────── */}
        <aside className={styles.uploadImage_sideStrip}>
          <div className={styles.uploadImage_stripDot} />
          <div className={styles.uploadImage_stripLine} />
          <span className={styles.uploadImage_stripVertical}>AI Room Design</span>
          <div className={styles.uploadImage_stripLine} />
          <div className={styles.uploadImage_stripDot} />
        </aside>

        {/* ── Main content ─────────────────────────────────── */}
        <div className={styles.uploadImage_center}>
          <div className={styles.uploadImage_container}>

            {/* ═══ LEFT PANEL ══════════════════════════════════ */}
            <div className={styles.uploadImage_controls}>
              <h1 className={styles.uploadImage_heading}>
                Room <span className={styles.uploadImage_headingAccent}>Enhancer</span>
              </h1>
              <p className={styles.uploadImage_subheading}>
                Upload a photo, describe your vision, and let AI reimagine the space.
              </p>

              {/* Steps */}
              <div className={styles.uploadImage_steps}>
                {[["1", "Upload"], ["2", "Describe"], ["3", "Generate"]].map(([n, lbl], i) => (
                  <React.Fragment key={n}>
                    <div className={`${styles.uploadImage_step} ${step >= i + 1 ? styles.active : ""}`}>
                      <span className={styles.uploadImage_stepNum}>{step > i + 1 ? "✓" : n}</span>
                      {lbl}
                    </div>
                    {i < 2 && <div className={styles.uploadImage_stepLine} />}
                  </React.Fragment>
                ))}
              </div>

              <div className={styles.uploadImage_divider} />

              {/* Feedback */}
              {error && (
                <div className={styles.uploadImage_errorMessage}>
                  <Icons.Alert /> {error}
                </div>
              )}
              {isSuccess && (
                <div className={styles.uploadImage_successMessage}>
                  <Icons.Check /> Image generated successfully!
                </div>
              )}

              {/* Room image upload */}
              <UploadZone
                label="Room Image"
                optional={false}
                preview={imagePreview}
                fileName={imageName}
                inputRef={mainRef}
                disabled={loading}
                onFile={(e) => processFile(e.target.files[0], setImageFile, setImagePreview, setImageName, true)}
                onClear={() => { setImageFile(null); setImagePreview(null); setImageName(""); setIsSuccess(false); setResultPreview(null); }}
              />

              {/* Reference image upload */}
              <UploadZone
                label="Reference Style"
                optional={true}
                preview={referencePreview}
                fileName={referenceName}
                inputRef={referenceRef}
                disabled={loading}
                onFile={(e) => processFile(e.target.files[0], setReferenceImageFile, setReferencePreview, setReferenceName)}
                onClear={() => { setReferenceImageFile(null); setReferencePreview(null); setReferenceName(""); }}
              />

              {/* Prompt */}
              <div className={styles.uploadImage_inputGroup}>
                <label className={styles.uploadImage_label}>Prompt</label>
                <textarea
                  placeholder="e.g. Arabian living room with warm lighting, oak furniture, and linen curtains…"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  className={styles.uploadImage_textarea}
                  disabled={loading}
                />
              </div>

              {/* Generate */}
              <div className={styles.uploadImage_buttonGroup}>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !imageFile || !inputPrompt.trim()}
                  className={styles.uploadImage_primaryButton}
                >
                  {loading
                    ? <><Icons.Loader size={16} /> Generating…</>
                    : <><Icons.Sparkles size={16} /> Generate Image</>
                  }
                </button>
              </div>
            </div>

            {/* ═══ RIGHT PANEL ═════════════════════════════════ */}
            <div className={styles.uploadImage_previewSection}>
              <div className={styles.uploadImage_resultCard}>
                {resultPreview ? (
                  <div className={styles.uploadImage_largePreviewWrapper}>
                    {/* Full-bleed result image */}
                    <div className={styles.uploadImage_largePreviewImageWrap}>
                      <img
                        src={resultPreview}
                        alt="Generated result"
                        className={styles.uploadImage_largePreviewImage}
                      />
                    </div>

                    {/* Action bar */}
                    <div className={styles.uploadImage_resultActions}>
                      <span className={styles.uploadImage_resultLabel}>
                        <span className={styles.uploadImage_resultDot} />
                        Generated
                      </span>

                      {/* Share with dropdown */}
                      <div className={styles.uploadImage_shareWrap}>
                        <button
                          className={styles.uploadImage_actionBtn}
                          onClick={() => setShareOpen(o => !o)}
                        >
                          <Icons.Share size={13} /> Share
                        </button>
                        {shareOpen && (
                          <ShareDropdown
                            url={resultPreview}
                            onClose={() => setShareOpen(false)}
                          />
                        )}
                      </div>

                      {/* Download */}
                      <button
                        className={`${styles.uploadImage_actionBtn} ${styles.uploadImage_actionBtnAccent}`}
                        onClick={handleDownload}
                      >
                        <Icons.Download size={13} /> Download
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.uploadImage_emptyState}>
                    <div className={styles.uploadImage_emptyStateIcon}>
                      <Icons.Image size={26} />
                    </div>
                    <p className={styles.uploadImage_emptyTitle}>Awaiting your creation</p>
                    <p className={styles.uploadImage_emptyText}>
                      Upload a room photo and describe your desired transformation to get started.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ── Right strip ──────────────────────────────────── */}
        <aside className={styles.uploadImage_sideStrip}>
          <div className={styles.uploadImage_stripDot} />
          <div className={styles.uploadImage_stripLine} />
          <span className={styles.uploadImage_stripVertical}>Powered by IntelliRoomAI</span>
          <div className={styles.uploadImage_stripLine} />
          <div className={styles.uploadImage_stripDot} />
        </aside>

      </div>

      <Footer />

      {/* Toast */}
      {toast && (
        <div className={styles.uploadImage_toast}>
          <Icons.Check size={13} /> Link copied to clipboard
        </div>
      )}
    </div>
  );
}

export default UploadImagePage;
