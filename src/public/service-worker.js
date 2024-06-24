self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.body,
    badge: '/public/mercari.png',
    icon: '/public/mercari.png',
    data: {
      url: data.url,  // Pass the URL in the notification data
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();  // Close the notification

  // Open the URL
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});