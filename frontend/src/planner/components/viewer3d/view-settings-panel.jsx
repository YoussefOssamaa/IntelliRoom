'use strict';

import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import * as SharedStyle from '../../shared-style';

/**
 * ViewSettingsPanel - A floating panel with toggleable visibility options
 * 
 * Features:
 * - Fixed position at bottom of screen
 * - Expandable dropdown with checkboxes
 * - Real-time visibility toggles
 * - Smooth animations
 */

const PANEL_STYLE = {
  position: 'absolute',
  bottom: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 1000,
  fontFamily: 'Arial, sans-serif',
  userSelect: 'none'
};

const BUTTON_STYLE = {
  backgroundColor: SharedStyle.PRIMARY_COLOR.main || '#1976d2',
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  padding: '10px 24px',
  fontSize: '14px',
  fontWeight: '600',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
  transition: 'all 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
};

const BUTTON_HOVER_STYLE = {
  ...BUTTON_STYLE,
  backgroundColor: SharedStyle.PRIMARY_COLOR.alt || '#1565c0',
  boxShadow: '0 6px 16px rgba(0, 0, 0, 0.25)'
};

const DROPDOWN_STYLE = {
  position: 'absolute',
  bottom: '50px',
  left: '50%',
  transform: 'translateX(-50%)',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  padding: '12px 0',
  minWidth: '220px',
  maxHeight: '260px',
  overflowY: 'auto',
  scrollbarWidth: 'thin',
  scrollbarColor: '#bbb transparent',
  WebkitOverflowScrolling: 'touch',
  animation: 'fadeSlideUp 0.2s ease-out'
};

const DROPDOWN_ITEM_STYLE = {
  display: 'flex',
  alignItems: 'center',
  padding: '10px 16px',
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
  gap: '12px'
};

const DROPDOWN_ITEM_HOVER_STYLE = {
  ...DROPDOWN_ITEM_STYLE,
  backgroundColor: '#f5f5f5'
};

const CHECKBOX_STYLE = {
  width: '18px',
  height: '18px',
  cursor: 'pointer',
  accentColor: SharedStyle.PRIMARY_COLOR.main || '#1976d2'
};

const LABEL_STYLE = {
  fontSize: '14px',
  color: '#333333',
  flex: 1,
  cursor: 'pointer'
};

const DIVIDER_STYLE = {
  height: '1px',
  backgroundColor: '#e0e0e0',
  margin: '8px 0'
};

const SECTION_TITLE_STYLE = {
  padding: '8px 16px 4px',
  fontSize: '11px',
  fontWeight: '600',
  color: '#888888',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

// View icon SVG component
const ViewIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
  </svg>
);

// Chevron icon component
const ChevronIcon = ({ up }) => (
  <svg 
    width="12" 
    height="12" 
    viewBox="0 0 24 24" 
    fill="currentColor"
    style={{ transform: up ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
  >
    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
  </svg>
);

// Default visibility settings
const DEFAULT_SETTINGS = {
  autoHideWalls: true,
  walls: true,
  furniture: true,
  doors: true,
  windows: true,
  grid: true,
  helpers: true,
  markers: true,
  guides: true,
  boundingBoxes: false,
  gestureZoom: false,
  gestureCameraPreview: false
};

export default function ViewSettingsPanel({ 
  onSettingsChange, 
  initialSettings = DEFAULT_SETTINGS,
  style = {}
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS, ...initialSettings });
  
  // Toggle dropdown
  const toggleDropdown = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);
  
  // Handle setting change
  const handleSettingChange = useCallback((key, value) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      if (onSettingsChange) {
        onSettingsChange(newSettings);
      }
      return newSettings;
    });
  }, [onSettingsChange]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest('.view-settings-panel')) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);
  
  // Add keyframe animation style and custom scrollbar
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @keyframes fadeSlideUp {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }
      .view-settings-panel .view-settings-dropdown::-webkit-scrollbar {
        width: 6px;
      }
      .view-settings-panel .view-settings-dropdown::-webkit-scrollbar-track {
        background: transparent;
      }
      .view-settings-panel .view-settings-dropdown::-webkit-scrollbar-thumb {
        background-color: #bbb;
        border-radius: 3px;
      }
      .view-settings-panel .view-settings-dropdown::-webkit-scrollbar-thumb:hover {
        background-color: #999;
      }
    `;
    document.head.appendChild(styleElement);
    return () => document.head.removeChild(styleElement);
  }, []);
  
  // Render a toggle item
  const renderToggleItem = (key, label, icon = null) => (
    <div
      key={key}
      style={hoveredItem === key ? DROPDOWN_ITEM_HOVER_STYLE : DROPDOWN_ITEM_STYLE}
      onMouseEnter={() => setHoveredItem(key)}
      onMouseLeave={() => setHoveredItem(null)}
      onClick={() => handleSettingChange(key, !settings[key])}
    >
      <input
        type="checkbox"
        checked={settings[key]}
        onChange={(e) => {
          e.stopPropagation();
          handleSettingChange(key, e.target.checked);
        }}
        style={CHECKBOX_STYLE}
      />
      {icon && <span style={{ color: '#666', width: '20px', display: 'flex', justifyContent: 'center' }}>{icon}</span>}
      <span style={LABEL_STYLE}>{label}</span>
    </div>
  );
  
  return (
    <div className="view-settings-panel" style={{ ...PANEL_STYLE, ...style }}>
      {/* Dropdown Panel */}
      {isOpen && (
        <div className="view-settings-dropdown" style={DROPDOWN_STYLE}>
          {/* Camera Section */}
          <div style={SECTION_TITLE_STYLE}>Camera Behavior</div>
          {renderToggleItem('autoHideWalls', 'Auto-hide Walls', '👁️')}
          
          <div style={DIVIDER_STYLE} />
          
          {/* Structure Section */}
          <div style={SECTION_TITLE_STYLE}>Structure</div>
          {renderToggleItem('walls', 'Walls', '🧱')}
          {renderToggleItem('doors', 'Doors', '🚪')}
          {renderToggleItem('windows', 'Windows', '🪟')}
          
          <div style={DIVIDER_STYLE} />
          
          {/* Objects Section */}
          <div style={SECTION_TITLE_STYLE}>Objects</div>
          {renderToggleItem('furniture', 'Furniture', '🪑')}
          
          <div style={DIVIDER_STYLE} />

          <div style={SECTION_TITLE_STYLE}>Hand Gestures</div>
          {renderToggleItem('gestureZoom', 'Enable Gesture Zoom', '✋')}
          {renderToggleItem('gestureCameraPreview', 'Show Camera Preview', '📷')}
          
          <div style={DIVIDER_STYLE} />
          
          {/* Helpers Section */}
          <div style={SECTION_TITLE_STYLE}>Helpers & Guides</div>
          {renderToggleItem('grid', 'Floor Grid', '📐')}
          {renderToggleItem('helpers', 'Axis Helpers', '➕')}
          {renderToggleItem('markers', 'Markers / Anchors', '📍')}
          {renderToggleItem('guides', 'Measurement Guides', '📏')}
          {renderToggleItem('boundingBoxes', 'Bounding Boxes', '⬜')}
        </div>
      )}
      
      {/* Main Button */}
      <button
        style={isHovered ? BUTTON_HOVER_STYLE : BUTTON_STYLE}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={toggleDropdown}
      >
        <ViewIcon />
        View
        <ChevronIcon up={isOpen} />
      </button>
    </div>
  );
}

ViewSettingsPanel.propTypes = {
  onSettingsChange: PropTypes.func,
  initialSettings: PropTypes.object,
  style: PropTypes.object
};

// Export default settings for external use
export { DEFAULT_SETTINGS };
