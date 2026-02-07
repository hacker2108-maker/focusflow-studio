import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";

let swRegistration: ServiceWorkerRegistration | null = null;

const SCHEDULED_KEY = "focus-scheduled";
const FOCUS_TIMER_NOTIFICATION_ID = 9001;

function persistScheduled(endTime: number, title: string, body: string): void {
  if (Capacitor.isNativePlatform()) return;
  try {
    localStorage.setItem(SCHEDULED_KEY, JSON.stringify({ endTime, title, body }));
  } catch {}
}

function clearScheduled(): void {
  if (Capacitor.isNativePlatform()) return;
  try {
    localStorage.removeItem(SCHEDULED_KEY);
  } catch {}
}

/** Show notification immediately if permission granted */
export async function showNotificationNow(title: string, body: string): Promise<void> {
  const t = title || "Focus session complete!";
  const b = body || "Great work! Time for a break.";

  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: FOCUS_TIMER_NOTIFICATION_ID,
            title: t,
            body: b,
            schedule: { at: new Date(Date.now() + 100) },
            sound: "default",
          },
        ],
      });
    } catch (e) {
      console.warn("Focus notification failed (native):", e);
    }
    return;
  }

  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(t, {
        body: b,
        icon: "/icon-192.png",
        tag: "focus-timer-end",
      });
    } catch (e) {
      console.warn("Focus notification failed:", e);
    }
  }
}

/** Check for missed notification (timer ended while app was closed) and show it */
export function checkAndShowMissedNotification(): void {
  if (Capacitor.isNativePlatform()) return;
  try {
    const raw = localStorage.getItem(SCHEDULED_KEY);
    if (!raw) return;
    const { endTime, title, body } = JSON.parse(raw);
    if (endTime <= Date.now()) {
      showNotificationNow(title, body);
      clearScheduled();
    }
  } catch {}
}

/** Register service worker early - required for notifications when app is in background */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator) || Capacitor.isNativePlatform()) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    swRegistration = reg;
    await navigator.serviceWorker.ready;
    return reg;
  } catch (e) {
    console.warn("Service worker registration failed:", e);
    return null;
  }
}

/** Schedule timer notification - SW for background + localStorage fallback for when app was closed */
export async function scheduleTimerNotificationViaSW(
  endTime: number,
  title: string,
  body: string
): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.cancel({ notifications: [{ id: FOCUS_TIMER_NOTIFICATION_ID }] });
      await LocalNotifications.schedule({
        notifications: [
          {
            id: FOCUS_TIMER_NOTIFICATION_ID,
            title: title || "Focus session complete!",
            body: body || "Great work! Time for a break.",
            schedule: { at: new Date(endTime) },
            sound: "default",
          },
        ],
      });
    } catch (e) {
      console.warn("Focus timer notification schedule failed (native):", e);
    }
    return;
  }

  persistScheduled(endTime, title, body);

  const sendToSW = async (retries = 5) => {
    for (let i = 0; i < retries; i++) {
      try {
        const reg = swRegistration ?? (await navigator.serviceWorker.ready);
        if (reg?.active) {
          reg.active.postMessage({ type: "SCHEDULE_TIMER_END", endTime, title, body });
          return;
        }
      } catch (e) {
        console.warn("SW postMessage attempt failed:", e);
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  };
  await sendToSW();
}

/** Clear stored schedule (call when completion fires) */
export function clearScheduledNotification(): void {
  clearScheduled();
}

/** Cancel scheduled timer notification when user pauses or resets */
export async function cancelTimerNotificationViaSW(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.cancel({ notifications: [{ id: FOCUS_TIMER_NOTIFICATION_ID }] });
    } catch {}
    return;
  }
  clearScheduled();
  try {
    const reg = swRegistration ?? await navigator.serviceWorker.ready;
    reg?.active?.postMessage({ type: "CANCEL_TIMER_END" });
  } catch {}
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }
    return false;
  }

  const result = await LocalNotifications.requestPermissions();
  return result.display === "granted";
}

export async function scheduleNotification(
  id: number,
  title: string,
  body: string,
  scheduledAt: Date
): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    const delay = scheduledAt.getTime() - Date.now();
    const showNow = () => {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body });
      }
    };
    if (delay <= 0) {
      showNow();
    } else if (delay < 3600000) {
      setTimeout(showNow, delay);
    }
    return;
  }

  await LocalNotifications.schedule({
    notifications: [
      {
        id,
        title,
        body,
        schedule: { at: scheduledAt },
        sound: "default",
        smallIcon: "ic_stat_icon_config_sample",
        iconColor: "#F59E0B",
      },
    ],
  });
}

export async function cancelNotification(id: number): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await LocalNotifications.cancel({ notifications: [{ id }] });
}

export async function cancelAllNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({ notifications: pending.notifications });
  }
}
