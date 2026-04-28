import React, { useState, useRef, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Content from '../../../../components/content';
import { useTranslator } from '../../../../translator/TranslatorContext';
import './WorkspaceCanvas.css';

const WorkspaceCanvas = ({ mode, onObjectSelect, plannerState, isRenderMode = false, capturePulseActive = false }) => {
  const { t } = useTranslator();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // Use a ref for wheel zoom to avoid triggering re-renders.
  // The zoom value was previously stored as state but never used in rendering,
  // so setZoom() calls caused unnecessary re-renders of the entire Viewer2D subtree
  // during scroll events, adding overhead that worsened drag performance.
  const zoomRef = useRef(100);

  const handleWheel = useRef((e) => {
    e?.preventDefault();
    const delta = e?.deltaY > 0 ? -10 : 10;
    zoomRef.current = Math.max(25, Math.min(200, zoomRef.current + delta));
  }).current;

  useEffect(() => {
    const canvas = canvasRef?.current;
    if (canvas) {
      canvas?.addEventListener('wheel', handleWheel, { passive: false });
      return () => canvas?.removeEventListener('wheel', handleWheel);
    }
  }, []);

  // Use ResizeObserver for more accurate and responsive size tracking.
  // The previous approach only listened for window resize events, which
  // missed container size changes from sidebar open/close or flex reflow.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      setCanvasSize({
        width: container.clientWidth,
        height: container.clientHeight
      });
    };

    updateSize();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateSize);
      observer.observe(container);
      return () => observer.disconnect();
    } else {
      // Fallback for environments without ResizeObserver
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }
  }, []);

  return (
    <div className={`workspace-canvas ${capturePulseActive ? 'render-capture-pulse' : ''}`} ref={containerRef}>
      {/* Mode Indicator */}
      {!isRenderMode && (
        <div className="mode-indicator">
          <Icon name={mode === '3d' ? 'Box' : 'LayoutGrid'} size={20} className="mode-icon" />
          <span className="mode-text">
            {mode === '3d' ? t('3D View') : t('2D Floor Plan')}
          </span>
        </div>
      )}

      {/* React Planner Content Area */}
      <div className="canvas-area" ref={canvasRef}>
        {plannerState ? (
          <Content
            width={canvasSize.width}
            height={canvasSize.height}
            state={plannerState}
            customContents={{}}
          />
        ) : (
          <div className="canvas-content-center">
            <div className="canvas-placeholder">
              <div className="placeholder-box">
                <div className="placeholder-content">
                  <Icon name="Home" size={48} className="placeholder-icon" />
                  <p className="placeholder-text">{t('Loading planner...')}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkspaceCanvas;