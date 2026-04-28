import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import { useTranslator } from '../../../../translator/TranslatorContext';
import './RenderLeftSidebar.css';

const RESOLUTION_OPTIONS = [
  { id: '2k', label: '2K', value: '2000 × 1000' },
  { id: '3k', label: '3K', value: '3000 × 1500' },
  { id: '4k', label: '4K', value: '4000 × 2000' },
  { id: '8k', label: '8K', value: '8000 × 4000' },
];

const ROOM_TYPE_OPTIONS = [
  { id: 'bedroom', label: 'Bedroom', accent: 'bedroom' },
  { id: 'living room', label: 'Living Room', accent: 'living-room' },
  { id: 'kitchen', label: 'Kitchen', accent: 'kitchen' },
  { id: 'bathroom', label: 'Bathroom', accent: 'bathroom' },
  { id: 'dining room', label: 'Dining Room', accent: 'dining-room' },
  { id: 'office', label: 'Office', accent: 'office' },
];

const RenderLeftSidebar = ({
  selectedResolution,
  onResolutionChange,
  selectedRoomType,
  onRoomTypeChange,
  captureSummaryText,
  hasCapturedItems,
  hasSelectedCapture,
  isCollapsed,
  onCollapsedChange,
}) => {
  const { t } = useTranslator();
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false);
  const resolvedIsCollapsed =
    typeof isCollapsed === 'boolean' ? isCollapsed : internalIsCollapsed;

  const handleCollapsedChange = (nextValueOrUpdater) => {
    const nextValue =
      typeof nextValueOrUpdater === 'function'
        ? nextValueOrUpdater(resolvedIsCollapsed)
        : nextValueOrUpdater;

    if (typeof onCollapsedChange === 'function') {
      onCollapsedChange(Boolean(nextValue));
    }

    if (typeof isCollapsed !== 'boolean') {
      setInternalIsCollapsed(Boolean(nextValue));
    }
  };

  return (
    <aside className={`render-left-sidebar ${resolvedIsCollapsed ? 'collapsed' : ''}`}>
      <button
        type="button"
        className={`render-left-collapse-handle ${resolvedIsCollapsed ? 'collapsed' : ''}`}
        onClick={() => handleCollapsedChange((currentValue) => !currentValue)}
        aria-label={resolvedIsCollapsed ? t('Expand resolution panel') : t('Collapse resolution panel')}
      >
        <Icon name={resolvedIsCollapsed ? 'ChevronRight' : 'ChevronLeft'} size={14} />
      </button>

      {!resolvedIsCollapsed && (
      <div className="render-left-panel">
        <h3 className="render-left-title">{t('Resolution')}</h3>

        <div className="render-quality-list">
          {RESOLUTION_OPTIONS.map((option) => (
          <button
            key={option.id}
            className={`render-quality-option ${selectedResolution === option.id ? 'active' : ''}`}
            onClick={() => onResolutionChange(option.id)}
          >
            <span className="render-quality-label">{option.label}</span>
            <span className="render-quality-credits">{option.value}</span>
          </button>
          ))}
        </div>

        <div className="render-left-section-divider" />
        <h3 className="render-left-title secondary">{t('Room Type')}</h3>

        <div className="render-left-room-panel">
          <div className={`render-left-room-grid ${selectedRoomType ? 'compact' : ''}`}>
            {ROOM_TYPE_OPTIONS.map((option) => {
              const isSelected = selectedRoomType === option.id;
              return (
                <label
                  key={option.id}
                  className={`render-left-room-option ${isSelected ? 'selected' : ''} ${option.accent}`}
                >
                  <span className="render-left-room-radio">
                    <input
                      type="radio"
                      name="render-room-type"
                      checked={isSelected}
                      onChange={() => onRoomTypeChange(option.id)}
                    />
                    <span>{t(option.label)}</span>
                  </span>

                  {!selectedRoomType && (
                    <span className="render-left-room-visual" aria-hidden="true">
                      <span className="room-visual-badge">{option.label.slice(0, 1)}</span>
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          <div className="render-left-summary-panel">
            <div className="render-left-summary-title">{t('Frame Summary')}</div>
            <p className="render-left-summary-text">
              {captureSummaryText || t('Capture a frame to generate a room summary.')}
            </p>
            {!hasCapturedItems && hasSelectedCapture && (
              <p className="render-left-summary-hint">{t('No visible items were detected in this frame.')}</p>
            )}
          </div>
        </div>
      </div>
      )}
    </aside>
  );
};

export default RenderLeftSidebar;
