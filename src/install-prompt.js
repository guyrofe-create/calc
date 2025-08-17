// כפתור “התקן לאפליקציה” (לכרום/אנדרואיד; ב-iOS מוסיפים ידנית למסך הבית)
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallButton();
});

function showInstallButton() {
  if (!deferredPrompt || document.getElementById('a2hs-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'a2hs-btn';
  btn.textContent = 'התקן לאפליקציה';
  btn.style.cssText = `
    position:fixed; left:50%; transform:translateX(-50%);
    bottom:80px; z-index:9999; background:#111; color:#fff; padding:10px 14px;
    border-radius:999px; border:none; font-size:16px;`;
  btn.onclick = async () => {
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      btn.remove();
      deferredPrompt = null;
    } catch {}
  };
  document.body.appendChild(btn);
}
