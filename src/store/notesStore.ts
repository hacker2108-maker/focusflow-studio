import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export interface Note {
  id: string;
  title: string;
  content: string;
  folder: string;
  isPinned: boolean;
  color: string;
  createdAt: number;
  updatedAt: number;
}

interface NotesState {
  notes: Note[];
  isLoading: boolean;
  selectedNote: Note | null;
  
  // Actions
  fetchNotes: () => Promise<void>;
  addNote: (note: Partial<Note>) => Promise<Note | null>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  setSelectedNote: (note: Note | null) => void;
  togglePin: (id: string) => Promise<void>;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  isLoading: false,
  selectedNote: null,

  fetchNotes: async () => {
    set({ isLoading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching notes:", error);
        set({ isLoading: false });
        return;
      }

      const notes: Note[] = (data || []).map((row) => ({
        id: row.id,
        title: row.title,
        content: row.content || "",
        folder: row.folder || "Notes",
        isPinned: row.is_pinned || false,
        color: row.color || "#FFFFFF",
        createdAt: new Date(row.created_at).getTime(),
        updatedAt: new Date(row.updated_at).getTime(),
      }));

      set({ notes, isLoading: false });
    } catch (error) {
      console.error("Error fetching notes:", error);
      set({ isLoading: false });
    }
  },

  addNote: async (noteData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("notes")
        .insert({
          user_id: user.id,
          title: noteData.title || "Untitled",
          content: noteData.content || "",
          folder: noteData.folder || "Notes",
          is_pinned: noteData.isPinned || false,
          color: noteData.color || "#FFFFFF",
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding note:", error);
        return null;
      }

      const newNote: Note = {
        id: data.id,
        title: data.title,
        content: data.content || "",
        folder: data.folder || "Notes",
        isPinned: data.is_pinned || false,
        color: data.color || "#FFFFFF",
        createdAt: new Date(data.created_at).getTime(),
        updatedAt: new Date(data.updated_at).getTime(),
      };

      set((state) => ({ notes: [newNote, ...state.notes] }));
      return newNote;
    } catch (error) {
      console.error("Error adding note:", error);
      return null;
    }
  },

  updateNote: async (id, updates) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.content !== undefined) dbUpdates.content = updates.content;
      if (updates.folder !== undefined) dbUpdates.folder = updates.folder;
      if (updates.isPinned !== undefined) dbUpdates.is_pinned = updates.isPinned;
      if (updates.color !== undefined) dbUpdates.color = updates.color;

      const { error } = await supabase
        .from("notes")
        .update(dbUpdates)
        .eq("id", id);

      if (error) {
        console.error("Error updating note:", error);
        return;
      }

      set((state) => ({
        notes: state.notes.map((note) =>
          note.id === id
            ? { ...note, ...updates, updatedAt: Date.now() }
            : note
        ),
        selectedNote:
          state.selectedNote?.id === id
            ? { ...state.selectedNote, ...updates, updatedAt: Date.now() }
            : state.selectedNote,
      }));
    } catch (error) {
      console.error("Error updating note:", error);
    }
  },

  deleteNote: async (id) => {
    try {
      const { error } = await supabase.from("notes").delete().eq("id", id);

      if (error) {
        console.error("Error deleting note:", error);
        return;
      }

      set((state) => ({
        notes: state.notes.filter((note) => note.id !== id),
        selectedNote: state.selectedNote?.id === id ? null : state.selectedNote,
      }));
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  },

  setSelectedNote: (note) => {
    set({ selectedNote: note });
  },

  togglePin: async (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (note) {
      await get().updateNote(id, { isPinned: !note.isPinned });
    }
  },
}));
