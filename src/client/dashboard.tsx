import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ModDashboard } from './ui/modDashboard';

export const DashboardApp = () => {
  return <ModDashboard />;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DashboardApp />
  </StrictMode>
);
