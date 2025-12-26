import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useHabitStore } from "@/store/habitStore";
import { useFocusStore } from "@/store/focusStore";
import { useJournalStore } from "@/store/journalStore";
import { useCalendarStore } from "@/store/calendarStore";
import { useNotesStore } from "@/store/notesStore";

/**
 * Hook to initialize all store data when user is authenticated.
 * Call this once in a top-level component (e.g., App.tsx or AppLayout).
 */
export function useDataInitialization() {
  const { user, loading } = useAuth();
  const initializedRef = useRef(false);
  
  const fetchHabits = useHabitStore((s) => s.fetchHabits);
  const fetchSessions = useFocusStore((s) => s.fetchSessions);
  const fetchEntries = useJournalStore((s) => s.fetchEntries);
  const fetchEvents = useCalendarStore((s) => s.fetchEvents);
  const fetchNotes = useNotesStore((s) => s.fetchNotes);
  
  // Clear data functions
  const clearHabits = useHabitStore((s) => s.clearAllData);
  const clearFocus = useFocusStore((s) => s.clearAllData);
  const clearJournal = useJournalStore((s) => s.clearAllData);
  const clearCalendar = useCalendarStore((s) => s.clearAllData);

  useEffect(() => {
    if (loading) return;
    
    if (user && !initializedRef.current) {
      // User is logged in, fetch all data
      initializedRef.current = true;
      
      // Fetch all data in parallel
      Promise.all([
        fetchHabits(),
        fetchSessions(),
        fetchEntries(),
        fetchEvents(),
        fetchNotes(),
      ]).catch((error) => {
        console.error("Error initializing data:", error);
      });
    } else if (!user && initializedRef.current) {
      // User logged out, clear all data
      initializedRef.current = false;
      clearHabits();
      clearFocus();
      clearJournal();
      clearCalendar();
    }
  }, [user, loading, fetchHabits, fetchSessions, fetchEntries, fetchEvents, fetchNotes, clearHabits, clearFocus, clearJournal, clearCalendar]);
}
