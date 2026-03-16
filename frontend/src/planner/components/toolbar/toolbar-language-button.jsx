import React, { Component } from 'react';
import PropTypes from 'prop-types';
import PlannerContext from '../../context/PlannerContext';
import { MdLanguage } from 'react-icons/md';
import * as SharedStyle from '../../shared-style';

const DROPDOWN_STYLE = {
  position: 'absolute',
  top: '100%',
  left: 0,
  backgroundColor: SharedStyle.PRIMARY_COLOR.main,
  border: '1px solid #555',
  borderRadius: '4px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  zIndex: 1000,
  minWidth: '150px',
  marginTop: '5px'
};

const LANGUAGE_ITEM_STYLE = {
  padding: '10px 15px',
  cursor: 'pointer',
  color: SharedStyle.COLORS.white,
  borderBottom: `1px solid ${SharedStyle.PRIMARY_COLOR.alt}`,
  transition: 'background-color 0.2s',
  whiteSpace: 'nowrap',
  fontSize: '14px'
};

const LANGUAGE_ITEM_HOVER_STYLE = {
  backgroundColor: '#3A3B3F'
};

const BUTTON_STYLE = {
  width: '50px',
  height: '50px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  fontSize: '25px',
  border: 'none',
  margin: 0,
  padding: 0,
  backgroundColor: SharedStyle.PRIMARY_COLOR.main,
  color: SharedStyle.COLORS.white,
  cursor: 'pointer',
  position: 'relative',
  transition: 'all 0.2s ease'
};

export default class ToolbarLanguageButton extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isOpen: false
    };
  }

  toggleDropdown = () => {
    this.setState(prevState => ({ isOpen: !prevState.isOpen }));
  };

  handleLanguageSelect = (languageCode) => {
    const { translator } = this.context;
    translator.setLocale(languageCode);
    this.setState({ isOpen: false });
    
    // Force complete app re-render to update all translated strings
    window.dispatchEvent(new Event('languageChanged'));
    
    // Trigger parent updates
    if (this.props.onLanguageChange) {
      this.props.onLanguageChange(languageCode);
    }
  };

  render() {
    const { translator } = this.context;
    const { isOpen } = this.state;
    const currentLocale = translator.getLocale();
    const languages = translator.getAvailableLanguages();

    return (
      <div style={{ position: 'relative' }}>
        <button
          style={{
            ...BUTTON_STYLE,
            backgroundColor: isOpen ? SharedStyle.PRIMARY_COLOR.alt : SharedStyle.PRIMARY_COLOR.main
          }}
          onClick={this.toggleDropdown}
          title="Change Language"
        >
          <MdLanguage />
        </button>
        {isOpen && (
          <div style={DROPDOWN_STYLE}>
            {languages.map(lang => (
              <div
                key={lang.code}
                style={{
                  ...LANGUAGE_ITEM_STYLE,
                  backgroundColor: currentLocale === lang.code ? SharedStyle.PRIMARY_COLOR.alt : 'transparent',
                  fontWeight: currentLocale === lang.code ? 'bold' : 'normal'
                }}
                onClick={() => this.handleLanguageSelect(lang.code)}
                onMouseEnter={(e) => {
                  if (currentLocale !== lang.code) {
                    e.target.style.backgroundColor = LANGUAGE_ITEM_HOVER_STYLE.backgroundColor;
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentLocale !== lang.code) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {lang.name}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
}

ToolbarLanguageButton.propTypes = {
  onLanguageChange: PropTypes.func
};

ToolbarLanguageButton.contextType = PlannerContext;
