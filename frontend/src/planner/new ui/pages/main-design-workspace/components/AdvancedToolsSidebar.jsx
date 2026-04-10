import React from 'react';
import Icon from '../../../components/AppIcon';
import { useTranslator } from '../../../../translator/TranslatorContext';
import './AdvancedToolsSidebar.css';

const AdvancedToolsSidebar = ({ isOpen, onClose }) => {
  const { t } = useTranslator();
  const advancedTools = [
    { id: 'measure', icon: 'Ruler', label: 'Measure Tool', description: 'Measure distances and areas' },
    { id: 'align', icon: 'AlignCenter', label: 'Align Objects', description: 'Align multiple objects' },
    { id: 'distribute', icon: 'Distribute', label: 'Distribute', description: 'Distribute objects evenly' },
    { id: 'group', icon: 'Group', label: 'Group Objects', description: 'Group multiple objects' },
    { id: 'duplicate', icon: 'Copy', label: 'Duplicate', description: 'Duplicate selected objects' },
    { id: 'mirror', icon: 'FlipHorizontal', label: 'Mirror', description: 'Mirror objects horizontally' },
    { id: 'rotate', icon: 'RotateCw', label: 'Rotate', description: 'Rotate objects precisely' },
    { id: 'scale', icon: 'Maximize2', label: 'Scale', description: 'Scale objects proportionally' }
  ];

  if (!isOpen) return null;

  return (
    <div className="advanced-sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">{t('Advanced Tools')}</h2>
        <button onClick={onClose} className="close-btn">
          <Icon name="X" size={20} />
        </button>
      </div>
      <div className="advanced-content">
        {advancedTools?.map((tool) => (
          <button key={tool?.id} className="advanced-tool-item">
            <div className="advanced-tool-icon">
              <Icon name={tool?.icon} size={24} />
            </div>
            <div className="advanced-tool-info">
              <h3 className="advanced-tool-label">{t(tool?.label)}</h3>
              <p className="advanced-tool-description">{t(tool?.description)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AdvancedToolsSidebar;