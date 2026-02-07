import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";

/** Register service worker for background notifications when tab is closed */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator) || Capacitor.isNativePlatform()) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return reg;
  } catch (e) {
    console.warn("Service worker registration failed:", e);
    return null;
  }
}

/** Schedule timer notification via service worker - works when tab is closed/minimized */
export async function scheduleTimerNotificationViaSW(
  endTime: number,
  title: string,
  body: string
): Promise<void> {
  if (Capacitor.isNativePlatform()) return;
  try {
    const reg = await navigator.serviceWorker?.ready;
    reg?.active?.postMessage({
      type: "SCHEDULE_TIMER_END",
      endTime,
      title,
      body,
    });
  } catch {
    // Silently fail - main page will show notification when tab is open
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    // Use web notifications API
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
    // For web: show immediately if due now/past, or schedule if in the future
    const delay = scheduledAt.getTime() - Date.now();
    const showNow = () => {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body });
      }
    };
    if (delay <= 0) {
      showNow();
    } else if (delay < 3600000) {
      // Within 1 hour - use setTimeout (works when tab is focused or in background)
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
  if (!Capacitor.isNativePlatform()) {
    return;
  }
  
  await LocalNotifications.cancel({ notifications: [{ id }] });
}

export async function cancelAllNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }
  
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({ notifications: pending.notifications });
  }
}
