import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Target, MoreVertical, Archive, Trash2, Edit } from "lucide-react";
import { useHabitStore } from "@/store/habitStore";
import { isHabitDueToday, getToday, getScheduleLabel, calculateStreak } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HABIT_COLORS, type HabitFilter } from "@/types";

export default function Habits() {
  const { habits, logs, filter, setFilter, addHabit, deleteHabit, archiveHabit, unarchiveHabit, logHabit } = useHabitStore();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [scheduleType, setScheduleType] = useState<"daily" | "weekdays" | "timesPerWeek">("daily");
  const [color, setColor] = useState<string>(HABIT_COLORS[0]);
  const today = getToday();

  const filteredHabits = habits.filter(h => {
    switch (filter) {
      case "today": return !h.archived && isHabitDueToday(h);
      case "active": return !h.archived;
      case "archived": return h.archived;
      default: return true;
    }
  });

  const handleCreate = () => {
    if (!name.trim()) return;
    addHabit({
      name: name.trim(),
      color,
      schedule: { type: scheduleType, timesPerWeek: scheduleType === "timesPerWeek" ? 3 : undefined },
      goalType: "check",
    });
    setName("");
    setIsOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-display-sm">Habits</h1>
          <p className="text-muted-foreground mt-1">Build consistent routines</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground shadow-glow">
              <Plus className="w-4 h-4 mr-2" />
              New Habit
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-strong">
            <DialogHeader>
              <DialogTitle>Create Habit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Exercise" className="mt-1.5" />
              </div>
              <div>
                <Label>Schedule</Label>
                <Select value={scheduleType} onValueChange={(v: any) => setScheduleType(v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Every day</SelectItem>
                    <SelectItem value="weekdays">Weekdays</SelectItem>
                    <SelectItem value="timesPerWeek">3× per week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Color</Label>
                <div className="flex gap-2 mt-1.5">
                  {HABIT_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full transition-transform ${color === c ? "scale-110 ring-2 ring-offset-2 ring-offset-background ring-primary" : ""}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <Button onClick={handleCreate} className="w-full gradient-primary text-primary-foreground">Create Habit</Button>
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
              <p className="text-muted-foreground">No habits found</p>
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
                  <Card className={`glass hover-lift ${isDone ? "border-success/30" : ""}`}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: habit.color || "hsl(var(--primary))" }} />
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${isDone ? "line-through text-muted-foreground" : ""}`}>{habit.name}</p>
                        <p className="text-xs text-muted-foreground">{getScheduleLabel(habit)} · {streak.current} day streak</p>
                      </div>
                      {!habit.archived && (
                        <Button
                          size="sm"
                          variant={isDone ? "secondary" : "default"}
                          className={isDone ? "" : "gradient-primary text-primary-foreground"}
                          onClick={() => logHabit(habit.id, isDone ? "skipped" : "done")}
                        >
                          {isDone ? "✓" : "Done"}
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {habit.archived ? (
                            <DropdownMenuItem onClick={() => unarchiveHabit(habit.id)}>
                              <Archive className="w-4 h-4 mr-2" />Unarchive
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => archiveHabit(habit.id)}>
                              <Archive className="w-4 h-4 mr-2" />Archive
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => deleteHabit(habit.id)} className="text-destructive">
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
    </div>
  );
}
