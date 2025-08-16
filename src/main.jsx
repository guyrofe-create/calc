// src/main.jsx (מלא)
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

import { setupPWAUpdate } from './pwa-update.js';
import { setupInstallPrompt } from './install-prompt.js'; // אופציונלי לכפתור "התקן לאפליקציה"

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// מפעיל פס עדכון (גרסה חדשה)
setupPWAUpdate();

// כפתור "התקן לאפליקציה" (אנדרואיד/דסקטופ; ב-iOS אין beforeinstallprompt)
setupInstallPrompt();
