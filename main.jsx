import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { initA2HS } from './a2hs';

// רישום Service Worker עם לוגיקת עדכון
function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');

      // אם יש SW ממתין – נציע רענון
      if (reg.waiting) promptToReload(reg);

      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        newSW?.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            promptToReload(reg);
          }
        });
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // לאחר SKIP_WAITING, נטען מחדש
        window.location.reload();
      });
    } catch (err) {
      console.error('SW registration failed', err);
    }
  });
}

function promptToReload(reg) {
  if (confirm('יש גרסה חדשה. לרענן עכשיו?')) {
    reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
  }
}

// אתחול A2HS
initA2HS();
registerSW();

// רינדור האפליקציה
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
