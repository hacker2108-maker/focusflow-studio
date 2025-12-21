import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";

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
    // For web, we'll use a simple timeout if the time is within the session
    const delay = scheduledAt.getTime() - Date.now();
    if (delay > 0 && delay < 3600000) { // Within 1 hour
      setTimeout(() => {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(title, { body });
        }
      }, delay);
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
