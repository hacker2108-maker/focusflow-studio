import { useState, useMemo } from "react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronLeft, ChevronRight, Smile, Meh, Frown, Heart, Trash2, Edit3, BookOpen, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useJournalStore, JournalEntry } from "@/store/journalStore";

const MOODS = [
  { value: "great", icon: Heart, label: "Great", color: "text-foreground" },
  { value: "good", icon: Smile, label: "Good", color: "text-foreground/90" },
  { value: "okay", icon: Meh, label: "Okay", color: "text-muted-foreground" },
  { value: "bad", icon: Frown, label: "Bad", color: "text-muted-foreground" },
  { value: "terrible", icon: Frown, label: "Terrible", color: "text-foreground/70" },
] as const;

export default function Journal() {
  const { entries, addEntry, updateEntry, deleteEntry } = useJournalStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [isEditing, setIsEditing] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<JournalEntry["mood"]>(undefined);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const selectedEntry = useMemo(() => entries.find((e) => e.date === selectedDate), [entries, selectedDate]);

  const entriesThisMonth = useMemo(() => {
    return entries.filter((e) => {
      const entryDate = parseISO(e.date);
      return entryDate >= monthStart && entryDate <= monthEnd;
    });
  }, [entries, monthStart, monthEnd]);

  const handlePrevMonth = () => setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  const handleDayClick = (day: Date) => setSelectedDate(format(day, "yyyy-MM-dd"));

  const handleNewEntry = () => {
    setTitle("");
    setContent("");
    setMood(undefined);
    setEditingEntry(null);
    setIsEditing(true);
  };

  const handleEditEntry = () => {
    if (selectedEntry) {
      setTitle(selectedEntry.title);
      setContent(selectedEntry.content);
      setMood(selectedEntry.mood);
      setEditingEntry(selectedEntry);
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    if (!title.trim()) return;
    if (editingEntry) {
      updateEntry(editingEntry.id, { title, content, mood });
    } else {
      addEntry({ date: selectedDate, title, content, mood });
    }
    setIsEditing(false);
    setEditingEntry(null);
  };

  const handleDelete = () => {
    if (selectedEntry) deleteEntry(selectedEntry.id);
  };

  const hasEntry = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return entriesThisMonth.some((e) => e.date === dateStr);
  };

  const getEntryMood = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return entriesThisMonth.find((e) => e.date === dateStr)?.mood;
  };

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => b.date.localeCompare(a.date)),
    [entries]
  );

  return (
    <div className="space-y-6 animate-fade-in min-h-screen">
      {/* Journal header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-foreground" />
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Journal</h1>
            <p className="text-sm text-muted-foreground">Reflect on your days</p>
          </div>
        </div>
        <Button onClick={handleNewEntry} size="sm" className="gap-2 bg-foreground text-background hover:bg-foreground/90">
          <PenLine className="w-4 h-4" />
          <span className="hidden sm:inline">New Entry</span>
        </Button>
      </header>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left: Mini calendar + recent entries list */}
        <div className="md:col-span-1 space-y-4">
          <Card className="p-4 border border-border rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="font-semibold text-sm">{format(currentDate, "MMMM yyyy")}</h2>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center mb-2">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={i} className="text-[10px] text-muted-foreground font-medium py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {daysInMonth.map((day) => {
                const isSelected = format(day, "yyyy-MM-dd") === selectedDate;
                const isToday = isSameDay(day, new Date());
                const hasEntryOnDay = hasEntry(day);
                const entryMood = getEntryMood(day);
                const moodInfo = MOODS.find((m) => m.value === entryMood);
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "aspect-square rounded-md flex flex-col items-center justify-center text-xs transition-colors",
                      isSelected && "bg-foreground text-background font-semibold",
                      !isSelected && isToday && "ring-1 ring-foreground",
                      !isSelected && !isToday && "hover:bg-muted"
                    )}
                  >
                    {format(day, "d")}
                    {hasEntryOnDay && (
                      <span
                        className={cn(
                          "mt-0.5 w-1 h-1 rounded-full",
                          isSelected ? "bg-background" : "bg-foreground/60"
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Recent entries - journal-style list */}
          <div className="space-y-1">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 mb-2">
              Recent entries
            </h3>
            <div className="space-y-0.5 max-h-[280px] overflow-y-auto">
              {sortedEntries.slice(0, 8).map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => setSelectedDate(entry.date)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg transition-colors",
                    entry.date === selectedDate ? "bg-muted" : "hover:bg-muted/60"
                  )}
                >
                  <p className="font-medium text-sm truncate">{entry.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(parseISO(entry.date), "MMM d, yyyy")}
                  </p>
                  {entry.mood && (() => {
                    const moodInfo = MOODS.find((m) => m.value === entry.mood);
                    const MoodIcon = moodInfo?.icon;
                    return (
                      <span className="inline-flex items-center gap-0.5 mt-1 text-xs text-muted-foreground">
                        {MoodIcon && <MoodIcon className="w-3 h-3" />}
                        {moodInfo?.label}
                      </span>
                    );
                  })()}
                </button>
              ))}
              {entries.length === 0 && (
                <p className="text-sm text-muted-foreground px-3 py-4">No entries yet. Start writing.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right: Selected day entry - journal page style */}
        <div className="md:col-span-2">
          <Card className="min-h-[400px] border border-border rounded-xl overflow-hidden">
            {/* Date header - like a journal page header */}
            <div className="px-6 py-4 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-lg">{format(parseISO(selectedDate), "EEEE, MMMM d")}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {format(parseISO(selectedDate), "yyyy")}
              </p>
            </div>

            <div className="p-6 min-h-[320px]">
              <AnimatePresence mode="wait">
                {selectedEntry ? (
                  <motion.div
                    key={selectedEntry.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      {selectedEntry.mood && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-sm">
                          {(() => {
                            const moodInfo = MOODS.find((m) => m.value === selectedEntry.mood);
                            const MoodIcon = moodInfo?.icon;
                            return (
                              <>
                                {MoodIcon && <MoodIcon className="w-3.5 h-3.5" />}
                                {moodInfo?.label}
                              </>
                            );
                          })()}
                        </span>
                      )}
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleEditEntry}>
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={handleDelete}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <h4 className="font-semibold text-xl">{selectedEntry.title}</h4>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{selectedEntry.content}</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-16 text-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <PenLine className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground mb-2">No entry for this day</p>
                    <p className="text-sm text-muted-foreground mb-4">Capture your thoughts and reflections</p>
                    <Button onClick={handleNewEntry} variant="outline" className="gap-2">
                      <Plus className="w-4 h-4" />
                      Write entry
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEntry ? "Edit Entry" : "New Entry"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">How are you feeling?</label>
              <div className="flex gap-2 flex-wrap">
                {MOODS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setMood(m.value)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all",
                      mood === m.value ? "bg-foreground text-background" : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    <m.icon className="w-4 h-4" />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's on your mind?"
                className="text-base"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Write your thoughts</label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Today I..."
                rows={8}
                className="text-base resize-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button className="flex-1 bg-foreground text-background hover:bg-foreground/90" onClick={handleSave} disabled={!title.trim()}>
                Save Entry
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
