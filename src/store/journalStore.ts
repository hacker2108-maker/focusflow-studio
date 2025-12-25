import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  mood?: "great" | "good" | "okay" | "bad" | "terrible";
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

interface JournalState {
  entries: JournalEntry[];
  isLoading: boolean;
  fetchEntries: () => Promise<void>;
  addEntry: (entry: Omit<JournalEntry, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateEntry: (id: string, updates: Partial<JournalEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  getEntryByDate: (date: string) => JournalEntry | undefined;
  clearAllData: () => void;
}

export const useJournalStore = create<JournalState>((set, get) => ({
  entries: [],
  isLoading: false,

  fetchEntries: async () => {
    set({ isLoading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .order("date", { ascending: false });

      if (error) {
        console.error("Error fetching journal entries:", error);
        set({ isLoading: false });
        return;
      }

      const entries: JournalEntry[] = (data || []).map((row) => ({
        id: row.id,
        date: row.date,
        title: row.title,
        content: row.content || "",
        mood: row.mood as JournalEntry["mood"],
        tags: row.tags || undefined,
        createdAt: new Date(row.created_at).getTime(),
        updatedAt: new Date(row.updated_at).getTime(),
      }));

      set({ entries, isLoading: false });
    } catch (error) {
      console.error("Error fetching journal entries:", error);
      set({ isLoading: false });
    }
  },

  addEntry: async (entry) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("journal_entries")
        .insert({
          user_id: user.id,
          date: entry.date,
          title: entry.title,
          content: entry.content,
          mood: entry.mood || null,
          tags: entry.tags || null,
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding journal entry:", error);
        return;
      }

      const newEntry: JournalEntry = {
        id: data.id,
        date: data.date,
        title: data.title,
        content: data.content || "",
        mood: data.mood as JournalEntry["mood"],
        tags: data.tags || undefined,
        createdAt: new Date(data.created_at).getTime(),
        updatedAt: new Date(data.updated_at).getTime(),
      };

      set((state) => ({ entries: [newEntry, ...state.entries] }));
    } catch (error) {
      console.error("Error adding journal entry:", error);
    }
  },

  updateEntry: async (id, updates) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.content !== undefined) dbUpdates.content = updates.content;
      if (updates.mood !== undefined) dbUpdates.mood = updates.mood;
      if (updates.tags !== undefined) dbUpdates.tags = updates.tags;

      const { error } = await supabase
        .from("journal_entries")
        .update(dbUpdates)
        .eq("id", id);

      if (error) {
        console.error("Error updating journal entry:", error);
        return;
      }

      set((state) => ({
        entries: state.entries.map((entry) =>
          entry.id === id ? { ...entry, ...updates, updatedAt: Date.now() } : entry
        ),
      }));
    } catch (error) {
      console.error("Error updating journal entry:", error);
    }
  },

  deleteEntry: async (id) => {
    try {
      const { error } = await supabase.from("journal_entries").delete().eq("id", id);

      if (error) {
        console.error("Error deleting journal entry:", error);
        return;
      }

      set((state) => ({
        entries: state.entries.filter((entry) => entry.id !== id),
      }));
    } catch (error) {
      console.error("Error deleting journal entry:", error);
    }
  },

  getEntryByDate: (date) => {
    return get().entries.find((entry) => entry.date === date);
  },

  clearAllData: () => {
    set({ entries: [] });
  },
}));
