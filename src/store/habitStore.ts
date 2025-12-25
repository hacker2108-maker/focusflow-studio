import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import type { Habit, HabitLog, HabitFilter, HabitSchedule } from "@/types";
import { getToday } from "@/lib/utils";

interface HabitState {
  habits: Habit[];
  logs: HabitLog[];
  filter: HabitFilter;
  isLoading: boolean;
  
  // Actions
  fetchHabits: () => Promise<void>;
  addHabit: (habit: Omit<Habit, "id" | "createdAt" | "archived">) => Promise<void>;
  updateHabit: (id: string, updates: Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  archiveHabit: (id: string) => Promise<void>;
  unarchiveHabit: (id: string) => Promise<void>;
  
  // Logs
  logHabit: (habitId: string, status: "done" | "skipped", value?: number, note?: string) => Promise<void>;
  updateLog: (logId: string, updates: Partial<HabitLog>) => Promise<void>;
  deleteLog: (logId: string) => Promise<void>;
  getLogForDate: (habitId: string, date: string) => HabitLog | undefined;
  
  // Filter
  setFilter: (filter: HabitFilter) => void;
  
  // Data management
  clearAllData: () => void;
}

// Helper to map DB schedule_type to frontend schedule type
function mapScheduleType(dbType: string): HabitSchedule["type"] {
  switch (dbType) {
    case "daily": return "daily";
    case "weekdays": return "weekdays";
    case "specific": return "customDays";
    case "weekly": return "timesPerWeek";
    default: return "daily";
  }
}

// Helper to map frontend schedule type to DB schedule_type
function mapScheduleTypeToDb(type: HabitSchedule["type"]): string {
  switch (type) {
    case "daily": return "daily";
    case "weekdays": return "daily"; // Store as daily, weekdays determined by daysOfWeek
    case "customDays": return "specific";
    case "timesPerWeek": return "weekly";
    default: return "daily";
  }
}

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  logs: [],
  filter: "today",
  isLoading: false,

  fetchHabits: async () => {
    set({ isLoading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ isLoading: false });
        return;
      }

      // Fetch habits
      const { data: habitsData, error: habitsError } = await supabase
        .from("habits")
        .select("*")
        .order("created_at", { ascending: false });

      if (habitsError) {
        console.error("Error fetching habits:", habitsError);
        set({ isLoading: false });
        return;
      }

      // Fetch logs
      const { data: logsData, error: logsError } = await supabase
        .from("habit_logs")
        .select("*")
        .order("timestamp", { ascending: false });

      if (logsError) {
        console.error("Error fetching habit logs:", logsError);
        set({ isLoading: false });
        return;
      }

      const habits: Habit[] = (habitsData || []).map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description || undefined,
        color: row.color || "#F59E0B",
        goalType: row.goal_type as "check" | "count",
        goalTarget: row.goal_target || undefined,
        schedule: {
          type: mapScheduleType(row.schedule_type),
          daysOfWeek: row.schedule_days_of_week || undefined,
          timesPerWeek: row.schedule_times_per_week || undefined,
        },
        reminderTime: row.reminder_time || undefined,
        createdAt: new Date(row.created_at).getTime(),
        archived: row.archived || false,
      }));

      const logs: HabitLog[] = (logsData || []).map((row) => ({
        id: row.id,
        habitId: row.habit_id,
        date: row.date,
        status: row.status as "done" | "skipped",
        value: row.value || undefined,
        note: row.note || undefined,
        timestamp: row.timestamp,
      }));

      set({ habits, logs, isLoading: false });
    } catch (error) {
      console.error("Error fetching habits:", error);
      set({ isLoading: false });
    }
  },

  addHabit: async (habitData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("habits")
        .insert({
          user_id: user.id,
          name: habitData.name,
          description: habitData.description || null,
          color: habitData.color || "#F59E0B",
          goal_type: habitData.goalType,
          goal_target: habitData.goalTarget || null,
          schedule_type: mapScheduleTypeToDb(habitData.schedule.type),
          schedule_days_of_week: habitData.schedule.daysOfWeek || null,
          schedule_times_per_week: habitData.schedule.timesPerWeek || null,
          reminder_time: habitData.reminderTime || null,
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding habit:", error);
        return;
      }

      const newHabit: Habit = {
        id: data.id,
        name: data.name,
        description: data.description || undefined,
        color: data.color || "#F59E0B",
        goalType: data.goal_type as "check" | "count",
        goalTarget: data.goal_target || undefined,
        schedule: {
          type: mapScheduleType(data.schedule_type),
          daysOfWeek: data.schedule_days_of_week || undefined,
          timesPerWeek: data.schedule_times_per_week || undefined,
        },
        reminderTime: data.reminder_time || undefined,
        createdAt: new Date(data.created_at).getTime(),
        archived: data.archived || false,
      };

      set((state) => ({ habits: [newHabit, ...state.habits] }));
    } catch (error) {
      console.error("Error adding habit:", error);
    }
  },

  updateHabit: async (id, updates) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description || null;
      if (updates.color !== undefined) dbUpdates.color = updates.color;
      if (updates.goalType !== undefined) dbUpdates.goal_type = updates.goalType;
      if (updates.goalTarget !== undefined) dbUpdates.goal_target = updates.goalTarget || null;
      if (updates.schedule !== undefined) {
        dbUpdates.schedule_type = mapScheduleTypeToDb(updates.schedule.type);
        dbUpdates.schedule_days_of_week = updates.schedule.daysOfWeek || null;
        dbUpdates.schedule_times_per_week = updates.schedule.timesPerWeek || null;
      }
      if (updates.reminderTime !== undefined) dbUpdates.reminder_time = updates.reminderTime || null;
      if (updates.archived !== undefined) dbUpdates.archived = updates.archived;

      const { error } = await supabase
        .from("habits")
        .update(dbUpdates)
        .eq("id", id);

      if (error) {
        console.error("Error updating habit:", error);
        return;
      }

      set((state) => ({
        habits: state.habits.map((h) =>
          h.id === id ? { ...h, ...updates } : h
        ),
      }));
    } catch (error) {
      console.error("Error updating habit:", error);
    }
  },

  deleteHabit: async (id) => {
    try {
      const { error } = await supabase.from("habits").delete().eq("id", id);

      if (error) {
        console.error("Error deleting habit:", error);
        return;
      }

      set((state) => ({
        habits: state.habits.filter((h) => h.id !== id),
        logs: state.logs.filter((l) => l.habitId !== id),
      }));
    } catch (error) {
      console.error("Error deleting habit:", error);
    }
  },

  archiveHabit: async (id) => {
    await get().updateHabit(id, { archived: true });
  },

  unarchiveHabit: async (id) => {
    await get().updateHabit(id, { archived: false });
  },

  logHabit: async (habitId, status, value, note) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = getToday();
      const existingLog = get().logs.find(
        (l) => l.habitId === habitId && l.date === today
      );

      if (existingLog) {
        // Update existing log
        const { error } = await supabase
          .from("habit_logs")
          .update({
            status,
            value: value || null,
            note: note || null,
            timestamp: Date.now(),
          })
          .eq("id", existingLog.id);

        if (error) {
          console.error("Error updating habit log:", error);
          return;
        }

        set((state) => ({
          logs: state.logs.map((l) =>
            l.id === existingLog.id
              ? { ...l, status, value, note, timestamp: Date.now() }
              : l
          ),
        }));
      } else {
        // Create new log
        const { data, error } = await supabase
          .from("habit_logs")
          .insert({
            user_id: user.id,
            habit_id: habitId,
            date: today,
            status,
            value: value || null,
            note: note || null,
          })
          .select()
          .single();

        if (error) {
          console.error("Error creating habit log:", error);
          return;
        }

        const newLog: HabitLog = {
          id: data.id,
          habitId: data.habit_id,
          date: data.date,
          status: data.status as "done" | "skipped",
          value: data.value || undefined,
          note: data.note || undefined,
          timestamp: data.timestamp,
        };

        set((state) => ({ logs: [...state.logs, newLog] }));
      }
    } catch (error) {
      console.error("Error logging habit:", error);
    }
  },

  updateLog: async (logId, updates) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.value !== undefined) dbUpdates.value = updates.value || null;
      if (updates.note !== undefined) dbUpdates.note = updates.note || null;

      const { error } = await supabase
        .from("habit_logs")
        .update(dbUpdates)
        .eq("id", logId);

      if (error) {
        console.error("Error updating habit log:", error);
        return;
      }

      set((state) => ({
        logs: state.logs.map((l) =>
          l.id === logId ? { ...l, ...updates } : l
        ),
      }));
    } catch (error) {
      console.error("Error updating habit log:", error);
    }
  },

  deleteLog: async (logId) => {
    try {
      const { error } = await supabase.from("habit_logs").delete().eq("id", logId);

      if (error) {
        console.error("Error deleting habit log:", error);
        return;
      }

      set((state) => ({
        logs: state.logs.filter((l) => l.id !== logId),
      }));
    } catch (error) {
      console.error("Error deleting habit log:", error);
    }
  },

  getLogForDate: (habitId, date) => {
    return get().logs.find((l) => l.habitId === habitId && l.date === date);
  },

  setFilter: (filter) => {
    set({ filter });
  },

  clearAllData: () => {
    set({ habits: [], logs: [] });
  },
}));
