import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Habit, HabitLog, HabitFilter } from "@/types";
import { generateId, getToday } from "@/lib/utils";

interface HabitState {
  habits: Habit[];
  logs: HabitLog[];
  filter: HabitFilter;
  
  // Actions
  addHabit: (habit: Omit<Habit, "id" | "createdAt" | "archived">) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  archiveHabit: (id: string) => void;
  unarchiveHabit: (id: string) => void;
  
  // Logs
  logHabit: (habitId: string, status: "done" | "skipped", value?: number, note?: string) => void;
  updateLog: (logId: string, updates: Partial<HabitLog>) => void;
  deleteLog: (logId: string) => void;
  getLogForDate: (habitId: string, date: string) => HabitLog | undefined;
  
  // Filter
  setFilter: (filter: HabitFilter) => void;
  
  // Data management
  importData: (habits: Habit[], logs: HabitLog[]) => void;
  clearAllData: () => void;
}

export const useHabitStore = create<HabitState>()(
  persist(
    (set, get) => ({
      habits: [],
      logs: [],
      filter: "today",

      addHabit: (habitData) => {
        const habit: Habit = {
          ...habitData,
          id: generateId(),
          createdAt: Date.now(),
          archived: false,
        };
        set((state) => ({ habits: [...state.habits, habit] }));
      },

      updateHabit: (id, updates) => {
        set((state) => ({
          habits: state.habits.map((h) =>
            h.id === id ? { ...h, ...updates } : h
          ),
        }));
      },

      deleteHabit: (id) => {
        set((state) => ({
          habits: state.habits.filter((h) => h.id !== id),
          logs: state.logs.filter((l) => l.habitId !== id),
        }));
      },

      archiveHabit: (id) => {
        set((state) => ({
          habits: state.habits.map((h) =>
            h.id === id ? { ...h, archived: true } : h
          ),
        }));
      },

      unarchiveHabit: (id) => {
        set((state) => ({
          habits: state.habits.map((h) =>
            h.id === id ? { ...h, archived: false } : h
          ),
        }));
      },

      logHabit: (habitId, status, value, note) => {
        const today = getToday();
        const existingLog = get().logs.find(
          (l) => l.habitId === habitId && l.date === today
        );

        if (existingLog) {
          // Update existing log
          set((state) => ({
            logs: state.logs.map((l) =>
              l.id === existingLog.id
                ? { ...l, status, value, note, timestamp: Date.now() }
                : l
            ),
          }));
        } else {
          // Create new log
          const log: HabitLog = {
            id: generateId(),
            habitId,
            date: today,
            status,
            value,
            note,
            timestamp: Date.now(),
          };
          set((state) => ({ logs: [...state.logs, log] }));
        }
      },

      updateLog: (logId, updates) => {
        set((state) => ({
          logs: state.logs.map((l) =>
            l.id === logId ? { ...l, ...updates } : l
          ),
        }));
      },

      deleteLog: (logId) => {
        set((state) => ({
          logs: state.logs.filter((l) => l.id !== logId),
        }));
      },

      getLogForDate: (habitId, date) => {
        return get().logs.find((l) => l.habitId === habitId && l.date === date);
      },

      setFilter: (filter) => {
        set({ filter });
      },

      importData: (habits, logs) => {
        set({ habits, logs });
      },

      clearAllData: () => {
        set({ habits: [], logs: [] });
      },
    }),
    {
      name: "focushabit-habits",
    }
  )
);
