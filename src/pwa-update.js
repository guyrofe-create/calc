// src/pwa-update.js
export function setupPWAUpdate() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // אם יש כבר SW שממתין – הצג פס עדכון
      if (reg.waiting) showUpdateBar(reg);

      // מאזין לעדכונים חדשים
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        sw && sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBar(reg);
          }
        });
      });
    });

    // כש-SW חדש תופס שליטה – מרעננים את הדף
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  });
}

function showUpdateBar(reg) {
  if (document.getElementById('pwa-update-bar')) return;

  const bar = document.createElement('div');
  bar.id = 'pwa-update-bar';
  bar.dir = 'rtl';
  bar.className = 'pwa-update-bar';
  bar.innerHTML = `
    <span class="pwa-update-text">גרסה חדשה זמינה</span>
    <div class="pwa-update-actions">
      <button class="pwa-update-btn" type="button">עדכון עכשיו</button>
      <button class="pwa-dismiss-btn" type="button" aria-label="סגור">✕</button>
    </div>
  `;

  bar.querySelector('.pwa-update-btn').addEventListener('click', () => {
    reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
    bar.querySelector('.pwa-update-btn').disabled = true;
  });

  bar.querySelector('.pwa-dismiss-btn').addEventListener('click', () => {
    bar.remove();
  });

  document.body.appendChild(bar);
}
