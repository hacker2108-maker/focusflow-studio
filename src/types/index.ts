// Habit Types
export interface Habit {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: number;
  archived: boolean;
  schedule: HabitSchedule;
  reminderTime?: string; // "HH:MM"
  goalType: "check" | "count";
  goalTarget?: number;
}

export interface HabitSchedule {
  type: "daily" | "weekdays" | "customDays" | "timesPerWeek";
  daysOfWeek?: number[]; // 0-6 (Sunday = 0)
  timesPerWeek?: number; // 1-7
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  status: "done" | "skipped";
  value?: number; // For count habits
  note?: string;
  timestamp: number;
}

// Focus Types
export interface FocusSession {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: number;
  durationMinutes: number;
  mode: "pomodoro" | "deepFocus";
  task?: string;
  note?: string;
  completed: boolean;
}

export interface FocusTimer {
  isRunning: boolean;
  isPaused: boolean;
  mode: "pomodoro" | "deepFocus";
  phase: "work" | "break" | "longBreak";
  startTimestamp: number | null;
  pausedAt: number | null;
  elapsedBeforePause: number; // ms elapsed before pause
  totalDuration: number; // seconds
  currentSession: number; // For pomodoro cycles
  task?: string;
}

export interface FocusPreset {
  workMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
}

// Insights Types
export interface WeeklyReview {
  weekStart: string; // YYYY-MM-DD (Monday of the week)
  wins: string;
  slips: string;
  adjustment: string;
}

// Settings Types
export interface AppSettings {
  theme: "light" | "dark" | "system";
  weekStartsMonday: boolean;
  defaultFocusPreset: FocusPreset;
}

// Chart Data Types
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

// Filter Types
export type HabitFilter = "today" | "active" | "archived" | "all";

// Day Names
export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const DAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

// Colors for habits
export const HABIT_COLORS = [
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#10B981", // Emerald
  "#3B82F6", // Blue
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#84CC16", // Lime
] as const;
