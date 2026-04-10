import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import TopNavigationBar from './components/TopNavigationBar';
import LeftToolbar from './components/LeftToolbar';
import FloorPlanSidebar from './components/FloorPlanSidebar';
import ModelsSidebar from './components/ModelsSidebar';
import GallerySidebar from './components/GallerySidebar';
import AdvancedToolsSidebar from './components/AdvancedToolsSidebar';
import WorkspaceCanvas from './components/WorkspaceCanvas';
import PropertiesPanel from './components/PropertiesPanel';
import BottomRightControls from './components/BottomRightControls';

import * as actions from '../../../actions/export';
import { Translator, Catalog } from '../../../index';
import { useTranslator } from '../../../translator/TranslatorContext';
import { PlannerProvider } from '../../../context/PlannerContext';
import MyCatalog from '../../../catalog/mycatalog';
import { MODE_IDLE, MODE_3D_VIEW, MODE_3D_FIRST_PERSON } from '../../../constants';
import {
  getLatestProject,
  getPlannerUserProfile,
  savePlannerProject,
} from '../../../../services/plannerProjectService';
import './index.css';

// Wrapper component that uses the hook and passes translator to class component
const MainDesignWorkspaceWithTranslator = (props) => {
  const { translator, currentLocale } = useTranslator();

  // Memoize context value to prevent unnecessary re-renders of all usePlanner() consumers.
  // Without this, every Redux dispatch creates a new object reference, forcing Viewer2D
  // and all other context consumers to re-render even when actions haven't changed.
  // The standalone react-planner avoids this by using legacy context (childContextTypes)
  // which doesn't trigger consumer re-renders on value change.
  const plannerContextValue = useMemo(() => ({
    projectActions: props.projectActions,
    linesActions: props.linesActions,
    holesActions: props.holesActions,
    viewer3DActions: props.viewer3DActions,
    viewer2DActions: props.viewer2DActions,
    sceneActions: props.sceneActions,
    verticesActions: props.verticesActions,
    itemsActions: props.itemsActions,
    areaActions: props.areaActions,
    groupsActions: props.groupsActions,
    textureActions: props.textureActions,
    translator: translator,
    catalog: props.catalog || MyCatalog,
  }), [
    props.projectActions,
    props.linesActions,
    props.holesActions,
    props.viewer3DActions,
    props.viewer2DActions,
    props.sceneActions,
    props.verticesActions,
    props.itemsActions,
    props.areaActions,
    props.groupsActions,
    props.textureActions,
    translator,
    props.catalog,
  ]);

  return (
    <PlannerProvider value={plannerContextValue}>
      <MainDesignWorkspaceInner {...props} translator={translator} currentLocale={currentLocale} />
    </PlannerProvider>
  );
};

const MainDesignWorkspaceInner = ({ state, projectActions, linesActions, holesActions, viewer3DActions, itemsActions, textureActions }) => {
  const { t } = useTranslator();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(null);
  const [workspaceMode, setWorkspaceMode] = useState('2d');
  const [viewOpen, setViewOpen] = useState(false);
  const [viewSettings, setViewSettings] = useState({
    autoHideWalls: true, walls: true, furniture: true, doors: true,
    windows: true, grid: true, helpers: true, markers: true, guides: true, boundingBoxes: false
  });
  const fileInputRef = useRef(null);
  const viewMenuRef = useRef(null);
  const [plannerUser, setPlannerUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState(null);

  const plannerState = state ? state.get('react-planner') : null;

  useEffect(() => {
    let cancelled = false;

    const loadAuthProfile = async () => {
      const user = await getPlannerUserProfile();
      if (cancelled) return;

      if (user) {
        setPlannerUser(user);
        setIsAuthenticated(true);
      } else {
        setPlannerUser(null);
        setIsAuthenticated(false);
      }
    };

    loadAuthProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  // ──── Sync local workspaceMode with Redux mode (very important) ────
  const reduxMode = plannerState ? plannerState.get('mode') : null;
  useEffect(() => {
    if (!reduxMode) return;
    if (reduxMode === MODE_3D_VIEW || reduxMode === 'MODE_DRAWING_ITEM_3D' || reduxMode === 'MODE_DRAGGING_ITEM_3D' ||
        reduxMode === 'MODE_DRAWING_HOLE_3D' || reduxMode === 'MODE_DRAGGING_HOLE_3D' || reduxMode === 'MODE_APPLYING_TEXTURE' ||
        reduxMode === 'MODE_3D_MEASURE') {
      setWorkspaceMode('3d');
    } else if (reduxMode === MODE_3D_FIRST_PERSON) {
      setWorkspaceMode('3d-firstperson');
    } else {
      // All other modes are 2D modes
      if (workspaceMode !== '2d') setWorkspaceMode('2d');
    }
  }, [reduxMode]);

  // Close view dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (viewOpen && viewMenuRef.current && !viewMenuRef.current.contains(e.target)) setViewOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [viewOpen]);

  const handleTabChange = (tabId) => {
    if (tabId === 'render') {
      // Render button triggers first person view
      viewer3DActions.selectTool3DFirstPerson();
      setWorkspaceMode('3d-firstperson');
      setActiveTab(null);
    } else {
      setActiveTab(activeTab === tabId ? null : tabId);
    }
  };

  const handleCloseSidebar = () => {
    setActiveTab(null);
  };

  const getSidebarWidth = () => {
    switch (activeTab) {
      case 'floorplan':
        return 288;
      case 'models':
        return 600;
      case 'gallery':
        return 384;
      case 'advanced':
        return 320;
      default:
        return 0;
    }
  };

  const handleUndo = () => {
    if (projectActions) {
      projectActions.undo();
    }
  };

  const handleRedo = () => {
    if (projectActions) {
      projectActions.redo();
    }
  };

  const handleClear = (category) => {
    if (!projectActions) return;
    if (category === 'All') {
      projectActions.newProject();
    }
    // Other categories can be extended later
  };

  const handleSave = async () => {
    if (!projectActions || !plannerState) return;

    // If user isn't authenticated yet, keep existing local-file save behavior.
    if (!isAuthenticated) {
      projectActions.saveProject();
      return;
    }

    try {
      const sceneData = plannerState.get('scene').toJS();
      const savedProject = await savePlannerProject({
        projectId: currentProjectId,
        sceneData,
        title: 'Planner Project',
      });

      if (savedProject && savedProject._id) {
        setCurrentProjectId(savedProject._id);
      }
    } catch (error) {
      console.error('Error saving project to backend:', error);
      // Fallback to local-file save to avoid blocking user work
      projectActions.saveProject();
    }
  };

  const handleLoad = async () => {
    if (!projectActions) return;

    // If user isn't authenticated yet, keep existing local-file load behavior.
    if (!isAuthenticated) {
      if (fileInputRef.current) fileInputRef.current.click();
      return;
    }

    try {
      const latestProject = await getLatestProject();

      if (!latestProject || !latestProject.data) {
        // No cloud projects yet: fallback to local file picker
        if (fileInputRef.current) fileInputRef.current.click();
        return;
      }

      projectActions.loadProject(latestProject.data);
      if (latestProject._id) {
        setCurrentProjectId(latestProject._id);
      }
    } catch (error) {
      console.error('Error loading project from backend:', error);
      if (fileInputRef.current) fileInputRef.current.click();
    }
  };

  const handleFileLoad = (event) => {
    const file = event.target.files[0];
    if (file && projectActions) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const sceneJSON = JSON.parse(e.target.result);
          projectActions.loadProject(sceneJSON);
        } catch (error) {
          console.error('Error loading project:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Z / Cmd+Z = Undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        if (projectActions) projectActions.undo();
      }
      // Ctrl+Shift+Z / Cmd+Shift+Z = Redo
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (projectActions) projectActions.redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [projectActions]);

  // View dropdown toggle renderer — calls viewer3D.handleViewSettingsChange
  const renderViewToggle = useCallback((key, label) => (
    <div className="vd-item" key={key} onClick={() => setViewSettings(s => {
      const next = { ...s, [key]: !s[key] };
      // Push change to the 3D viewer's applyViewSettings
      if (window.__viewer3D && window.__viewer3D.handleViewSettingsChange) {
        window.__viewer3D.handleViewSettingsChange(next);
      }
      return next;
    })} style={{ cursor: 'pointer' }}>
      <input type="checkbox" checked={viewSettings[key]} readOnly style={{ pointerEvents: 'none' }} />
      <span>{label}</span>
    </div>
  ), [viewSettings]);

  return (
    <div className="main-workspace">
      {/* Hidden file input for loading projects */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileLoad}
      />

      {/* Top Navigation */}
      <TopNavigationBar
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onSave={handleSave}
        onLoad={handleLoad}
        projectActions={projectActions}
        plannerState={plannerState}
        plannerUser={plannerUser}
        isAuthenticated={isAuthenticated}
        onSignIn={() => navigate('/login')}
        onOpenDashboard={() => navigate('/dashboard')}
      />

      {/* Main Content Area */}
      <div className="main-content">
        {/* Left Toolbar */}
        <LeftToolbar activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Sidebars */}
        <FloorPlanSidebar 
          isOpen={activeTab === 'floorplan'} 
          onClose={handleCloseSidebar}
          linesActions={linesActions}
          holesActions={holesActions}
        />
        <ModelsSidebar 
          isOpen={activeTab === 'models'} 
          onClose={handleCloseSidebar}
          catalog={MyCatalog}
          itemsActions={itemsActions}
          holesActions={holesActions}
          textureActions={textureActions}
          plannerState={plannerState}
        />
        <GallerySidebar isOpen={activeTab === 'gallery'} onClose={handleCloseSidebar} />
        <AdvancedToolsSidebar isOpen={activeTab === 'advanced'} onClose={handleCloseSidebar} />

        {/* Main Workspace Canvas */}
        <WorkspaceCanvas 
          mode={workspaceMode} 
          plannerState={plannerState}
        />

        {/* Fixed Left Properties Panel + Preview */}
        <PropertiesPanel
          state={plannerState}
          workspaceMode={workspaceMode}
        />

        {/* ─── Bottom Mode Bar: segmented 2D/3D + View ─── */}
        <div className="mode-bar">
          <div className="segmented-control">
            <button
              className={`seg-btn ${workspaceMode === '2d' ? 'active' : ''}`}
              onClick={() => {
                projectActions.setMode(MODE_IDLE);
                setWorkspaceMode('2d');
              }}
            >
              2D
            </button>
            <button
              className={`seg-btn ${workspaceMode === '3d' || workspaceMode === '3d-firstperson' ? 'active' : ''}`}
              onClick={() => {
                viewer3DActions.selectTool3DView();
                setWorkspaceMode('3d');
              }}
            >
              3D
            </button>
          </div>

          {/* View settings dropdown */}
          <div className="view-menu-wrapper" ref={viewMenuRef}>
            <button className={`view-menu-btn ${viewOpen ? 'open' : ''}`} onClick={() => setViewOpen(v => !v)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
              {t('View')}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
            </button>
            {viewOpen && (
              <div className="view-dropdown">
                <div className="vd-section-title">{t('Camera')}</div>
                {renderViewToggle('autoHideWalls', t('👁️ Auto-hide Walls'))}
                <div className="vd-divider" />
                <div className="vd-section-title">{t('Structure')}</div>
                {renderViewToggle('walls', t('🧱 Walls'))}
                {renderViewToggle('doors', t('🚪 Doors'))}
                {renderViewToggle('windows', t('🪟 Windows'))}
                <div className="vd-divider" />
                <div className="vd-section-title">{t('Objects')}</div>
                {renderViewToggle('furniture', t('🪑 Furniture'))}
                <div className="vd-divider" />
                <div className="vd-section-title">{t('Helpers & Guides')}</div>
                {renderViewToggle('grid', t('📐 Floor Grid'))}
                {renderViewToggle('helpers', t('➕ Axis Helpers'))}
                {renderViewToggle('markers', t('📍 Markers'))}
                {renderViewToggle('guides', t('📏 Guides'))}
                {renderViewToggle('boundingBoxes', t('⬜ Bounding Boxes'))}
              </div>
            )}
          </div>
        </div>



        {/* Bottom-right controls: zoom + snap */}
        <BottomRightControls
          plannerState={plannerState}
          projectActions={projectActions}
          sidebarWidth={getSidebarWidth()}
        />
      </div>
    </div>
  );
};

// Redux connect
const mapStateToProps = (state) => {
  return {
    state: state
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    projectActions: bindActionCreators(actions.projectActions, dispatch),
    linesActions: bindActionCreators(actions.linesActions, dispatch),
    holesActions: bindActionCreators(actions.holesActions, dispatch),
    viewer3DActions: bindActionCreators(actions.viewer3DActions, dispatch),
    sceneActions: bindActionCreators(actions.sceneActions, dispatch),
    verticesActions: bindActionCreators(actions.verticesActions, dispatch),
    itemsActions: bindActionCreators(actions.itemsActions, dispatch),
    areaActions: bindActionCreators(actions.areaActions, dispatch),
    groupsActions: bindActionCreators(actions.groupsActions, dispatch),
    viewer2DActions: bindActionCreators(actions.viewer2DActions, dispatch),
    textureActions: bindActionCreators(actions.textureActions, dispatch),
  };
};

// Connect the wrapper component that includes the translator hook
const ConnectedMainDesignWorkspace = connect(mapStateToProps, mapDispatchToProps)(MainDesignWorkspaceWithTranslator);

export default ConnectedMainDesignWorkspace;