// Service worker for focus timer notifications when tab is closed/background
// Uses waitUntil to keep alive until timer ends, then shows notification with sound+vibration

const NOTIFICATION_TAG = "focus-timer-end";
let pendingTimeoutId = null;
let pendingResolve = null;

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Use chunked timeouts (max 1 min) - long timeouts get throttled/killed on mobile
function scheduleChunked(endTime, title, body, resolve) {
  const delay = Math.max(0, endTime - Date.now());
  const chunk = Math.min(delay, 60000);
  if (chunk <= 0) {
    showFocusNotification(title, body).then(resolve).catch(resolve);
    return;
  }
  pendingTimeoutId = setTimeout(() => {
    pendingTimeoutId = null;
    if (Date.now() >= endTime) {
      showFocusNotification(title, body).then(resolve).catch(resolve);
    } else {
      scheduleChunked(endTime, title, body, resolve);
    }
  }, chunk);
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "SCHEDULE_TIMER_END") {
    if (pendingTimeoutId) {
      clearTimeout(pendingTimeoutId);
      pendingTimeoutId = null;
    }
    if (pendingResolve) {
      pendingResolve();
      pendingResolve = null;
    }

    const { endTime, title, body } = event.data;
    const delay = Math.max(0, endTime - Date.now());

    const promise = new Promise((resolve) => {
      if (delay <= 0) {
        showFocusNotification(title, body).then(resolve).catch(resolve);
      } else {
        pendingResolve = resolve;
        scheduleChunked(endTime, title, body, resolve);
      }
    });

    event.waitUntil(promise);
  } else if (event.data?.type === "CANCEL_TIMER_END") {
    if (pendingTimeoutId) {
      clearTimeout(pendingTimeoutId);
      pendingTimeoutId = null;
    }
    if (pendingResolve) {
      pendingResolve();
      pendingResolve = null;
    }
    self.registration.getNotifications().then((notifications) => {
      notifications.forEach((n) => n.tag === NOTIFICATION_TAG && n.close());
    });
  }
});

// Notification click: focus existing window or open/focus the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const focusUrl = new URL("/focus", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const visible = clients.find((c) => c.visibilityState === "visible");
      if (visible) {
        visible.navigate(focusUrl).then((w) => w && w.focus());
        return;
      }
      if (clients.length > 0) {
        clients[0].navigate(focusUrl).then((w) => w && w.focus());
      } else {
        self.clients.openWindow(focusUrl);
      }
    })
  );
});

function showFocusNotification(title, body) {
  const opts = {
    body: body || "Great work! Time for a break.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: NOTIFICATION_TAG,
    renotify: true,
    requireInteraction: true,
    silent: false,
    vibrate: [200, 100, 200, 100, 400],
  };
  return self.registration.showNotification(title || "Focus session complete!", opts);
}
