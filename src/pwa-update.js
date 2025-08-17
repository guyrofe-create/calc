// הצגת בר עדכון כשיש SW חדש + רענון אוטומטי בלחיצה
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      // אם כבר מחכה גרסה חדשה
      if (reg.waiting) showUpdateBar(reg);
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBar(reg);
          }
        });
      });
    } catch (e) {
      console.error('SW register failed:', e);
    }
  });
}

function showUpdateBar(reg) {
  // לא להציג פעמיים
  if (document.getElementById('update-toast')) return;

  const bar = document.createElement('div');
  bar.id = 'update-toast';
  bar.textContent = 'גרסה חדשה זמינה • טען מחדש';
  bar.style.cssText = `
    position:fixed; inset:auto 16px 16px 16px; z-index:9999;
    background:#111; color:#fff; padding:10px 14px; border-radius:10px;
    text-align:center; cursor:pointer; font-weight:500;`;
  bar.onclick = () => {
    reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
  };
  reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
  document.body.appendChild(bar);
}
