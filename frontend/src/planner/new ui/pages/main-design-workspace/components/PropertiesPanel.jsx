import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Seq } from 'immutable';
import Icon from '../../../components/AppIcon';
import PanelLayerElements from '../../../../components/sidebar/panel-layer-elements';
import ElementEditor from '../../../../components/sidebar/panel-element-editor/element-editor';
import PanelGroupEditor from '../../../../components/sidebar/panel-group-editor';
import SmartPreview from './SmartPreview';
import './PropertiesPanel.css';
import { usePlanner } from '../../../../context/PlannerContext';

const PropertiesPanel = ({ state, workspaceMode }) => {
  const { projectActions, catalog, translator, sceneActions, linesActions, holesActions, itemsActions, areaActions, groupsActions } = usePlanner();
  const [activeSection, setActiveSection] = useState('properties'); // 'properties' | 'elements'
  const t = (text, ...args) => (translator && translator.t ? translator.t(text, ...args) : text);

  if (!state) return null;

  const scene = state.get('scene');
  const mode = state.get('mode');
  const selectedLayer = scene.getIn(['layers', scene.get('selectedLayer')]);
  
  // Get selected elements
  const selected = selectedLayer.get('selected');
  const multiselected =
    selected.lines.size > 1 ||
    selected.items.size > 1 ||
    selected.holes.size > 1 ||
    selected.areas.size > 1 ||
    selected.lines.size + selected.items.size + selected.holes.size + selected.areas.size > 1;

  const selectedGroup = scene.get('groups').findEntry(g => g.get('selected'));

  // Render selected elements
  const renderElementEditors = () => {
    if (multiselected) {
      return <div style={{ padding: '10px' }}>{t('Multiple elements selected')}</div>;
    }

    return Seq()
      .concat(selectedLayer.lines, selectedLayer.holes, selectedLayer.areas, selectedLayer.items)
      .filter(element => element.selected && element.id && element.type)
      .map(element => (
        <div key={element.id} style={{ padding: '5px 15px' }}>
          <h4 style={{ margin: '10px 0', fontSize: '14px', color: '#666' }}>
            {t(element.type)} [{element.id}]
          </h4>
          <ElementEditor element={element} layer={selectedLayer} state={state} />
        </div>
      ))
      .valueSeq()
      .toArray();
  };

  return (
    <div className="right-panel-container">
      {/* Smart Preview — 2D minimap in 3D mode, 3D preview in 2D mode */}
      <SmartPreview workspaceMode={workspaceMode} />

      {/* Properties Panel */}
      <div className="properties-panel">
      {/* Header */}
      <div className="properties-header">
        <h3 className="properties-title">{t('Properties')}</h3>
      </div>

      {/* Tab Navigation */}
      <div className="properties-tabs">
        <button
          className={`tab-btn ${activeSection === 'properties' ? 'active' : ''}`}
          onClick={() => setActiveSection('properties')}
        >
          <Icon name="Settings" size={16} />
          {t('Elements')}
        </button>
        <button
          className={`tab-btn ${activeSection === 'elements' ? 'active' : ''}`}
          onClick={() => setActiveSection('elements')}
        >
          <Icon name="Layers" size={16} />
          {t('Layer Items')}
        </button>
      </div>

      {/* Content Area */}
      <div className="properties-content">
        {activeSection === 'properties' && (
          <div className="properties-section">
            {renderElementEditors()}
            {!multiselected && selected.lines.size === 0 && selected.items.size === 0 && selected.holes.size === 0 && selected.areas.size === 0 && (
              <div className="floor-info-section">
                <h4 className="section-title">{t('Floor Information')}</h4>
                
                <div className="info-grid">
                  <div className="info-card">
                    <p className="info-label">{t('Selected Layer')}</p>
                    <p className="info-value">{selectedLayer.get('name') || t('Layer 1')}</p>
                  </div>
                  <div className="info-card">
                    <p className="info-label">{t('Altitude')}</p>
                    <p className="info-value">{selectedLayer.get('altitude') || 0}m</p>
                  </div>
                  <div className="info-card">
                    <p className="info-label">{t('Lines')}</p>
                    <p className="info-value">{selectedLayer.lines.size}</p>
                  </div>
                  <div className="info-card">
                    <p className="info-label">{t('Items')}</p>
                    <p className="info-value">{selectedLayer.items.size}</p>
                  </div>
                  <div className="info-card">
                    <p className="info-label">{t('Holes')}</p>
                    <p className="info-value">{selectedLayer.holes.size}</p>
                  </div>
                  <div className="info-card">
                    <p className="info-label">{t('Areas')}</p>
                    <p className="info-value">{selectedLayer.areas.size}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'elements' && (
          <div className="properties-section">
            <PanelLayerElements mode={mode} layers={scene.layers} selectedLayer={scene.selectedLayer} />
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

PropertiesPanel.propTypes = {
  state: PropTypes.object,
  workspaceMode: PropTypes.string,
};



export default PropertiesPanel;