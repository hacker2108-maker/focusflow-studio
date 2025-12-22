import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  content: string;
  mood?: "great" | "good" | "okay" | "bad" | "terrible";
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

interface JournalState {
  entries: JournalEntry[];
  addEntry: (entry: Omit<JournalEntry, "id" | "createdAt" | "updatedAt">) => void;
  updateEntry: (id: string, updates: Partial<JournalEntry>) => void;
  deleteEntry: (id: string) => void;
  getEntryByDate: (date: string) => JournalEntry | undefined;
  clearAllData: () => void;
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      entries: [],
      
      addEntry: (entry) => {
        const now = Date.now();
        const newEntry: JournalEntry = {
          ...entry,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          entries: [newEntry, ...state.entries],
        }));
      },
      
      updateEntry: (id, updates) => {
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === id
              ? { ...entry, ...updates, updatedAt: Date.now() }
              : entry
          ),
        }));
      },
      
      deleteEntry: (id) => {
        set((state) => ({
          entries: state.entries.filter((entry) => entry.id !== id),
        }));
      },
      
      getEntryByDate: (date) => {
        return get().entries.find((entry) => entry.date === date);
      },
      
      clearAllData: () => {
        set({ entries: [] });
      },
    }),
    {
      name: "journal-storage",
    }
  )
);
