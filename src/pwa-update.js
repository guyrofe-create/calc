// src/pwa-update.js
// פופ-אפ “יש גרסה חדשה” + רענון אוטומטי אחרי עדכון ה-SW

export function setupPWAUpdate() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      // אם כבר יש ורקר "ממתין" — הצג פסים לעדכון
      if (reg.waiting) showUpdateBar(reg);

      // בזמן עדכון — ברגע שה־SW החדש "installed" ויש קונטרולר פעיל, מציגים פסים
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBar(reg);
          }
        });
      });
    } catch (err) {
      console.error('SW register failed:', err);
    }
  });

  function showUpdateBar(reg) {
    // אם כבר הוצג — אל תכפיל
    if (document.getElementById('pwa-update-bar')) return;

    const bar = document.createElement('button');
    bar.id = 'pwa-update-bar';
    bar.type = 'button';
    bar.setAttribute('dir', 'rtl');
    bar.textContent = 'גרסה חדשה זמינה — עדכון';
    bar.style.cssText = `
      position: fixed; inset-inline: 16px; bottom: calc(16px + env(safe-area-inset-bottom));
      z-index: 9999; background: #111; color: #fff; padding: 12px 16px;
      border: 0; border-radius: 12px; font-size: 16px; box-shadow: 0 6px 20px rgba(0,0,0,.2);
      cursor: pointer;
    `;

    bar.onclick = () => {
      reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
      // כשיורש השליטה מתחלף — טען מחדש
      navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
    };

    document.body.appendChild(bar);
  }
}

// נוחות: מאפשר גם import ברירת-מחדל אם תרצה בעתיד
export default setupPWAUpdate;
