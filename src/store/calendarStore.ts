import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  color: string;
  reminder?: number; // minutes before
  notificationId?: number;
  isRecurring?: boolean;
  recurrenceType?: string; // 'daily', 'weekly', 'monthly', 'yearly'
  recurrenceInterval?: number;
  recurrenceEndDate?: string;
  parentEventId?: string;
  createdAt: number;
}

interface CalendarState {
  events: CalendarEvent[];
  addEvent: (event: Omit<CalendarEvent, "id" | "createdAt">) => CalendarEvent;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  getEventsByDate: (date: string) => CalendarEvent[];
  getEventsForMonth: (year: number, month: number) => CalendarEvent[];
  clearAllData: () => void;
}

export const EVENT_COLORS = [
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#10B981", // Emerald
  "#3B82F6", // Blue
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#84CC16", // Lime
] as const;

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      events: [],
      
      addEvent: (event) => {
        const newEvent: CalendarEvent = {
          ...event,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
        };
        set((state) => ({
          events: [...state.events, newEvent],
        }));
        return newEvent;
      },
      
      updateEvent: (id, updates) => {
        set((state) => ({
          events: state.events.map((event) =>
            event.id === id ? { ...event, ...updates } : event
          ),
        }));
      },
      
      deleteEvent: (id) => {
        set((state) => ({
          events: state.events.filter((event) => event.id !== id),
        }));
      },
      
      getEventsByDate: (date) => {
        return get().events.filter((event) => event.date === date)
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
      },
      
      getEventsForMonth: (year, month) => {
        const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
        return get().events.filter((event) => event.date.startsWith(monthStr));
      },
      
      clearAllData: () => {
        set({ events: [] });
      },
    }),
    {
      name: "calendar-storage",
    }
  )
);
