import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppSettings, FocusPreset, WeeklyReview } from "@/types";

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

const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  weekStartsMonday: true,
  defaultFocusPreset: DEFAULT_PRESET,
};

interface SettingsState {
  settings: AppSettings;
  weeklyReviews: WeeklyReview[];
  
  // Actions
  updateSettings: (updates: Partial<AppSettings>) => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  
  // Weekly Reviews
  addWeeklyReview: (review: WeeklyReview) => void;
  updateWeeklyReview: (weekStart: string, updates: Partial<WeeklyReview>) => void;
  getWeeklyReview: (weekStart: string) => WeeklyReview | undefined;
  
  // Data management
  importData: (settings: AppSettings, reviews: WeeklyReview[]) => void;
  resetSettings: () => void;
  clearAllData: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      weeklyReviews: [],

      updateSettings: (updates) => {
        set((state) => ({
          settings: { ...state.settings, ...updates },
        }));
      },

      setTheme: (theme) => {
        set((state) => ({
          settings: { ...state.settings, theme },
        }));
        
        // Apply theme to document
        const root = document.documentElement;
        root.classList.remove("light", "dark");
        
        if (theme === "system") {
          const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
          root.classList.add(systemTheme);
        } else {
          root.classList.add(theme);
        }
      },

      addWeeklyReview: (review) => {
        set((state) => {
          const existing = state.weeklyReviews.find(r => r.weekStart === review.weekStart);
          if (existing) {
            return {
              weeklyReviews: state.weeklyReviews.map(r =>
                r.weekStart === review.weekStart ? review : r
              ),
            };
          }
          return { weeklyReviews: [...state.weeklyReviews, review] };
        });
      },

      updateWeeklyReview: (weekStart, updates) => {
        set((state) => ({
          weeklyReviews: state.weeklyReviews.map(r =>
            r.weekStart === weekStart ? { ...r, ...updates } : r
          ),
        }));
      },

      getWeeklyReview: (weekStart) => {
        return get().weeklyReviews.find(r => r.weekStart === weekStart);
      },

      importData: (settings, reviews) => {
        set({ settings, weeklyReviews: reviews });
        // Apply theme
        get().setTheme(settings.theme);
      },

      resetSettings: () => {
        set({ settings: DEFAULT_SETTINGS });
        get().setTheme(DEFAULT_SETTINGS.theme);
      },

      clearAllData: () => {
        set({ settings: DEFAULT_SETTINGS, weeklyReviews: [] });
        get().setTheme(DEFAULT_SETTINGS.theme);
      },
    }),
    {
      name: "focushabit-settings",
      onRehydrateStorage: () => (state) => {
        // Apply theme on load
        if (state) {
          const theme = state.settings.theme;
          const root = document.documentElement;
          root.classList.remove("light", "dark");
          
          if (theme === "system") {
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
              ? "dark"
              : "light";
            root.classList.add(systemTheme);
          } else {
            root.classList.add(theme);
          }
        }
      },
    }
  )
);
