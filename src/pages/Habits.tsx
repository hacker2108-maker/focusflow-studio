import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Target, MoreVertical, Archive, Trash2, Edit, Flame, X } from "lucide-react";
import { useHabitStore } from "@/store/habitStore";
import { isHabitDueToday, getToday, getScheduleLabel, calculateStreak } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { HABIT_COLORS, DAY_NAMES, type HabitFilter, type Habit } from "@/types";
import { toast } from "sonner";

export default function Habits() {
  const { habits, logs, filter, setFilter, addHabit, updateHabit, deleteHabit, archiveHabit, unarchiveHabit, logHabit } = useHabitStore();
  const [isOpen, setIsOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [detailHabit, setDetailHabit] = useState<Habit | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scheduleType, setScheduleType] = useState<"daily" | "weekdays" | "customDays" | "timesPerWeek">("daily");
  const [customDays, setCustomDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [timesPerWeek, setTimesPerWeek] = useState(3);
  const [color, setColor] = useState<string>(HABIT_COLORS[0]);
  const [goalType, setGoalType] = useState<"check" | "count">("check");
  const [goalTarget, setGoalTarget] = useState(1);
  
  const today = getToday();

  const filteredHabits = habits.filter(h => {
    switch (filter) {
      case "today": return !h.archived && isHabitDueToday(h);
      case "active": return !h.archived;
      case "archived": return h.archived;
      default: return true;
    }
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setScheduleType("daily");
    setCustomDays([1, 2, 3, 4, 5]);
    setTimesPerWeek(3);
    setColor(HABIT_COLORS[0]);
    setGoalType("check");
    setGoalTarget(1);
    setEditingHabit(null);
  };

  const openEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setName(habit.name);
    setDescription(habit.description || "");
    setScheduleType(habit.schedule.type);
    setCustomDays(habit.schedule.daysOfWeek || [1, 2, 3, 4, 5]);
    setTimesPerWeek(habit.schedule.timesPerWeek || 3);
    setColor(habit.color || HABIT_COLORS[0]);
    setGoalType(habit.goalType);
    setGoalTarget(habit.goalTarget || 1);
    setIsOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    
    const habitData = {
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      schedule: {
        type: scheduleType,
        daysOfWeek: scheduleType === "customDays" ? customDays : undefined,
        timesPerWeek: scheduleType === "timesPerWeek" ? timesPerWeek : undefined,
      },
      goalType,
      goalTarget: goalType === "count" ? goalTarget : undefined,
    };

    if (editingHabit) {
      updateHabit(editingHabit.id, habitData);
      toast.success("Habit updated");
    } else {
      addHabit(habitData);
      toast.success("Habit created");
    }
    
    resetForm();
    setIsOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this habit? This cannot be undone.")) {
      deleteHabit(id);
      toast.success("Habit deleted");
    }
  };

  const toggleCustomDay = (day: number) => {
    setCustomDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
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
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-display-sm">Habits</h1>
          <p className="text-muted-foreground mt-1">Build consistent routines</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground shadow-glow">
              <Plus className="w-4 h-4 mr-2" />
              New Habit
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-strong max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingHabit ? "Edit Habit" : "Create Habit"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Name *</Label>
                <Input 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="e.g., Exercise" 
                  className="mt-1.5" 
                />
              </div>
              
              <div>
                <Label>Description</Label>
                <Textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Optional details..." 
                  className="mt-1.5 min-h-[60px]" 
                />
              </div>

              <div>
                <Label>Schedule</Label>
                <Select value={scheduleType} onValueChange={(v: any) => setScheduleType(v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Every day</SelectItem>
                    <SelectItem value="weekdays">Weekdays only</SelectItem>
                    <SelectItem value="customDays">Custom days</SelectItem>
                    <SelectItem value="timesPerWeek">Times per week</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {scheduleType === "customDays" && (
                <div className="flex flex-wrap gap-2">
                  {DAY_NAMES.map((day, i) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleCustomDay(i)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                        customDays.includes(i) 
                          ? "gradient-primary text-primary-foreground" 
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              )}

              {scheduleType === "timesPerWeek" && (
                <div>
                  <Label>Times per week</Label>
                  <Select value={timesPerWeek.toString()} onValueChange={v => setTimesPerWeek(parseInt(v))}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7].map(n => (
                        <SelectItem key={n} value={n.toString()}>{n}× per week</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Goal Type</Label>
                <Select value={goalType} onValueChange={(v: any) => setGoalType(v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="check">Check off (done/not done)</SelectItem>
                    <SelectItem value="count">Count (track a number)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {goalType === "count" && (
                <div>
                  <Label>Daily target</Label>
                  <Input 
                    type="number" 
                    min={1} 
                    value={goalTarget} 
                    onChange={e => setGoalTarget(parseInt(e.target.value) || 1)} 
                    className="mt-1.5" 
                  />
                </div>
              )}

              <div>
                <Label>Color</Label>
                <div className="flex gap-2 mt-1.5">
                  {HABIT_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        color === c ? "scale-110 ring-2 ring-offset-2 ring-offset-background ring-primary" : ""
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <Button onClick={handleSave} className="w-full gradient-primary text-primary-foreground">
                {editingHabit ? "Save Changes" : "Create Habit"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <Tabs value={filter} onValueChange={v => setFilter(v as HabitFilter)}>
        <TabsList className="glass">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
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
          <div className="space-y-2">
            {filteredHabits.map((habit, i) => {
              const log = logs.find(l => l.habitId === habit.id && l.date === today);
              const isDone = log?.status === "done";
              const streak = calculateStreak(habit, logs);

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
                    className={`glass hover-lift cursor-pointer ${isDone ? "border-success/30" : ""}`}
                    onClick={() => setDetailHabit(habit)}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: habit.color || "hsl(var(--primary))" }} 
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${isDone ? "line-through text-muted-foreground" : ""}`}>
                          {habit.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{getScheduleLabel(habit)}</span>
                          {streak.current > 0 && (
                            <span className="flex items-center gap-1 text-primary">
                              <Flame className="w-3 h-3" />
                              {streak.current}
                            </span>
                          )}
                        </div>
                      </div>
                      {!habit.archived && (
                        <Button
                          size="sm"
                          variant={isDone ? "secondary" : "default"}
                          className={isDone ? "" : "gradient-primary text-primary-foreground"}
                          onClick={(e) => {
                            e.stopPropagation();
                            logHabit(habit.id, isDone ? "skipped" : "done");
                          }}
                        >
                          {isDone ? "✓" : "Done"}
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
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
  );
}