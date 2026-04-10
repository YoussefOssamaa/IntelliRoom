import React, { useEffect, useRef } from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { Map } from 'immutable';
import {
  Models as PlannerModels,
  reducer as PlannerReducer,
  Plugins as PlannerPlugins,
} from 'react-planner';
import { TranslatorProvider } from '../../planner/translator/TranslatorContext';
import MainDesignWorkspace from '../../planner/new ui/pages/main-design-workspace';
import MyCatalog from '../../planner/catalog/mycatalog';

// Create a separate Redux store for the planner
function createPlannerStore() {
  const AppState = Map({
    'react-planner': new PlannerModels.State(),
  });

  const reducer = (state, action) => {
    state = state || AppState;
    state = state.update('react-planner', (plannerState) =>
      PlannerReducer(plannerState, action)
    );
    return state;
  };

  return configureStore({
    reducer,
    devTools: true,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
        immutableCheck: false,
      }),
  });
}

const PlannerPage = () => {
  const storeRef = useRef(null);

  if (!storeRef.current) {
    storeRef.current = createPlannerStore();

    // Initialize plugins
    const plugins = [
      PlannerPlugins.Keyboard(),
      PlannerPlugins.Autosave('react-planner_v1'),
      PlannerPlugins.ConsoleDebugger(),
    ];

    plugins.forEach((plugin) =>
      plugin(storeRef.current, (state) => state.get('react-planner'))
    );

    // Initialize catalog
    storeRef.current.dispatch({ type: 'INIT_CATALOG', catalog: MyCatalog });
  }

  return (
    <Provider store={storeRef.current}>
      <TranslatorProvider>
        <MainDesignWorkspace />
      </TranslatorProvider>
    </Provider>
  );
};

export default PlannerPage;
