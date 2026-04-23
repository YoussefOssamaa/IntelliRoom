import React from 'react';
import Icon from '../../../components/AppIcon';
import { useTranslator } from '../../../../translator/TranslatorContext';
import './GestureControlsSidebar.css';

const GestureControlsSidebar = ({
  isOpen,
  onClose,
  workspaceMode,
  viewSettings,
  onToggleSetting,
}) => {
  const { t } = useTranslator();

  if (!isOpen) return null;

  const gestureCards = [
    {
      key: 'gestureZoom',
      icon: 'ZoomIn',
      title: 'Enable Gesture Control',
      description:
        'Use one pinched hand to rotate the 3D room. Pinch and hold with both hands, then change the distance between them to zoom.',
    },
    {
      key: 'gestureCameraPreview',
      icon: 'Camera',
      title: 'Show Camera Preview',
      description:
        'Show a small webcam preview so you can align your hand with the detector.',
    },
  ];

  return (
    <div className="gesture-sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">{t('Hand Gestures')}</h2>
        <button onClick={onClose} className="close-btn">
          <Icon name="X" size={20} />
        </button>
      </div>

      <div className="gesture-sidebar-content">
        <div
          className={`gesture-mode-banner ${workspaceMode === '2d' ? 'warning' : 'ready'}`}
        >
          <Icon
            name={workspaceMode === '2d' ? 'AlertTriangle' : 'BadgeCheck'}
            size={18}
          />
          <div>
            <h3>
              {workspaceMode === '2d'
                ? t('Switch to 3D first')
                : t('3D gesture control is ready')}
            </h3>
            <p>
              {workspaceMode === '2d'
                ? t(
                    'The gesture controller only affects the 3D viewer. Change to 3D mode, then enable it here.',
                  )
                : t(
                    'Turn on gesture control, allow camera access, then use one pinched hand to rotate and pinch-hold with both hands to zoom.',
                  )}
            </p>
          </div>
        </div>

        <div className="gesture-cards">
          {gestureCards.map((card) => (
            <button
              key={card.key}
              type="button"
              className={`gesture-card ${viewSettings?.[card.key] ? 'active' : ''}`}
              onClick={() => onToggleSetting(card.key)}
            >
              <div className="gesture-card-icon">
                <Icon name={card.icon} size={22} />
              </div>
              <div className="gesture-card-copy">
                <div className="gesture-card-top">
                  <h3>{t(card.title)}</h3>
                  <div
                    className={`gesture-switch ${viewSettings?.[card.key] ? 'on' : 'off'}`}
                  >
                    <span className="gesture-switch-thumb" />
                  </div>
                </div>
                <p>{t(card.description)}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="gesture-help-card">
          <div className="gesture-help-header">
            <Icon name="Sparkles" size={18} />
            <h3>{t('How to use it')}</h3>
          </div>
          <ol className="gesture-help-list">
            <li>{t('Switch the workspace to 3D mode.')}</li>
            <li>{t('Enable Gesture Control.')}</li>
            <li>{t('Allow browser camera permission when prompted.')}</li>
            <li>
              {t('Hold your hand in frame and pinch thumb with index finger.')}
            </li>
            <li>
              {t(
                'Keep that pinch held and move your hand left, right, up, or down to rotate the model.',
              )}
            </li>
            <li>{t('Pinch and hold with both hands, then move them farther apart or closer together to zoom.')}</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default GestureControlsSidebar;
