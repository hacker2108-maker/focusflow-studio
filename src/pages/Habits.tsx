import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Target, MoreVertical, Archive, Trash2, Edit, Flame, TrendingUp } from "lucide-react";
import { useHabitStore } from "@/store/habitStore";
import { isHabitDueToday, getToday, getScheduleLabel, calculateStreak, calculateCompletionRate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { HABIT_COLORS, DAY_NAMES, type HabitFilter, type Habit } from "@/types";
import { toast } from "sonner";
import { HabitFormDialog, type HabitFormData } from "@/components/habits/HabitFormDialog";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";

export default function Habits() {
  const { habits, logs, filter, setFilter, addHabit, updateHabit, deleteHabit, archiveHabit, unarchiveHabit, logHabit } = useHabitStore();
  const [isOpen, setIsOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [detailHabit, setDetailHabit] = useState<Habit | null>(null);
  
  const today = getToday();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshKey(k => k + 1);
    toast.success("Refreshed!");
  }, []);

  const filteredHabits = habits.filter(h => {
    switch (filter) {
      case "today": return !h.archived && isHabitDueToday(h);
      case "active": return !h.archived;
      case "archived": return h.archived;
      default: return true;
    }
  });

  const openEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setIsOpen(true);
  };

  const handleSave = (data: HabitFormData) => {
    const habitData = {
      name: data.name,
      description: data.description,
      color: data.color,
      schedule: data.schedule,
      goalType: data.goalType,
      goalTarget: data.goalTarget,
      reminderTime: data.reminderTime,
    };

    if (editingHabit) {
      updateHabit(editingHabit.id, habitData);
      toast.success("Habit updated");
    } else {
      addHabit(habitData);
      toast.success("Habit created" + (data.reminderTime ? ` with reminder at ${data.reminderTime}` : ""));
      setFilter("active");
    }
    
    setEditingHabit(null);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this habit? This cannot be undone.")) {
      deleteHabit(id);
      toast.success("Habit deleted");
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) setEditingHabit(null);
  };

  // Detail view data
  const detailStreak = detailHabit ? calculateStreak(detailHabit, logs) : { current: 0, best: 0 };
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - i));
    return {
      date: date.toISOString().split('T')[0],
      dayNum: date.getDay()
    };
  });

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div key={refreshKey} className="space-y-6 animate-fade-in pb-24">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Habits</h1>
          <p className="text-muted-foreground mt-1">Build consistent routines</p>
        </div>
        <Button 
          onClick={() => setIsOpen(true)}
          className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Habit
        </Button>
      </header>

      {/* Habit Form Dialog */}
      <HabitFormDialog
        open={isOpen}
        onOpenChange={handleOpenChange}
        editingHabit={editingHabit}
        onSave={handleSave}
      />

      <Tabs value={filter} onValueChange={v => setFilter(v as HabitFilter)}>
        <TabsList className="rounded-full bg-muted/50 p-1">
          <TabsTrigger value="today" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm">Today</TabsTrigger>
          <TabsTrigger value="active" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm">Active</TabsTrigger>
          <TabsTrigger value="archived" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm">Archived</TabsTrigger>
        </TabsList>
      </Tabs>

      <AnimatePresence mode="popLayout">
        {filteredHabits.length === 0 ? (
          <Card className="glass">
            <CardContent className="p-8 text-center">
              <Target className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {filter === "today" ? "No habits due today" : 
                 filter === "archived" ? "No archived habits" : "No habits yet"}
              </p>
              {filter !== "archived" && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setIsOpen(true)}
                >
                  Create your first habit
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredHabits.map((habit, i) => {
              const log = logs.find(l => l.habitId === habit.id && l.date === today);
              const isDone = log?.status === "done";
              const streak = calculateStreak(habit, logs);
              const weeklyRate = calculateCompletionRate(habit, logs, 7);

              // Get last 7 days completion status
              const last7Days = Array.from({ length: 7 }, (_, idx) => {
                const date = new Date();
                date.setDate(date.getDate() - (6 - idx));
                const dateStr = date.toISOString().split('T')[0];
                return logs.some(l => l.habitId === habit.id && l.date === dateStr && l.status === "done");
              });

              return (
                <motion.div
                  key={habit.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card 
                    className={`glass hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden ${isDone ? "border-success/30" : ""}`}
                    onClick={() => setDetailHabit(habit)}
                  >
                    <CardContent className="p-0">
                      {/* Main content */}
                      <div className="p-4 flex items-center gap-4">
                        {/* Icon/Color indicator - habit app style */}
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-transform ring-2 ring-offset-2"
                          style={{ 
                            backgroundColor: (habit.color || "hsl(var(--primary))") + "25",
                            boxShadow: isDone ? `inset 0 0 0 2px ${habit.color || "hsl(var(--primary))"}` : "none"
                          }}
                        >
                          {isDone ? (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-6 h-6 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: habit.color || "hsl(var(--primary))" }}
                            >
                              <span className="text-primary-foreground text-sm font-bold">✓</span>
                            </motion.div>
                          ) : (
                            <Flame className="w-6 h-6" style={{ color: habit.color || "hsl(var(--primary))" }} />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold truncate ${isDone ? "line-through text-muted-foreground" : ""}`}>
                            {habit.name}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted-foreground">{getScheduleLabel(habit)}</span>
                            {streak.current > 0 && (
                              <span 
                                className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                                style={{ 
                                  backgroundColor: (habit.color || "hsl(var(--primary))") + "20",
                                  color: habit.color || "hsl(var(--primary))"
                                }}
                              >
                                <Flame className="w-3 h-3" />
                                {streak.current} day{streak.current !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        {!habit.archived && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`h-10 px-4 rounded-xl font-medium text-sm transition-all ${
                              isDone 
                                ? "bg-success/20 text-success" 
                                : "text-primary-foreground shadow-glow"
                            }`}
                            style={!isDone ? { background: `var(--gradient-primary)` } : {}}
                            onClick={(e) => {
                              e.stopPropagation();
                              logHabit(habit.id, isDone ? "skipped" : "done");
                            }}
                          >
                            {isDone ? "Done ✓" : "Mark Done"}
                          </motion.button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(habit); }}>
                              <Edit className="w-4 h-4 mr-2" />Edit
                            </DropdownMenuItem>
                            {habit.archived ? (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); unarchiveHabit(habit.id); }}>
                                <Archive className="w-4 h-4 mr-2" />Unarchive
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); archiveHabit(habit.id); }}>
                                <Archive className="w-4 h-4 mr-2" />Archive
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={(e) => { e.stopPropagation(); handleDelete(habit.id); }} 
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Weekly progress bar - habit app style */}
                      <div className="px-4 pb-3">
                        <div className="flex items-center gap-1.5">
                          {last7Days.map((completed, idx) => (
                            <div 
                              key={idx}
                              className={`flex-1 h-2 rounded-full transition-all ${
                                completed ? "" : "bg-muted"
                              }`}
                              style={completed ? { backgroundColor: habit.color || "hsl(var(--primary))" } : {}}
                              title={completed ? "Completed" : "Missed"}
                            />
                          ))}
                        </div>
                        <div className="flex justify-between mt-2">
                          <span className="text-xs text-muted-foreground">Last 7 days</span>
                          <span className="text-xs font-medium" style={{ color: habit.color || "hsl(var(--primary))" }}>
                            {weeklyRate}%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* Habit Detail Sheet */}
      <Sheet open={!!detailHabit} onOpenChange={(open) => !open && setDetailHabit(null)}>
        <SheetContent className="glass-strong">
          {detailHabit && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-5 h-5 rounded-full" 
                    style={{ backgroundColor: detailHabit.color || "hsl(var(--primary))" }} 
                  />
                  <SheetTitle>{detailHabit.name}</SheetTitle>
                </div>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                {detailHabit.description && (
                  <p className="text-sm text-muted-foreground">{detailHabit.description}</p>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <Card className="glass">
                    <CardContent className="p-4 text-center">
                      <Flame className="w-5 h-5 text-primary mx-auto mb-1" />
                      <p className="text-2xl font-bold">{detailStreak.current}</p>
                      <p className="text-xs text-muted-foreground">Current streak</p>
                    </CardContent>
                  </Card>
                  <Card className="glass">
                    <CardContent className="p-4 text-center">
                      <Target className="w-5 h-5 text-success mx-auto mb-1" />
                      <p className="text-2xl font-bold">{detailStreak.best}</p>
                      <p className="text-xs text-muted-foreground">Best streak</p>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <p className="text-sm font-medium mb-3">Last 14 days</p>
                  <div className="grid grid-cols-7 gap-1">
                    {last14Days.map(({ date, dayNum }) => {
                      const hasLog = logs.some(l => 
                        l.habitId === detailHabit.id && l.date === date && l.status === "done"
                      );
                      return (
                        <div
                          key={date}
                          className={`aspect-square rounded-md flex items-center justify-center text-2xs ${
                            hasLog 
                              ? "gradient-primary text-primary-foreground" 
                              : "bg-secondary text-muted-foreground"
                          }`}
                          title={date}
                        >
                          {DAY_NAMES[dayNum]}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => { setDetailHabit(null); openEdit(detailHabit); }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => { archiveHabit(detailHabit.id); setDetailHabit(null); }}
                  >
                    <Archive className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
    </PullToRefresh>
  );
}