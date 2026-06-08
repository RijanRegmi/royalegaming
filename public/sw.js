// Service Worker for Rilogram support chat push notifications

self.addEventListener('push', function (event) {
  if (!event.data) {
    return;
  }

  try {
    const payload = event.data.json();
    const title = payload.title || 'Rilogram Support';
    
    const options = {
      body: payload.body || 'New message received',
      icon: payload.icon || '/games/default-icon.png',
      badge: payload.badge || '/games/default-badge.png',
      data: {
        url: payload.url || '/chat',
      },
      vibrate: [100, 50, 100],
      actions: [
        { action: 'open', title: 'Open Chat' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('Error handling push event:', error);
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const targetUrl = event.notification.data?.url 
    ? new URL(event.notification.data.url, self.location.origin).href 
    : self.location.origin + '/chat';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // If there is already a window open with the target URL, focus it
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Fallback: If there's any chat window open, redirect and focus it
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes('/chat') && 'focus' in client) {
          if ('navigate' in client) {
            return client.navigate(targetUrl).then(c => c.focus());
          }
        }
      }

      // If no matching windows are open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
