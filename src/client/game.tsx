import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PreCheckPost } from './ui/preCheckPost';

export const App = () => {
  return <PreCheckPost />;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
