window.addEventListener('load', async () => {

  const registration = await navigator.serviceWorker.register('/public/service-worker.js')
  registration.update();
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    if (args[0]?.includes("/subscribe")) {

      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        })

        if (subscription) {
          args[1].body = JSON.stringify(subscription);
          args[1].headers["Content-Type"] = "application/json";
        }
      }
    }
    // Get the parameter in arguments
    // Intercept the parameter here 
    return originalFetch.apply(this, args)
  }
})

function urlBase64ToUint8Array (base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}