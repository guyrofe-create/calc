// src/install-prompt.js
let deferredPrompt = null;

export function setupInstallPrompt() {
  if (!('onbeforeinstallprompt' in window)) return;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
  });
}

function showInstallButton() {
  if (!deferredPrompt || document.getElementById('pwa-install-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'pwa-install-btn';
  btn.textContent = 'התקן לאפליקציה';
  btn.style.cssText = `
    position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
    z-index:2000; background:#111; color:#fff; padding:10px 14px;
    border-radius:999px; border:none; font-size:16px; box-shadow:0 6px 20px rgba(0,0,0,.15);
  `;

  btn.onclick = async () => {
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } finally {
      btn.remove();
      deferredPrompt = null;
    }
  };

  document.body.appendChild(btn);
}

