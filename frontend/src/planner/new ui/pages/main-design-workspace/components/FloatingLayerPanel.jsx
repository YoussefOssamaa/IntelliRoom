import React, { useState, useRef, useEffect } from 'react';
import { usePlanner } from '../../../../context/PlannerContext';
import { useTranslator } from '../../../../translator/TranslatorContext';
import './FloatingLayerPanel.css';

/**
 * Floating dropdown panel for layer management.
 * Triggered by a "Layers" button next to the Snap toggle.
 */
const FloatingLayerPanel = ({ plannerState }) => {
  const { sceneActions, translator } = usePlanner();
  const { t } = useTranslator();
  const [open, setOpen] = useState(false);
  const [editingID, setEditingID] = useState(null);
  const [editName, setEditName] = useState('');
  const panelRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!plannerState) return null;

  const scene = plannerState.get('scene') || plannerState.scene;
  if (!scene) return null;

  const layers = scene.get('layers');
  const selectedLayer = scene.get('selectedLayer');
  const isLastLayer = layers.size === 1;

  const handleSelect = (layerID) => {
    sceneActions.selectLayer(layerID);
  };

  const handleAdd = () => {
    sceneActions.addLayer('', 0);
  };

  const handleDelete = (e, layerID) => {
    e.stopPropagation();
    sceneActions.removeLayer(layerID);
  };

  const startRename = (e, layerID, currentName) => {
    e.stopPropagation();
    setEditingID(layerID);
    setEditName(currentName || '');
  };

  const commitRename = (layerID) => {
    sceneActions.setLayerProperties(layerID, { name: editName });
    setEditingID(null);
  };

  const handleKeyDown = (e, layerID) => {
    if (e.key === 'Enter') commitRename(layerID);
    if (e.key === 'Escape') setEditingID(null);
  };

  const toggleVisibility = (e, layerID, currentVisible) => {
    e.stopPropagation();
    sceneActions.setLayerProperties(layerID, { visible: !currentVisible });
  };

  return (
    <div className="flp-wrapper" ref={panelRef}>
      <button className="flp-trigger" onClick={() => setOpen(o => !o)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
        {t('Layers')}
      </button>

      {open && (
        <div className="flp-dropdown">
          <div className="flp-header">
            <span className="flp-title">{t('Layers')}</span>
            <button className="flp-add-btn" onClick={handleAdd} title={t('Add layer')}>+</button>
          </div>

          <div className="flp-list">
            {layers.entrySeq().map(([layerID, layer]) => {
              const isActive = layerID === selectedLayer;
              const name = layer.get('name') || layerID;
              const visible = layer.get('visible') !== false;

              return (
                <div
                  key={layerID}
                  className={`flp-row ${isActive ? 'flp-active' : ''}`}
                  onClick={() => handleSelect(layerID)}
                >
                  {/* Visibility toggle */}
                  <button
                    className="flp-vis-btn"
                    onClick={(e) => toggleVisibility(e, layerID, visible)}
                    title={visible ? t('Hide') : t('Show')}
                  >
                    {visible ? '👁' : '👁‍🗨'}
                  </button>

                  {/* Name (editable) */}
                  {editingID === layerID ? (
                    <input
                      className="flp-name-input"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => handleKeyDown(e, layerID)}
                      onBlur={() => commitRename(layerID)}
                      autoFocus
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span className="flp-name" onDoubleClick={(e) => startRename(e, layerID, name)}>
                      {name}
                    </span>
                  )}

                  {/* Altitude badge */}
                  <span className="flp-alt">h:{layer.get('altitude') || 0}</span>

                  {/* Rename button */}
                  <button
                    className="flp-icon-btn"
                    onClick={(e) => startRename(e, layerID, name)}
                    title={t('Rename')}
                  >✎</button>

                  {/* Delete button */}
                  {!isLastLayer && (
                    <button
                      className="flp-icon-btn flp-del"
                      onClick={(e) => handleDelete(e, layerID)}
                      title={t('Delete')}
                    >×</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingLayerPanel;
