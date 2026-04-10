import React, { createContext, useContext } from 'react';

const PlannerContext = createContext({});

export const usePlanner = () => useContext(PlannerContext);

export const PlannerProvider = PlannerContext.Provider;

export default PlannerContext;
