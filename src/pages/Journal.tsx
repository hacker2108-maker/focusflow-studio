import { useState, useMemo } from "react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronLeft, ChevronRight, Smile, Meh, Frown, Heart, Trash2, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useJournalStore, JournalEntry } from "@/store/journalStore";

const MOODS = [
  { value: "great", icon: Heart, label: "Great", color: "text-success" },
  { value: "good", icon: Smile, label: "Good", color: "text-primary" },
  { value: "okay", icon: Meh, label: "Okay", color: "text-muted-foreground" },
  { value: "bad", icon: Frown, label: "Bad", color: "text-warning" },
  { value: "terrible", icon: Frown, label: "Terrible", color: "text-destructive" },
] as const;

export default function Journal() {
  const { entries, addEntry, updateEntry, deleteEntry } = useJournalStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [isEditing, setIsEditing] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  
  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<JournalEntry["mood"]>(undefined);
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const selectedEntry = useMemo(() => {
    return entries.find((e) => e.date === selectedDate);
  }, [entries, selectedDate]);
  
  const entriesThisMonth = useMemo(() => {
    return entries.filter((e) => {
      const entryDate = parseISO(e.date);
      return entryDate >= monthStart && entryDate <= monthEnd;
    });
  }, [entries, monthStart, monthEnd]);
  
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };
  
  const handleDayClick = (day: Date) => {
    setSelectedDate(format(day, "yyyy-MM-dd"));
  };
  
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
    if (selectedEntry) {
      deleteEntry(selectedEntry.id);
    }
  };
  
  const hasEntry = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return entriesThisMonth.some((e) => e.date === dateStr);
  };
  
  const getEntryMood = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const entry = entriesThisMonth.find((e) => e.date === dateStr);
    return entry?.mood;
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Journal</h1>
          <p className="text-sm text-muted-foreground">Capture your thoughts</p>
        </div>
        <Button onClick={handleNewEntry} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Entry</span>
        </Button>
      </div>
      
      {/* Calendar Mini View */}
      <Card className="p-4 glass">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="font-semibold">{format(currentDate, "MMMM yyyy")}</h2>
          <Button variant="ghost" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
            <div key={i} className="text-xs text-muted-foreground font-medium py-1">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before month start */}
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
                  "aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all relative",
                  isSelected && "bg-primary text-primary-foreground",
                  !isSelected && isToday && "ring-2 ring-primary/50",
                  !isSelected && "hover:bg-secondary"
                )}
              >
                <span className={cn(isSelected ? "font-semibold" : "")}>
                  {format(day, "d")}
                </span>
                {hasEntryOnDay && (
                  <div
                    className={cn(
                      "absolute bottom-1 w-1.5 h-1.5 rounded-full",
                      isSelected ? "bg-primary-foreground" : moodInfo?.color || "bg-primary"
                    )}
                    style={!isSelected && entryMood ? { backgroundColor: getMoodColor(entryMood) } : {}}
                  />
                )}
              </button>
            );
          })}
        </div>
      </Card>
      
      {/* Selected Date Entry */}
      <Card className="p-4 glass">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{format(parseISO(selectedDate), "EEEE, MMMM d")}</h3>
          {selectedEntry && (
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={handleEditEntry}>
                <Edit3 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
        
        <AnimatePresence mode="wait">
          {selectedEntry ? (
            <motion.div
              key={selectedEntry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2">
                {selectedEntry.mood && (
                  <span className="text-sm px-2 py-1 rounded-full bg-secondary">
                    {MOODS.find((m) => m.value === selectedEntry.mood)?.label}
                  </span>
                )}
              </div>
              <h4 className="font-medium text-lg">{selectedEntry.title}</h4>
              <p className="text-muted-foreground whitespace-pre-wrap">{selectedEntry.content}</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-muted-foreground"
            >
              <p className="mb-4">No entry for this day</p>
              <Button variant="outline" onClick={handleNewEntry}>
                Write something
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
      
      {/* Recent Entries */}
      {entries.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-muted-foreground text-sm">Recent Entries</h3>
          <div className="space-y-2">
            {entries.slice(0, 5).map((entry) => (
              <Card
                key={entry.id}
                className={cn(
                  "p-3 cursor-pointer transition-all hover:bg-secondary/50",
                  entry.date === selectedDate && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedDate(entry.date)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{entry.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(entry.date), "MMM d, yyyy")}
                    </p>
                  </div>
                  {entry.mood && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary">
                      {MOODS.find((m) => m.value === entry.mood)?.label}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? "Edit Entry" : "New Entry"}
            </DialogTitle>
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
                      mood === m.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary hover:bg-secondary/80"
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
              <Button className="flex-1" onClick={handleSave} disabled={!title.trim()}>
                Save Entry
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getMoodColor(mood: string): string {
  switch (mood) {
    case "great": return "hsl(142 71% 45%)";
    case "good": return "hsl(38 92% 50%)";
    case "okay": return "hsl(240 4% 46%)";
    case "bad": return "hsl(38 92% 50%)";
    case "terrible": return "hsl(0 84% 60%)";
    default: return "hsl(38 92% 50%)";
  }
}
