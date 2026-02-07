// Service worker for focus timer notifications when tab is closed
// Uses waitUntil to keep alive until timer ends, then shows notification

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SCHEDULE_TIMER_END") {
    const { endTime, title, body } = event.data;
    const delay = Math.max(0, endTime - Date.now());

    const promise = new Promise((resolve) => {
      if (delay <= 0) {
        showNotification(title, body).then(resolve).catch(resolve);
      } else {
        setTimeout(() => {
          showNotification(title, body).then(resolve).catch(resolve);
        }, delay);
      }
    });

    event.waitUntil(promise);
  }
});

function showNotification(title, body) {
  return self.registration.showNotification(title || "Focus session complete!", {
    body: body || "Great work! Time for a break.",
    icon: "/icon-192.png",
    tag: "focus-timer-end",
    requireInteraction: false,
  });
}
