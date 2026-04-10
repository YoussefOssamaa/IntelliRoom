import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import Icon from '../../../components/AppIcon';
import { useTranslator } from '../../../../translator/TranslatorContext';
import './TopNavigationBar.css';

const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'ar', name: 'العربية', flag: '🇪🇬' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
];

const UNIT_OPTIONS = [
  { value: 'mm', label: 'Millimetres (mm)' },
  { value: 'cm', label: 'Centimetres (cm)' },
  { value: 'm',  label: 'Metres (m)' },
  { value: 'in', label: 'Inches (in)' },
  { value: 'ft', label: 'Feet (ft)' },
];

const TopNavigationBar = ({
  onUndo,
  onRedo,
  onClear,
  onSave,
  onLoad,
  projectActions,
  plannerState,
  plannerUser,
  isAuthenticated,
  onSignIn,
  onOpenDashboard,
}) => {
  const [showClearMenu, setShowClearMenu] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showToolkitMenu, setShowToolkitMenu] = useState(false);
  const [showUnitSubmenu, setShowUnitSubmenu] = useState(false);
  const toolkitRef = useRef(null);
  
  const { translator, currentLocale, setLocale, t } = useTranslator();
  const currentLanguage = AVAILABLE_LANGUAGES.find(l => l.code === currentLocale) || AVAILABLE_LANGUAGES[0];

  const handleLanguageChange = (langCode) => {
    setLocale(langCode);
    setShowLanguageMenu(false);
  };

  // Current unit from Redux
  const currentUnit = plannerState ? plannerState.getIn(['scene', 'unit']) || 'cm' : 'cm';

  const handleUnitChange = (unitValue) => {
    if (projectActions) {
      // Preserve current mode — setProjectProperties resets to MODE_IDLE
      const currentMode = plannerState ? plannerState.get('mode') : null;
      projectActions.setProjectProperties({ unit: unitValue });
      if (currentMode && currentMode !== 'MODE_IDLE') {
        // Restore previous mode after the unit change
        setTimeout(() => projectActions.setMode(currentMode), 0);
      }
    }
    setShowUnitSubmenu(false);
    setShowToolkitMenu(false);
  };

  const handleMeasure = () => {
    if (projectActions) {
      projectActions.setMode('MODE_3D_MEASURE');
    }
    setShowToolkitMenu(false);
  };

  const handleClearMeasurements = () => {
    if (window.__viewer3DMeasureTool) {
      window.__viewer3DMeasureTool.clearAll();
    }
    setShowToolkitMenu(false);
  };

  // Close toolkit on outside click
  useEffect(() => {
    const handler = (e) => {
      if (showToolkitMenu && toolkitRef.current && !toolkitRef.current.contains(e.target)) {
        setShowToolkitMenu(false);
        setShowUnitSubmenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showToolkitMenu]);

  const clearCategories = [
    'All',
    'Decoration',
    'Dimension',
    'Annotation',
    'Furniture',
    'Parametric ceiling',
    'Finishes',
    'Custom furniture',
    'Reference line'
  ];

  const userInitial = plannerUser?.name ? plannerUser.name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="top-nav-bar">
      {/* Left Section - Logo */}
      <div className="top-nav-left">
        <div className="logo-container">
          <div className="logo-icon">
            <Icon name="Home" size={20} color="white" />
          </div>
          <a href="/" className="logo-text">
            <span className="logo-text">InteliRoom AI</span>
          </a>
        </div>
      </div>

      {/* Center Section - File Operations and Tools */}
      <div className="top-nav-center">
        <button className="nav-button" onClick={onLoad}>
          <Icon name="FolderOpen" size={16} />
          {t('Load Project')}
        </button>

        <button className="nav-button primary-btn" onClick={onSave}>
          <Icon name="Save" size={16} />
          {t('Save')}
        </button>

        <button className="nav-button icon-btn" onClick={onUndo} title={t('Undo')}>
          <Icon name="Undo" size={20} />
        </button>

        <button className="nav-button icon-btn" onClick={onRedo} title={t('Redo')}>
          <Icon name="Redo" size={20} />
        </button>

        {/* Clear Dropdown - Moved to Center */}
        <div className="dropdown-container">
          <button
            className="nav-button dropdown-btn outline-btn"
            onClick={() => setShowClearMenu(!showClearMenu)}
          >
            {t('Clear')}
            <Icon name="ChevronDown" size={16} />
          </button>
          {showClearMenu && (
            <div className="dropdown-menu">
              {clearCategories?.map((category) => (
                <button
                  key={category}
                  className="dropdown-item"
                  onClick={() => {
                    onClear(category);
                    setShowClearMenu(false);
                  }}
                >
                  <Icon name="Trash2" size={16} />
                  {t(category)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Toolkit Dropdown */}
        <div className="dropdown-container" ref={toolkitRef}>
          <button
            className="nav-button dropdown-btn outline-btn"
            onClick={() => { setShowToolkitMenu(!showToolkitMenu); setShowUnitSubmenu(false); }}
          >
            <Icon name="Wrench" size={16} />
            {t('Toolkit')}
            <Icon name="ChevronDown" size={16} />
          </button>
          {showToolkitMenu && (
            <div className="dropdown-menu toolkit-dropdown">
              {/* Measurement Unit */}
              <div className="dropdown-item-parent">
                <button
                  className="dropdown-item"
                  onClick={() => setShowUnitSubmenu(!showUnitSubmenu)}
                >
                  <Icon name="Ruler" size={16} />
                  {t('Measurement Unit')}
                  <Icon name="ChevronRight" size={14} style={{ marginLeft: 'auto' }} />
                </button>
                {showUnitSubmenu && (
                  <div className="submenu">
                    {UNIT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        className={`dropdown-item ${currentUnit === opt.value ? 'active' : ''}`}
                        onClick={() => handleUnitChange(opt.value)}
                      >
                        {t(opt.label)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Measure Tool */}
              <button className="dropdown-item" onClick={handleMeasure}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" />
                  <path d="m14.5 12.5 2-2" /><path d="m11.5 9.5 2-2" /><path d="m8.5 6.5 2-2" /><path d="m17.5 15.5 2-2" />
                </svg>
                {t('Measure')}
              </button>

              {/* Clear Measurements */}
              <button className="dropdown-item" onClick={handleClearMeasurements}>
                <Icon name="XCircle" size={16} />
                {t('Clear Measurements')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Section - Language, Help and Profile */}
      <div className="top-nav-right">
        {/* Language Selector */}
        <div className="dropdown-container">
          <button
            className="nav-button dropdown-btn"
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
            title={t('Change Language')}
          >
            <span className="language-flag">{currentLanguage.flag}</span>
            <span className="language-name">{currentLanguage.name}</span>
            <Icon name="ChevronDown" size={16} />
          </button>
          {showLanguageMenu && (
            <div className="dropdown-menu dropdown-menu-right">
              {AVAILABLE_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  className={`dropdown-item ${currentLocale === lang.code ? 'active' : ''}`}
                  onClick={() => handleLanguageChange(lang.code)}
                >
                  <span className="language-flag">{lang.flag}</span>
                  {lang.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="nav-button icon-btn" title={t('Help')}>
          <Icon name="HelpCircle" size={20} />
        </button>

        {isAuthenticated ? (
          <button className="profile-container" onClick={onOpenDashboard}>
            <div className="profile-avatar">
              {plannerUser?.profilePictureUrl ? (
                <img
                  src={plannerUser.profilePictureUrl}
                  alt={plannerUser?.name || t('User')}
                  className="profile-avatar-image"
                />
              ) : (
                <span className="profile-initial">{userInitial}</span>
              )}
            </div>
            <span className="subscription-badge">{plannerUser?.plan || t('Free')}</span>
          </button>
        ) : (
          <button className="nav-button outline-btn" onClick={onSignIn}>
            <Icon name="LogIn" size={16} />
            {t('Sign In')}
          </button>
        )}
      </div>
    </div>
  );
};

export default TopNavigationBar;