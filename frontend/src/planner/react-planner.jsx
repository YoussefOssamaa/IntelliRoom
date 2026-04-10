import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {bindActionCreators} from 'redux';
import {connect, ReactReduxContext} from 'react-redux';

import Translator from './translator/translator';
import Catalog from './catalog/catalog';
import actions from './actions/export';
import {objectsMap} from './utils/objects-utils';
import {
  ToolbarComponents,
  Content,
  SidebarComponents,
  FooterBarComponents
} from './components/export';
import {VERSION} from './version';
import { PlannerProvider } from './context/PlannerContext';
import './styles/export';

const {Toolbar} = ToolbarComponents;
const {Sidebar} = SidebarComponents;
const {FooterBar} = FooterBarComponents;

const toolbarW = 50;
const sidebarW = 300;
const footerBarH= 20;

const wrapperStyle = {
  display: 'flex',
  flexFlow: 'row nowrap'
};

class ReactPlanner extends Component {

  constructor(props, context) {
    super(props, context);
    this.state = {
      languageKey: 0
    };
    this.handleLanguageChange = this.handleLanguageChange.bind(this);
  }

  getPlannerContextValue() {
    return {
      ...objectsMap(actions, actionNamespace => this.props[actionNamespace]),
      translator: this.props.translator,
      catalog: this.props.catalog,
    };
  }

  componentDidMount() {
    let store = this.context?.store || this.context;
    let {projectActions, catalog, stateExtractor, plugins} = this.props;
    plugins.forEach(plugin => plugin(store, stateExtractor));
    projectActions.initCatalog(catalog);
    
    // Listen for language changes
    window.addEventListener('languageChanged', this.handleLanguageChange);
  }

  componentWillUnmount() {
    window.removeEventListener('languageChanged', this.handleLanguageChange);
  }

  handleLanguageChange() {
    this.setState(prevState => ({
      languageKey: prevState.languageKey + 1
    }));
  }

  componentDidUpdate(prevProps) {
    let {stateExtractor, state, projectActions, catalog} = this.props;
    let plannerState = stateExtractor(state);
    let catalogReady = plannerState.getIn(['catalog', 'ready']);
    if (!catalogReady) {
      projectActions.initCatalog(catalog);
    }
  }

  render() {
    let {width, height, state, stateExtractor, ...props} = this.props;

    let contentW = width - toolbarW - sidebarW;
    let toolbarH = height - footerBarH;
    let contentH = height - footerBarH;
    let sidebarH = height - footerBarH;

    let extractedState = stateExtractor(state);

    return (
      <PlannerProvider value={this.getPlannerContextValue()}>
        <div style={{...wrapperStyle, height}}>
          <Toolbar width={toolbarW} height={toolbarH} state={extractedState} {...props} />
          <Content width={contentW} height={contentH} state={extractedState} {...props} />
          <Sidebar width={sidebarW} height={sidebarH} state={extractedState} {...props} />
          <FooterBar width={width} height={footerBarH} state={extractedState} {...props} />
        </div>
      </PlannerProvider>
    );
  }
}

ReactPlanner.propTypes = {
  translator: PropTypes.instanceOf(Translator),
  catalog: PropTypes.instanceOf(Catalog),
  allowProjectFileSupport: PropTypes.bool,
  plugins: PropTypes.arrayOf(PropTypes.func),
  autosaveKey: PropTypes.string,
  autosaveDelay: PropTypes.number,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  stateExtractor: PropTypes.func.isRequired,
  toolbarButtons: PropTypes.array,
  sidebarComponents: PropTypes.array,
  footerbarComponents: PropTypes.array,
  customContents: PropTypes.object,
  softwareSignature: PropTypes.string
};

ReactPlanner.contextType = ReactReduxContext;

ReactPlanner.defaultProps = {
  translator: new Translator(),
  catalog: new Catalog(),
  plugins: [],
  allowProjectFileSupport: true,
  softwareSignature: `React-Planner ${VERSION}`,
  toolbarButtons: [],
  sidebarComponents: [],
  footerbarComponents: [],
  customContents: {},
};

//redux connect
function mapStateToProps(reduxState) {
  return {
    state: reduxState
  }
}

function mapDispatchToProps(dispatch) {
  return objectsMap(actions, actionNamespace => bindActionCreators(actions[actionNamespace], dispatch));
}

export default connect(mapStateToProps, mapDispatchToProps)(ReactPlanner);
