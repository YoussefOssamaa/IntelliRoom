import React from 'react';
import { useTranslator } from '../../../../translator/TranslatorContext';
import './ErrorCoords.css';

const ErrorCoords = ({ state, projectActions }) => {
  const { t } = useTranslator();
  if (!state) return null;

  const mouse = state.get('mouse') ? state.get('mouse').toJS() : { x: 0, y: 0 };
  const zoom = state.get('zoom') || 1;
  const errors = state.get('errors') ? state.get('errors').toArray() : [];
  const warnings = state.get('warnings') ? state.get('warnings').toArray() : [];

  return (
    <div className="error-coords">
      <div className="coords">
        <div>{t('X')}: {mouse.x.toFixed(3)}</div>
        <div>{t('Y')}: {mouse.y.toFixed(3)}</div>
      </div>
      <div className="errors">
        <div className="err-count">{t('Errors')}: {errors.length}</div>
        <div className="warn-count">{t('Warnings')}: {warnings.length}</div>
      </div>
    </div>
  );
};

export default ErrorCoords;
