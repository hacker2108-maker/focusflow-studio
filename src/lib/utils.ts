import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, startOfWeek, addDays, parseISO, differenceInDays, isSameDay } from "date-fns";
import type { Habit, HabitLog } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date utilities
export function getToday(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function formatDate(date: string | Date, formatStr: string = "MMM d"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, formatStr);
}

export function getWeekDates(date: Date = new Date(), startMonday: boolean = true): Date[] {
  const start = startOfWeek(date, { weekStartsOn: startMonday ? 1 : 0 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function getDayOfWeek(date: Date = new Date()): number {
  return date.getDay();
}

export function isHabitDueToday(habit: Habit, today: Date = new Date()): boolean {
  const dayOfWeek = today.getDay();
  
  switch (habit.schedule.type) {
    case "daily":
      return true;
    case "weekdays":
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case "customDays":
      return habit.schedule.daysOfWeek?.includes(dayOfWeek) ?? false;
    case "timesPerWeek":
      return true;
    default:
      return false;
  }
}

export function getScheduleLabel(habit: Habit): string {
  switch (habit.schedule.type) {
    case "daily":
      return "Every day";
    case "weekdays":
      return "Weekdays";
    case "customDays": {
      const days = habit.schedule.daysOfWeek || [];
      if (days.length === 7) return "Every day";
      if (days.length === 0) return "No days set";
      const dayNames = ["S", "M", "T", "W", "T", "F", "S"];
      return days.map(d => dayNames[d]).join(", ");
    }
    case "timesPerWeek":
      return `${habit.schedule.timesPerWeek}× per week`;
    default:
      return "Unknown";
  }
}

// Streak calculation
export function calculateStreak(habit: Habit, logs: HabitLog[]): { current: number; best: number } {
  const habitLogs = logs
    .filter(log => log.habitId === habit.id && log.status === "done")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (habitLogs.length === 0) {
    return { current: 0, best: 0 };
  }

  if (habit.schedule.type === "timesPerWeek") {
    return calculateWeeklyStreak(habit, logs);
  }

  let bestStreak = 0;
  let tempStreak = 0;
  let lastDate: Date | null = null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const log of habitLogs) {
    const logDate = parseISO(log.date);
    logDate.setHours(0, 0, 0, 0);

    if (lastDate === null) {
      tempStreak = 1;
    } else {
      const daysDiff = differenceInDays(lastDate, logDate);
      
      if (daysDiff === 1 || isConsecutiveForSchedule(habit, lastDate, logDate)) {
        tempStreak++;
      } else {
        bestStreak = Math.max(bestStreak, tempStreak);
        tempStreak = 1;
      }
    }

    lastDate = logDate;
  }

  bestStreak = Math.max(bestStreak, tempStreak);

  const mostRecentLog = parseISO(habitLogs[0].date);
  const daysSinceLastLog = differenceInDays(today, mostRecentLog);
  
  let currentStreak = 0;
  if (daysSinceLastLog <= 1 || isSameDay(today, mostRecentLog)) {
    currentStreak = calculateCurrentStreak(habit, logs, today);
  }

  return { current: currentStreak, best: bestStreak };
}

function isConsecutiveForSchedule(_habit: Habit, date1: Date, date2: Date): boolean {
  const diff = differenceInDays(date1, date2);
  return diff === 1;
}

function calculateCurrentStreak(habit: Habit, logs: HabitLog[], fromDate: Date): number {
  const habitLogs = logs
    .filter(log => log.habitId === habit.id && log.status === "done")
    .map(log => parseISO(log.date))
    .sort((a, b) => b.getTime() - a.getTime());

  let streak = 0;
  let currentDate = new Date(fromDate);
  currentDate.setHours(0, 0, 0, 0);

  const todayLog = habitLogs.find(d => isSameDay(d, currentDate));
  if (todayLog) {
    streak = 1;
    currentDate = addDays(currentDate, -1);
  } else if (isHabitDueToday(habit, currentDate)) {
    return 0;
  } else {
    currentDate = addDays(currentDate, -1);
  }

  while (true) {
    const dayLog = habitLogs.find(d => isSameDay(d, currentDate));
    const isDue = isHabitDueOnDate(habit, currentDate);

    if (isDue) {
      if (dayLog) {
        streak++;
        currentDate = addDays(currentDate, -1);
      } else {
        break;
      }
    } else {
      currentDate = addDays(currentDate, -1);
    }

    if (differenceInDays(fromDate, currentDate) > 365) break;
  }

  return streak;
}

export function isHabitDueOnDate(habit: Habit, date: Date): boolean {
  const dayOfWeek = date.getDay();
  
  switch (habit.schedule.type) {
    case "daily":
      return true;
    case "weekdays":
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case "customDays":
      return habit.schedule.daysOfWeek?.includes(dayOfWeek) ?? false;
    case "timesPerWeek":
      return true;
    default:
      return false;
  }
}

function calculateWeeklyStreak(habit: Habit, logs: HabitLog[]): { current: number; best: number } {
  const targetPerWeek = habit.schedule.timesPerWeek || 1;
  const habitLogs = logs.filter(log => log.habitId === habit.id && log.status === "done");
  
  if (habitLogs.length === 0) return { current: 0, best: 0 };

  const weeklyCompletions = new Map<string, number>();
  
  for (const log of habitLogs) {
    const date = parseISO(log.date);
    const weekStart = format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
    weeklyCompletions.set(weekStart, (weeklyCompletions.get(weekStart) || 0) + 1);
  }

  let meetsTarget = 0;
  weeklyCompletions.forEach((count) => {
    if (count >= targetPerWeek) meetsTarget++;
  });

  return { current: meetsTarget, best: meetsTarget };
}

// Completion rate
export function calculateCompletionRate(habit: Habit, logs: HabitLog[], days: number = 7): number {
  const today = new Date();
  let totalDue = 0;
  let completed = 0;

  for (let i = 0; i < days; i++) {
    const date = addDays(today, -i);
    const dateStr = format(date, "yyyy-MM-dd");
    
    if (isHabitDueOnDate(habit, date)) {
      totalDue++;
      const log = logs.find(l => l.habitId === habit.id && l.date === dateStr && l.status === "done");
      if (log) completed++;
    }
  }

  if (totalDue === 0) return 100;
  return Math.round((completed / totalDue) * 100);
}

// Time formatting
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// Generate unique ID
export function generateId(): string {
  return crypto.randomUUID();
}
