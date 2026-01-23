import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MarketplacePage from './screens/PluginMarketplace';
import UploadImagePage from './screens/uploadImage';

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/upload" element={<UploadImagePage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/" element={<MarketplacePage />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
