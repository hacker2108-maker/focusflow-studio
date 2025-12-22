import { useEffect, useCallback } from "react";
import { useHabitStore } from "@/store/habitStore";
import { requestNotificationPermission, scheduleNotification, cancelNotification } from "@/lib/notifications";
import { isHabitDueToday } from "@/lib/utils";
import { toast } from "sonner";

export function useHabitReminders() {
  const { habits } = useHabitStore();

  const scheduleHabitReminders = useCallback(async () => {
    // Request permission first
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log("Notification permission not granted");
      return;
    }

    // Schedule reminders for habits with reminder times
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    for (const habit of habits) {
      if (habit.archived || !habit.reminderTime) continue;
      if (!isHabitDueToday(habit)) continue;

      const [hours, minutes] = habit.reminderTime.split(":").map(Number);
      const reminderDate = new Date(todayStr);
      reminderDate.setHours(hours, minutes, 0, 0);

      // Only schedule if the time is in the future
      if (reminderDate > today) {
        const notificationId = hashStringToNumber(habit.id);
        await scheduleNotification(
          notificationId,
          `Time for: ${habit.name}`,
          habit.description || "Don't forget to complete your habit!",
          reminderDate
        );
      }
    }
  }, [habits]);

  // Schedule reminders when habits change
  useEffect(() => {
    scheduleHabitReminders();
  }, [scheduleHabitReminders]);

  return { scheduleHabitReminders };
}

// Convert string ID to a number for notification ID
function hashStringToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export async function setHabitReminder(
  habitId: string,
  habitName: string,
  reminderTime: string,
  description?: string
): Promise<void> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    toast.error("Please enable notifications to set reminders");
    return;
  }

  const today = new Date();
  const [hours, minutes] = reminderTime.split(":").map(Number);
  const reminderDate = new Date();
  reminderDate.setHours(hours, minutes, 0, 0);

  // If time has passed today, schedule for tomorrow
  if (reminderDate <= today) {
    reminderDate.setDate(reminderDate.getDate() + 1);
  }

  const notificationId = hashStringToNumber(habitId);
  await scheduleNotification(
    notificationId,
    `Time for: ${habitName}`,
    description || "Don't forget to complete your habit!",
    reminderDate
  );

  toast.success(`Reminder set for ${reminderTime}`);
}

export async function cancelHabitReminder(habitId: string): Promise<void> {
  const notificationId = hashStringToNumber(habitId);
  await cancelNotification(notificationId);
}
