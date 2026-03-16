import React, { useState } from 'react';
import './BottomRightControls.css';
import { SNAP_POINT, SNAP_LINE, SNAP_SEGMENT, SNAP_GRID, SNAP_GUIDE } from '../../../../utils/snap';
import FloatingLayerPanel from './FloatingLayerPanel';
import { useTranslator } from '../../../../translator/TranslatorContext';

const BottomRightControls = ({ plannerState, projectActions, sidebarWidth = 0 }) => {
  const { t } = useTranslator();
  const [snapOpen, setSnapOpen] = useState(false);

  const zoom = plannerState ? plannerState.get('zoom') : 1;
  const snapMask = plannerState ? plannerState.get('snapMask') : null;

  const zoomIn = () => {
    const newZoom = parseFloat((zoom * 1.1).toFixed(3));
    projectActions.updateZoomScale(newZoom);
  };

  const zoomOut = () => {
    const newZoom = parseFloat((zoom / 1.1).toFixed(3));
    projectActions.updateZoomScale(newZoom);
  };

  const zoomReset = () => {
    projectActions.updateZoomScale(1);
  };

  const toggleSnapOption = (key) => {
    if (!snapMask) return;
    const updated = snapMask.merge({ [key]: !snapMask.get(key) });
    projectActions.toggleSnap(updated);
  };

  return (
    <div className="brc-container" style={{ '--sidebar-width': `${sidebarWidth}px` }}>
      <div className="zoom-controls">
        <button className="brc-btn" onClick={zoomIn} title={t('Zoom in')}>+</button>
        <div className="zoom-level">{Math.round((zoom || 1) * 100)}%</div>
        <button className="brc-btn" onClick={zoomOut} title={t('Zoom out')}>−</button>
        <button className="brc-btn brc-reset" onClick={zoomReset} title={t('Reset zoom')}>⟲</button>
      </div>

      <div className={`snap-control ${snapOpen ? 'open' : ''}`}>
        <button className="snap-main" onClick={() => setSnapOpen(!snapOpen)}>{t('Snap')}</button>
        {snapOpen && (
          <div className="snap-list">
            <label><input type="checkbox" checked={!!(snapMask && snapMask.get(SNAP_POINT))} onChange={() => toggleSnapOption(SNAP_POINT)} /> {t('Point')}</label>
            <label><input type="checkbox" checked={!!(snapMask && snapMask.get(SNAP_LINE))} onChange={() => toggleSnapOption(SNAP_LINE)} /> {t('Line')}</label>
            <label><input type="checkbox" checked={!!(snapMask && snapMask.get(SNAP_SEGMENT))} onChange={() => toggleSnapOption(SNAP_SEGMENT)} /> {t('Segment')}</label>
            <label><input type="checkbox" checked={!!(snapMask && snapMask.get(SNAP_GRID))} onChange={() => toggleSnapOption(SNAP_GRID)} /> {t('Grid')}</label>
            <label><input type="checkbox" checked={!!(snapMask && snapMask.get(SNAP_GUIDE))} onChange={() => toggleSnapOption(SNAP_GUIDE)} /> {t('Guide')}</label>
          </div>
        )}
      </div>

      {/* Floating layer manager — sits next to Snap */}
      <FloatingLayerPanel plannerState={plannerState} />
    </div>
  );
};

export default BottomRightControls;
