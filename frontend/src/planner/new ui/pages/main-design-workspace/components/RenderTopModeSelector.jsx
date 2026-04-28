import React from 'react';
import { useTranslator } from '../../../../translator/TranslatorContext';
import './RenderTopModeSelector.css';

const RenderTopModeSelector = ({ onBack }) => {
  const { t } = useTranslator();

  return (
    <div className="render-top-mode-selector">
      <div className="render-mode-tabs">
        <button className="render-mode-btn active" type="button">
          {t('360 Walkthrough')}
        </button>
      </div>

      <button
        type="button"
        className="render-back-btn"
        aria-label={t('Back to 2D/3D')}
        onClick={onBack}
      >
        {t('Back to 2D/3D')}
      </button>
    </div>
  );
};

export default RenderTopModeSelector;
