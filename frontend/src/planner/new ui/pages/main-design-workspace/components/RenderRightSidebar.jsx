import React, { useRef, useState, useCallback } from 'react';
import Icon from '../../../components/AppIcon';
import { useTranslator } from '../../../../translator/TranslatorContext';
import SmartPreview from './SmartPreview';
import CapturedImagesPanel from './CapturedImagesPanel';
import './RenderRightSidebar.css';

const CAMERA_HEIGHT_MIN_MM = 0;
const CAMERA_HEIGHT_DEFAULT_MAX_MM = 2800;

const normalizeHeightMax = (heightMaxMm) => {
  const numericMax = Number(heightMaxMm);
  if (Number.isNaN(numericMax) || numericMax <= CAMERA_HEIGHT_MIN_MM) {
    return CAMERA_HEIGHT_DEFAULT_MAX_MM;
  }
  return numericMax;
};

const clampDistance = (distanceMm, maxDistanceMm = CAMERA_HEIGHT_DEFAULT_MAX_MM) => {
  const normalizedMax = normalizeHeightMax(maxDistanceMm);
  const numericDistance = Number(distanceMm);
  if (Number.isNaN(numericDistance)) return CAMERA_HEIGHT_MIN_MM;
  return Math.max(CAMERA_HEIGHT_MIN_MM, Math.min(normalizedMax, numericDistance));
};

const clampAngle = (angle) => {
  const numericAngle = Number(angle);
  if (Number.isNaN(numericAngle)) return 0;
  return Math.max(-80, Math.min(80, numericAngle));
};

const renderDebugLog = (...args) => {
  if (typeof window !== 'undefined' && window.__RENDER_DEBUG__) {
    console.debug('[RenderSidebar]', ...args);
  }
};

// ─── Camera Distance Widget ────────────────────────────────────────────────────

const WIDGET_H = 176;      // total SVG height (px)
const WIDGET_W = 120;      // total SVG width  (px)
const PAD_TOP  = 16;
const PAD_BOT  = 16;
const TRACK_H  = WIDGET_H - PAD_TOP - PAD_BOT;  // usable slider height
const CAM_X    = 22;       // camera icon center X
const TARGET_X = WIDGET_W - 18; // target icon center X (right edge)

// Convert mm → pixel Y (top = max, bottom = min)
const mmToY = (mm, maxDistanceMm) => {
  const normalizedMax = normalizeHeightMax(maxDistanceMm);
  const ratio = (mm - CAMERA_HEIGHT_MIN_MM) / (normalizedMax - CAMERA_HEIGHT_MIN_MM);
  return PAD_TOP + TRACK_H * (1 - ratio);
};

// Convert pixel Y → mm
const yToMm = (y, maxDistanceMm) => {
  const normalizedMax = normalizeHeightMax(maxDistanceMm);
  const ratio = 1 - (y - PAD_TOP) / TRACK_H;
  return Math.round(
    CAMERA_HEIGHT_MIN_MM + ratio * (normalizedMax - CAMERA_HEIGHT_MIN_MM)
  );
};

// Half-spread of frustum at the target edge (grows as camera goes higher)
const frustumSpread = (camY) => 14 + ((WIDGET_H - camY) / WIDGET_H) * 20;

const CameraDistanceWidget = ({
  t,
  distanceMm,
  maxDistanceMm,
  verticalAngle,
  onDistanceChange,
  onVerticalAngleChange,
}) => {
  const svgRef = useRef(null);

  const clampedMaxDistanceMm = normalizeHeightMax(maxDistanceMm);
  const normalizedDistanceMm = clampDistance(distanceMm, clampedMaxDistanceMm);
  const camY   = mmToY(normalizedDistanceMm, clampedMaxDistanceMm);
  const spread = frustumSpread(camY);

  // Target Y follows vertical angle and acts as the frustum center on the edge.
  const maxOffset  = spread - 6;
  const clampedOff = (-(clampAngle(verticalAngle) / 80) * maxOffset);
  const targetY    = camY + clampedOff;

  // Cone vertices
  const tipX  = CAM_X + 8;   // right edge of camera icon
  const topX  = TARGET_X;
  const topY  = targetY - spread;
  const botY  = targetY + spread;

  // ── Camera slider drag ──
  const startCamDrag = useCallback((e) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;

    const move = (ev) => {
      const rect = svg.getBoundingClientRect();
      const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const y = Math.max(PAD_TOP, Math.min(PAD_TOP + TRACK_H, clientY - rect.top));
      onDistanceChange(yToMm(y, clampedMaxDistanceMm));
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup',   up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend',  up);
    };
    move(e);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup',   up);
    window.addEventListener('touchmove', move);
    window.addEventListener('touchend',  up);
  }, [onDistanceChange, clampedMaxDistanceMm]);

  // ── Target drag (vertical, maps to camera vertical look angle) ──
  const startTargetDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;

    const startY = e.touches ? e.touches[0].clientY : e.clientY;
    const startOff = clampedOff;

    renderDebugLog('target-drag-start', {
      verticalAngle,
      startOff,
      maxOffset,
    });

    const move = (ev) => {
      const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const delta = clientY - startY;
      const nextOffset = Math.max(-maxOffset, Math.min(maxOffset, startOff + delta));
      const nextAngle = Math.round(clampAngle((-(nextOffset / maxOffset) * 80)));
      onVerticalAngleChange(nextAngle);

      renderDebugLog('target-drag-move', {
        delta,
        nextOffset,
        nextAngle,
      });
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup',   up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend',  up);

      renderDebugLog('target-drag-end', {
        verticalAngle: clampAngle(verticalAngle),
      });
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup',   up);
    window.addEventListener('touchmove', move);
    window.addEventListener('touchend',  up);
  }, [clampedOff, maxOffset, onVerticalAngleChange, verticalAngle]);

  return (
    <div className="cdw-container">
      {/* mm labels */}
      <div className="cdw-scale">
        <span className="cdw-scale-label">{clampedMaxDistanceMm}mm</span>
        <span className="cdw-scale-label">{CAMERA_HEIGHT_MIN_MM}mm</span>
      </div>

      {/* SVG canvas */}
      <svg
        ref={svgRef}
        className="cdw-svg"
        width={WIDGET_W}
        height={WIDGET_H}
        viewBox={`0 0 ${WIDGET_W} ${WIDGET_H}`}
      >
        {/* Vertical track line */}
        <line
          x1={CAM_X} y1={PAD_TOP}
          x2={CAM_X} y2={PAD_TOP + TRACK_H}
          className="cdw-track-line"
        />

        {/* Frustum fill */}
        <polygon
          points={`${tipX},${camY} ${topX},${topY} ${topX},${botY}`}
          className="cdw-frustum-fill"
        />

        {/* Frustum right edge (vertical line) */}
        <line
          x1={topX} y1={topY}
          x2={topX} y2={botY}
          className="cdw-frustum-edge"
        />

        {/* Frustum outline strokes */}
        <line x1={tipX} y1={camY} x2={topX} y2={topY} className="cdw-frustum-stroke" />
        <line x1={tipX} y1={camY} x2={topX} y2={botY} className="cdw-frustum-stroke" />

        {/* ── Camera handle ── */}
        <g
          className="cdw-camera-handle"
          transform={`translate(${CAM_X - 10}, ${camY - 10})`}
          onMouseDown={startCamDrag}
          onTouchStart={startCamDrag}
          style={{ cursor: 'ns-resize' }}
        >
          {/* Camera body */}
          <rect x="0" y="3" width="16" height="12" rx="2" className="cdw-cam-body" />
          {/* Lens */}
          <circle cx="8" cy="9" r="3.5" className="cdw-cam-lens" />
          <circle cx="8" cy="9" r="1.5" className="cdw-cam-lens-inner" />
          {/* Viewfinder bump */}
          <rect x="4" y="0" width="5" height="3" rx="1" className="cdw-cam-bump" />
          {/* Arrow indicators */}
          <text x="8" y="22" className="cdw-cam-arrows">⇅</text>
        </g>

        {/* ── Target handle (draggable along cone edge) ── */}
        <g
          className="cdw-target-handle"
          transform={`translate(${topX - 8}, ${targetY - 8})`}
          onMouseDown={startTargetDrag}
          onTouchStart={startTargetDrag}
          style={{ cursor: 'ns-resize' }}
        >
          {/* Outer ring */}
          <circle cx="8" cy="8" r="8" className="cdw-target-ring" />
          {/* Inner dot */}
          <circle cx="8" cy="8" r="2.5" className="cdw-target-dot" />
          {/* Cross hairs */}
          <line x1="8" y1="1" x2="8" y2="5"  className="cdw-target-cross" />
          <line x1="8" y1="11" x2="8" y2="15" className="cdw-target-cross" />
          <line x1="1"  y1="8" x2="5"  y2="8" className="cdw-target-cross" />
          <line x1="11" y1="8" x2="15" y2="8" className="cdw-target-cross" />
        </g>
      </svg>

      <div className="cdw-controls">
        <label className="cdw-control-field">
          <span>{t('Height')}</span>
          <div className="camera-input-wrap">
            <input
              className="camera-input"
              type="number"
              value={normalizedDistanceMm}
              min={CAMERA_HEIGHT_MIN_MM}
              max={clampedMaxDistanceMm}
              onChange={(e) => onDistanceChange(e.target.value)}
            />
            <span className="camera-input-unit">mm</span>
          </div>
        </label>

        <label className="cdw-control-field">
          <span>{t('Angle')}</span>
          <div className="camera-input-wrap">
            <input
              className="camera-input"
              type="number"
              value={Math.round(clampAngle(verticalAngle))}
              min={-80}
              max={80}
              step={1}
              onChange={(e) => onVerticalAngleChange(e.target.value)}
            />
          </div>
        </label>
      </div>
    </div>
  );
};

// ─── Main Sidebar ──────────────────────────────────────────────────────────────

const RenderRightSidebar = ({
  controlType,
  onControlTypeChange,
  cameraHeightMm,
  cameraHeightMaxMm,
  onCameraHeightChange,
  cameraVerticalRotation,
  onCameraVerticalRotationChange,
  capturedImages,
  selectedCaptureId,
  onSelectCapture,
  newestCaptureId,
}) => {
  const { t } = useTranslator();
  const [isSmartPanelCollapsed, setIsSmartPanelCollapsed] = useState(false);
  const [isCameraCapturePanelCollapsed, setIsCameraCapturePanelCollapsed] = useState(false);

  const maxCameraHeightMm = normalizeHeightMax(cameraHeightMaxMm);
  const cameraDistanceMm = clampDistance(cameraHeightMm, maxCameraHeightMm);

  const isFullyCollapsed = isSmartPanelCollapsed && isCameraCapturePanelCollapsed;

  return (
    <aside className={`render-right-sidebar ${isFullyCollapsed ? 'collapsed-all' : ''}`}>
      <section className={`render-dock-panel smart-preview-panel ${isSmartPanelCollapsed ? 'collapsed' : ''}`}>
        <button
          type="button"
          className="render-dock-panel-handle"
          onClick={() => setIsSmartPanelCollapsed((currentValue) => !currentValue)}
          aria-label={isSmartPanelCollapsed ? t('Expand smart viewer panel') : t('Collapse smart viewer panel')}
        >
          <Icon
            name={isSmartPanelCollapsed ? 'ChevronRight' : 'ChevronLeft'}
            size={14}
          />
        </button>

        {!isSmartPanelCollapsed && (
          <div className="render-dock-panel-content">
            <div className="render-dock-panel-title">{t('Smart Viewer')}</div>
          <div className="render-preview-body">
            <SmartPreview variant="render" workspaceMode="3d-firstperson" />
          </div>
          </div>
        )}
      </section>

      <section className={`render-dock-panel camera-capture-panel ${isCameraCapturePanelCollapsed ? 'collapsed' : ''}`}>
        <button
          type="button"
          className="render-dock-panel-handle"
          onClick={() => setIsCameraCapturePanelCollapsed((currentValue) => !currentValue)}
          aria-label={isCameraCapturePanelCollapsed ? t('Expand camera and captures panel') : t('Collapse camera and captures panel')}
        >
          <Icon
            name={isCameraCapturePanelCollapsed ? 'ChevronRight' : 'ChevronLeft'}
            size={14}
          />
        </button>

        {!isCameraCapturePanelCollapsed && (
          <div className="render-dock-panel-content camera-capture-content">
            <div className="camera-panel-body">
            <h3 className="render-sidebar-title">{t('Camera Properties')}</h3>

            <label className="camera-prop-field">
              <span>{t('Controls')}</span>
              <div className="camera-input-wrap">
                <select
                  className="camera-input camera-select"
                  value={controlType}
                  onChange={(e) => onControlTypeChange(e.target.value)}
                >
                  <option value="drag-pan">{t('Drag Pan (Default)')}</option>
                  <option value="pointer-lock">{t('Pointer Lock Look')}</option>
                </select>
              </div>
            </label>

            {/* ── New Camera Distance Widget ── */}
            <CameraDistanceWidget
              t={t}
              distanceMm={cameraDistanceMm}
              maxDistanceMm={maxCameraHeightMm}
              verticalAngle={cameraVerticalRotation}
              onDistanceChange={onCameraHeightChange}
              onVerticalAngleChange={onCameraVerticalRotationChange}
            />
            </div>

            <div className="render-captured-divider" />

            <div className="render-dock-panel-title captured-title">{t('Captured Images')}</div>
            <div className="captured-panel-body">
              <CapturedImagesPanel
                images={capturedImages}
                selectedCaptureId={selectedCaptureId}
                onSelectCapture={onSelectCapture}
                newestCaptureId={newestCaptureId}
                t={t}
              />
            </div>
          </div>
        )}
      </section>
    </aside>
  );
};

export default RenderRightSidebar;
