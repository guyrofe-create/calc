// src/main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';
import App from './App.jsx';

// הייבוא הנכון (שם קובץ מדויק):
import { setupPWAUpdate } from './pwa-update.js';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// הפעלת מנגנון עדכון ה-PWA
setupPWAUpdate();
