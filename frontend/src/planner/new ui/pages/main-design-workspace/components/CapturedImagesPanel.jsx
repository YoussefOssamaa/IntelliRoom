import React from 'react';
import './CapturedImagesPanel.css';

const CapturedImagesPanel = ({ images, selectedCaptureId, onSelectCapture, newestCaptureId, t }) => {
  if (!images.length) {
    return <p className="captured-empty">{t('No captures yet')}</p>;
  }

  return (
    <div className="captured-list">
      {images.map((capture) => {
        const status = capture.status || 'ready';
        const thumbnailUrl = capture.thumbnailUrl || capture.imageDataUrl || capture.sourceImageDataUrl;
        const statusLabel = status === 'processing'
          ? t('Processing')
          : status === 'failed'
            ? t('Failed')
            : status === 'captured'
              ? t('Captured')
              : t('Ready');

        const hint = status === 'ready'
          ? t('Click to preview')
          : status === 'captured'
            ? t('Ready to render')
            : status === 'failed'
              ? (capture.errorMessage || t('Processing failed'))
              : t('Waiting for backend response');

        return (
          <button
            key={capture.id}
            type="button"
            className={`captured-thumb-btn ${selectedCaptureId === capture.id ? 'selected' : ''} ${newestCaptureId === capture.id ? 'newest' : ''} ${status}`}
            onClick={() => onSelectCapture(capture.id)}
          >
            <div className="captured-thumb-frame">
              <img src={thumbnailUrl} alt={t('Captured image thumbnail')} className="captured-thumb-img" />

              {(status === 'processing' || status === 'failed') && (
                <div className={`captured-thumb-overlay ${status}`}>
                  <span className="captured-thumb-overlay-text">{statusLabel}</span>
                </div>
              )}
            </div>

            <div className="captured-thumb-meta">
              <span className={`captured-thumb-status ${status}`}>{statusLabel}</span>
              <span className="captured-thumb-hint">{hint}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default CapturedImagesPanel;
