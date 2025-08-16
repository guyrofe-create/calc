import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// ===== Service Worker register + update notice =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered:', reg.scope);

      // הצגת הודעת “גרסה חדשה” אם יש SW ממתין
      if (reg.waiting) showUpdateToast(reg);
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateToast(reg);
          }
        });
      });
    } catch (e) {
      console.error('SW register failed:', e);
    }
  });
}

function showUpdateToast(reg) {
  const bar = document.createElement('div');
  bar.textContent = 'גרסה חדשה זמינה • טען מחדש';
  bar.style.cssText = `
    position:fixed; bottom:16px; left:16px; right:16px; z-index:9999;
    background:#111; color:#fff; padding:10px 14px; border-radius:10px;
    text-align:center; cursor:pointer;`;
  bar.onclick = () => {
    reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
    // לאחר שה-SW נהיה "controller", רענון
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
  };
  document.body.appendChild(bar);
}

// ===== “התקן לאפליקציה” (beforeinstallprompt לדסקטופ/אנדרואיד) =====
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallButton();
});

function showInstallButton() {
  if (!deferredPrompt) return;
  const btn = document.createElement('button');
  btn.textContent = 'התקן לאפליקציה';
  btn.style.cssText = `
    position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
    z-index:9999; background:#111; color:#fff; padding:10px 14px;
    border-radius:999px; border:none; font-size:16px;`;
  btn.onclick = async () => {
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice; // מחכה לבחירת המשתמש
      btn.remove();
      deferredPrompt = null;
    } catch (_) {
      // משתמש ביטל
    }
  };
  document.body.appendChild(btn);
}
