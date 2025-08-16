export async function checkForUpdate() {
    const reg = await navigator.serviceWorker.getRegistration();
    await reg?.update();
    alert('בודק עדכון... אם נמצאה גרסה – תופיע בקשה לרענון.');
  }
  
  export async function clearAppCacheAndReload() {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    const reg = await navigator.serviceWorker.getRegistration();
    await reg?.unregister();
    location.reload();
  }
  