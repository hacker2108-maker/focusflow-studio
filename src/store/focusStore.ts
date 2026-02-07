import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/integrations/supabase/client";
import type { FocusSession, FocusTimer, FocusPreset } from "@/types";
import { getToday } from "@/lib/utils";

const DEFAULT_PRESET: FocusPreset = {
  workMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  deepFocusMinutes: 60,
  autoStartBreaks: false,
  autoStartWork: false,
  alarmSound: "chime",
};

interface FocusState {
  sessions: FocusSession[];
  timer: FocusTimer;
  preset: FocusPreset;
  isLoading: boolean;
  
  // Timer Actions
  startTimer: (mode: "pomodoro" | "deepFocus", task?: string, customDuration?: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  completeSession: (note?: string) => Promise<void>;
  skipBreak: () => void;
  
  // Get current time remaining
  getTimeRemaining: () => number;
  getElapsedTime: () => number;
  
  // Preset Actions
  updatePreset: (preset: Partial<FocusPreset>) => void;
  
  // Session Actions
  fetchSessions: () => Promise<void>;
  addSession: (session: Omit<FocusSession, "id">) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  
  // Data management
  importData: (sessions: FocusSession[]) => void;
  clearAllData: () => void;
}

const getInitialTimer = (): FocusTimer => ({
  isRunning: false,
  isPaused: false,
  mode: "pomodoro",
  phase: "work",
  startTimestamp: null,
  pausedAt: null,
  elapsedBeforePause: 0,
  totalDuration: DEFAULT_PRESET.workMinutes * 60,
  currentSession: 1,
  task: undefined,
});

export const useFocusStore = create<FocusState>()(
  persist(
    (set, get) => ({
      sessions: [],
      timer: getInitialTimer(),
      preset: DEFAULT_PRESET,
      isLoading: false,

      fetchSessions: async () => {
        set({ isLoading: true });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            set({ isLoading: false });
            return;
          }

          const { data, error } = await supabase
            .from("focus_sessions")
            .select("*")
            .order("created_at", { ascending: false });

          if (error) {
            console.error("Error fetching focus sessions:", error);
            set({ isLoading: false });
            return;
          }

          const sessions: FocusSession[] = (data || []).map((row) => ({
            id: row.id,
            date: row.date,
            startTime: row.start_time,
            durationMinutes: row.duration_minutes,
            mode: row.mode as "pomodoro" | "deepFocus",
            task: row.task || undefined,
            note: row.note || undefined,
            completed: row.completed || false,
          }));

          set({ sessions, isLoading: false });
        } catch (error) {
          console.error("Error fetching focus sessions:", error);
          set({ isLoading: false });
        }
      },

      startTimer: (mode, task, customDuration) => {
        const { preset } = get();
        const duration = customDuration ?? (mode === "pomodoro" ? preset.workMinutes * 60 : preset.deepFocusMinutes * 60);
        
        set({
          timer: {
            isRunning: true,
            isPaused: false,
            mode,
            phase: "work",
            startTimestamp: Date.now(),
            pausedAt: null,
            elapsedBeforePause: 0,
            totalDuration: duration,
            currentSession: 1,
            task,
          },
        });
      },

      pauseTimer: () => {
        const { timer } = get();
        if (!timer.isRunning || timer.isPaused) return;

        const now = Date.now();
        const elapsed = timer.startTimestamp 
          ? Math.floor((now - timer.startTimestamp) / 1000) + timer.elapsedBeforePause
          : timer.elapsedBeforePause;

        set({
          timer: {
            ...timer,
            isPaused: true,
            pausedAt: now,
            elapsedBeforePause: elapsed,
          },
        });
      },

      resumeTimer: () => {
        const { timer } = get();
        if (!timer.isPaused) return;

        set({
          timer: {
            ...timer,
            isPaused: false,
            startTimestamp: Date.now(),
            pausedAt: null,
          },
        });
      },

      resetTimer: () => {
        set({ timer: getInitialTimer() });
      },

      completeSession: async (note) => {
        const { timer, preset } = get();
        const elapsed = get().getElapsedTime();
        const durationMinutes = Math.floor(elapsed / 60);

        // Update timer state FIRST so UI responds immediately (fixes multiple Continue clicks)
        // Handle pomodoro phases
        if (timer.mode === "pomodoro" && timer.phase === "work") {
          const nextSession = timer.currentSession + 1;
          const isLongBreak = timer.currentSession % preset.sessionsBeforeLongBreak === 0;
          const breakDuration = isLongBreak ? preset.longBreakMinutes : preset.breakMinutes;

          set({
            timer: {
              ...timer,
              phase: isLongBreak ? "longBreak" : "break",
              totalDuration: breakDuration * 60,
              startTimestamp: Date.now(),
              elapsedBeforePause: 0,
              isPaused: false,
              currentSession: nextSession,
            },
          });
        } else if (timer.mode === "pomodoro" && (timer.phase === "break" || timer.phase === "longBreak")) {
          // Start next work session
          set({
            timer: {
              ...timer,
              phase: "work",
              totalDuration: preset.workMinutes * 60,
              startTimestamp: Date.now(),
              elapsedBeforePause: 0,
              isPaused: false,
            },
          });
        } else {
          // Deep focus - just reset
          set({ timer: getInitialTimer() });
        }

        // Log the session to database (fire-and-forget, don't block UI)
        if (durationMinutes > 0) {
          void get().addSession({
            date: getToday(),
            startTime: timer.startTimestamp || Date.now(),
            durationMinutes,
            mode: timer.mode,
            task: timer.task,
            note,
            completed: true,
          });
        }
      },

      skipBreak: () => {
        const { timer, preset } = get();
        if (timer.phase !== "break" && timer.phase !== "longBreak") return;

        set({
          timer: {
            ...timer,
            phase: "work",
            totalDuration: preset.workMinutes * 60,
            startTimestamp: Date.now(),
            elapsedBeforePause: 0,
            isPaused: false,
          },
        });
      },

      getTimeRemaining: () => {
        const { timer } = get();
        if (!timer.isRunning) return timer.totalDuration;

        const elapsed = get().getElapsedTime();
        return Math.max(0, timer.totalDuration - elapsed);
      },

      getElapsedTime: () => {
        const { timer } = get();
        if (!timer.isRunning) return 0;

        if (timer.isPaused) {
          return timer.elapsedBeforePause;
        }

        const now = Date.now();
        const sinceStart = timer.startTimestamp 
          ? Math.floor((now - timer.startTimestamp) / 1000)
          : 0;
        
        return timer.elapsedBeforePause + sinceStart;
      },

      updatePreset: (presetUpdates) => {
        set((state) => ({
          preset: { ...state.preset, ...presetUpdates },
        }));
      },

      addSession: async (sessionData) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data, error } = await supabase
            .from("focus_sessions")
            .insert({
              user_id: user.id,
              date: sessionData.date,
              start_time: sessionData.startTime,
              duration_minutes: sessionData.durationMinutes,
              mode: sessionData.mode,
              task: sessionData.task || null,
              note: sessionData.note || null,
              completed: sessionData.completed,
            })
            .select()
            .single();

          if (error) {
            console.error("Error adding focus session:", error);
            return;
          }

          const newSession: FocusSession = {
            id: data.id,
            date: data.date,
            startTime: data.start_time,
            durationMinutes: data.duration_minutes,
            mode: data.mode as "pomodoro" | "deepFocus",
            task: data.task || undefined,
            note: data.note || undefined,
            completed: data.completed || false,
          };

          set((state) => ({ sessions: [...state.sessions, newSession] }));
        } catch (error) {
          console.error("Error adding focus session:", error);
        }
      },

      deleteSession: async (id) => {
        try {
          const { error } = await supabase.from("focus_sessions").delete().eq("id", id);

          if (error) {
            console.error("Error deleting focus session:", error);
            return;
          }

          set((state) => ({
            sessions: state.sessions.filter((s) => s.id !== id),
          }));
        } catch (error) {
          console.error("Error deleting focus session:", error);
        }
      },

      importData: (sessions) => {
        set({ sessions });
      },

      clearAllData: () => {
        set({ sessions: [], timer: getInitialTimer() });
      },
    }),
    {
      name: "focushabit-focus",
      partialize: (state) => ({
        timer: state.timer,
        preset: state.preset,
      }),
    }
  )
);
