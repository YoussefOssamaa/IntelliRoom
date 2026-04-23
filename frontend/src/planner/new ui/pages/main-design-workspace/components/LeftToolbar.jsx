import React from 'react';
import Icon from '../../../components/AppIcon';
import { useTranslator } from '../../../../translator/TranslatorContext';
import './LeftToolbar.css';

const LeftToolbar = ({ activeTab, onTabChange }) => {
  const { t } = useTranslator();
  const tools = [
    { id: 'floorplan', icon: 'LayoutGrid', label: 'Floor Plan' },
    { id: 'models', icon: 'Box', label: 'Models' },
    { id: 'gallery', icon: 'Image', label: 'Gallery' },
    { id: 'gestures', icon: 'Hand', label: 'Hand Gestures' },
    { id: 'render', icon: 'Eye', label: 'Render' },
    { id: 'advanced', icon: 'Settings', label: 'Advanced Tools' }
  ];

  return (
    <div className="left-toolbar">
      {tools?.map((tool) => (
        <button
          key={tool?.id}
          onClick={() => onTabChange(tool?.id)}
          className={`toolbar-btn ${activeTab === tool?.id ? 'active' : ''}`}
          title={t(tool?.label)}
        >
          <Icon name={tool?.icon} size={24} />
        </button>
      ))}
    </div>
  );
};

export default LeftToolbar;
