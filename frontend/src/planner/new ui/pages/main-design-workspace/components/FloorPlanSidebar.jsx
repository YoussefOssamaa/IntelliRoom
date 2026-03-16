import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import { useTranslator } from '../../../../translator/TranslatorContext';
import './FloorPlanSidebar.css';

const FloorPlanSidebar = ({ isOpen, onClose, linesActions, holesActions }) => {
  const { t } = useTranslator();
  const [expandedSection, setExpandedSection] = useState('drawRoom');

  const handleToolClick = (toolId) => {
    if (!linesActions && !holesActions) return;

    switch(toolId) {
      case 'straightWall':
        linesActions.selectToolDrawingLine('wall');
        break;
      case 'doorOpening':
        holesActions.selectToolDrawingHole('door');
        break;
      case 'windowOpening':
        holesActions.selectToolDrawingHole('window');
        break;
      case 'drawArea':
      case 'arcWall':
      case 'beam':
      case 'column':
        console.log(`Tool ${toolId} is not implemented yet`);
        break;
      default:
        console.log(`Unknown tool: ${toolId}`);
    }
  };

  const sections = [
    {
      id: 'drawRoom',
      title: 'Draw Room',
      tools: [
        { id: 'straightWall', icon: 'Minus', label: 'Draw Straight Wall', enabled: true },
        { id: 'drawArea', icon: 'Square', label: 'Draw Area', enabled: false },
        { id: 'arcWall', icon: 'Smile', label: 'Draw Arc Wall', enabled: false }
      ]
    },
    {
      id: 'doorsWindows',
      title: 'Doors & Windows',
      tools: [
        { id: 'doorOpening', icon: 'DoorOpen', label: 'Door Opening', enabled: true },
        { id: 'windowOpening', icon: 'RectangleHorizontal', label: 'Window Opening', enabled: true }
      ]
    },
    {
      id: 'structure',
      title: 'Structure',
      tools: [
        { id: 'beam', icon: 'Columns', label: 'Beam', enabled: false },
        { id: 'column', icon: 'Pilcrow', label: 'Column', enabled: false }
      ]
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="floorplan-sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">{t('Floor Plan Tools')}</h2>
        <button onClick={onClose} className="close-btn">
          <Icon name="X" size={20} />
        </button>
      </div>
      <div className="sidebar-content">
        {sections?.map((section) => (
          <div key={section?.id} className="section-group">
            <button
              onClick={() => setExpandedSection(expandedSection === section?.id ? null : section?.id)}
              className="section-header"
            >
              <span className="section-title">{t(section?.title)}</span>
              <Icon
                name="ChevronDown"
                size={20}
                className={`chevron-icon ${expandedSection === section?.id ? 'rotated' : ''}`}
              />
            </button>

            {expandedSection === section?.id && (
              <div className="tools-list">
                {section?.tools?.map((tool) => (
                  <button
                    key={tool?.id}
                    className={`tool-item ${!tool?.enabled ? 'tool-disabled' : ''}`}
                    onClick={() => tool?.enabled && handleToolClick(tool?.id)}
                    disabled={!tool?.enabled}
                  >
                    <div className="tool-icon">
                      <Icon name={tool?.icon} size={20} />
                    </div>
                    <span className="tool-label">{t(tool?.label)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FloorPlanSidebar;