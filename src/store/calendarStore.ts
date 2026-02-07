import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

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
  isLoading: boolean;
  fetchEvents: () => Promise<void>;
  addEvent: (event: Omit<CalendarEvent, "id" | "createdAt">) => Promise<CalendarEvent | null>;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  getEventsByDate: (date: string) => CalendarEvent[];
  getEventsForMonth: (year: number, month: number) => CalendarEvent[];
  clearAllData: () => void;
}

export const EVENT_COLORS = [
  "#1a1a1a", // Black
  "#404040", // Dark gray
  "#525252", // Gray
  "#737373", // Medium gray
  "#a3a3a3", // Light gray
  "#262626", // Charcoal
  "#171717", // Near black
  "#334155", // Slate
] as const;

export const useCalendarStore = create<CalendarState>((set, get) => ({
  events: [],
  isLoading: false,

  fetchEvents: async () => {
    set({ isLoading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .order("date", { ascending: true });

      if (error) {
        console.error("Error fetching calendar events:", error);
        set({ isLoading: false });
        return;
      }

      const events: CalendarEvent[] = (data || []).map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description || undefined,
        date: row.date,
        startTime: row.start_time,
        endTime: row.end_time,
        color: row.color || "#F59E0B",
        reminder: row.reminder || undefined,
        notificationId: row.notification_id || undefined,
        isRecurring: row.is_recurring || false,
        recurrenceType: row.recurrence_type || undefined,
        recurrenceInterval: row.recurrence_interval || undefined,
        recurrenceEndDate: row.recurrence_end_date || undefined,
        parentEventId: row.parent_event_id || undefined,
        createdAt: new Date(row.created_at).getTime(),
      }));

      set({ events, isLoading: false });
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      set({ isLoading: false });
    }
  },

  addEvent: async (event) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("calendar_events")
        .insert({
          user_id: user.id,
          title: event.title,
          description: event.description || null,
          date: event.date,
          start_time: event.startTime,
          end_time: event.endTime,
          color: event.color || "#F59E0B",
          reminder: event.reminder || null,
          notification_id: event.notificationId || null,
          is_recurring: event.isRecurring || false,
          recurrence_type: event.recurrenceType || null,
          recurrence_interval: event.recurrenceInterval || null,
          recurrence_end_date: event.recurrenceEndDate || null,
          parent_event_id: event.parentEventId || null,
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding calendar event:", error);
        return null;
      }

      const newEvent: CalendarEvent = {
        id: data.id,
        title: data.title,
        description: data.description || undefined,
        date: data.date,
        startTime: data.start_time,
        endTime: data.end_time,
        color: data.color || "#F59E0B",
        reminder: data.reminder || undefined,
        notificationId: data.notification_id || undefined,
        isRecurring: data.is_recurring || false,
        recurrenceType: data.recurrence_type || undefined,
        recurrenceInterval: data.recurrence_interval || undefined,
        recurrenceEndDate: data.recurrence_end_date || undefined,
        parentEventId: data.parent_event_id || undefined,
        createdAt: new Date(data.created_at).getTime(),
      };

      set((state) => ({ events: [...state.events, newEvent] }));
      return newEvent;
    } catch (error) {
      console.error("Error adding calendar event:", error);
      return null;
    }
  },

  updateEvent: async (id, updates) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description || null;
      if (updates.date !== undefined) dbUpdates.date = updates.date;
      if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
      if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
      if (updates.color !== undefined) dbUpdates.color = updates.color;
      if (updates.reminder !== undefined) dbUpdates.reminder = updates.reminder || null;
      if (updates.notificationId !== undefined) dbUpdates.notification_id = updates.notificationId || null;
      if (updates.isRecurring !== undefined) dbUpdates.is_recurring = updates.isRecurring;
      if (updates.recurrenceType !== undefined) dbUpdates.recurrence_type = updates.recurrenceType || null;
      if (updates.recurrenceInterval !== undefined) dbUpdates.recurrence_interval = updates.recurrenceInterval || null;
      if (updates.recurrenceEndDate !== undefined) dbUpdates.recurrence_end_date = updates.recurrenceEndDate || null;

      const { error } = await supabase
        .from("calendar_events")
        .update(dbUpdates)
        .eq("id", id);

      if (error) {
        console.error("Error updating calendar event:", error);
        return;
      }

      set((state) => ({
        events: state.events.map((event) =>
          event.id === id ? { ...event, ...updates } : event
        ),
      }));
    } catch (error) {
      console.error("Error updating calendar event:", error);
    }
  },

  deleteEvent: async (id) => {
    try {
      const { error } = await supabase.from("calendar_events").delete().eq("id", id);

      if (error) {
        console.error("Error deleting calendar event:", error);
        return;
      }

      set((state) => ({
        events: state.events.filter((event) => event.id !== id),
      }));
    } catch (error) {
      console.error("Error deleting calendar event:", error);
    }
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
}));
