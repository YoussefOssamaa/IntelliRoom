import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { Map } from 'immutable';
import {
  Models as PlannerModels,
  reducer as PlannerReducer,
  Plugins as PlannerPlugins,
} from 'react-planner';
import axios from '../../config/axios.config';
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
  const { projectId } = useParams();
  const storeRef = useRef(null);
  const [isLoading, setIsLoading] = useState(!!projectId);

  if (!storeRef.current) {
    storeRef.current = createPlannerStore();

    // Initialize plugins
    const plugins = [
      PlannerPlugins.Keyboard(),
      PlannerPlugins.ConsoleDebugger(),
    ];

    plugins.forEach((plugin) =>
      plugin(storeRef.current, (state) => state.get('react-planner'))
    );

    // Initialize catalog
    storeRef.current.dispatch({ type: 'INIT_CATALOG', catalog: MyCatalog });
  }

  useEffect(() => {
    if (projectId) {
      const fetchProjectData = async () => {
        try {
          const response = await axios.get(`/design2D3D/${projectId}`, { withCredentials: true });
          
          if (response.data) {
            // جلب بيانات الـ JSON الخاصة بالتصميم سواء كانت مخزنة في projectJson أو data مباشرة
            const projectData = response.data.projectJson || response.data.data;
            
            if (projectData) {
              storeRef.current.dispatch({
                type: 'LOAD_PROJECT',
                sceneJSON: typeof projectData === 'string' ? JSON.parse(projectData) : projectData,
              });
            }
          }
        } catch (error) {
          console.error("Error loading project into 3D Planner:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchProjectData();
    }
  }, [projectId]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#F3F4F6', color: '#374151' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>loading your project</p>
          <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>setting up the 3d environment</p>
        </div>
      </div>
    );
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