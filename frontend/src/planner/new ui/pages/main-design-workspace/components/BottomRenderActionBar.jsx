import React from 'react';
import { useTranslator } from '../../../../translator/TranslatorContext';
import './BottomRenderActionBar.css';

const BottomRenderActionBar = ({
  hasOpenCapture,
  onCapture,
  onRender,
  processingCaptureCount,
  renderError,
  renderSuccess,
  isRenderDisabled = false,
}) => {
  const { t } = useTranslator();
  const isProcessing = processingCaptureCount > 0;

  return (
    <div className="bottom-render-action-bar">
      <div className="render-action-group">
        {hasOpenCapture ? (
          <>
            <button
              className="render-action-btn capture-again-state"
              onClick={onCapture}
              type="button"
            >
              {t('Capture Again')}
            </button>
            <button
              className="render-action-btn render-state"
              onClick={onRender}
              type="button"
              disabled={isRenderDisabled}
            >
              {t('Render')}
            </button>
          </>
        ) : (
          <button
            className="render-action-btn capture-state"
            onClick={onCapture}
            type="button"
          >
            {t('Capture')}
          </button>
        )}
      </div>

      {renderError && <p className="render-action-message error">{renderError}</p>}
      {!renderError && renderSuccess && <p className="render-action-message success">{renderSuccess}</p>}
      {isProcessing && !renderError && !renderSuccess && (
        <p className="render-action-message success">
          {processingCaptureCount === 1 ? t('1 capture is processing.') : `${processingCaptureCount} ${t('captures are processing.')}`}
        </p>
      )}
    </div>
  );
};

export default BottomRenderActionBar;
