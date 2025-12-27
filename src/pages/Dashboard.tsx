import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Target, Timer, Flame, CheckCircle2, CalendarDays, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { useHabitStore } from "@/store/habitStore";
import { useFocusStore } from "@/store/focusStore";
import { useCalendarStore } from "@/store/calendarStore";
import { isHabitDueToday, getToday, calculateStreak, formatMinutes, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WeatherWidget } from "@/components/WeatherWidget";
import { TimeWidget } from "@/components/TimeWidget";
import { toast } from "sonner";


export default function Dashboard() {
  const { habits, logs, logHabit } = useHabitStore();
  const { sessions } = useFocusStore();
  const { events } = useCalendarStore();
  const today = getToday();

  const todayHabits = habits.filter(h => !h.archived && isHabitDueToday(h));
  const completedToday = todayHabits.filter(h => 
    logs.some(l => l.habitId === h.id && l.date === today && l.status === "done")
  );

  const todaySessions = sessions.filter(s => s.date === today);
  const todayFocusMinutes = todaySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  
  const todayEvents = events.filter(e => e.date === today).slice(0, 3);

  const bestStreak = habits.reduce((best, h) => {
    const streak = calculateStreak(h, logs);
    return streak.current > best ? streak.current : best;
  }, 0);

  const completionRate = todayHabits.length > 0 
    ? Math.round((completedToday.length / todayHabits.length) * 100) 
    : 100;

  return (
    <div className="space-y-6 animate-fade-in pb-24 overflow-y-auto">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-display-sm text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">{formatDate(new Date(), "EEEE, MMMM d")}</p>
        </div>
      </header>

      {/* Time and Weather Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TimeWidget />
        <WeatherWidget compact />
      </div>
      <WeatherWidget />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={CheckCircle2} label="Completed" value={`${completionRate}%`} color="text-success" />
        <StatCard icon={Flame} label="Best Streak" value={`${bestStreak} days`} color="text-primary" />
        <StatCard icon={Target} label="Today" value={`${completedToday.length}/${todayHabits.length}`} color="text-foreground" />
        <StatCard icon={Timer} label="Focus" value={formatMinutes(todayFocusMinutes)} color="text-primary" />
      </div>

      {/* Today's Events */}
      {todayEvents.length > 0 && (
        <Card className="glass border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                Today's Schedule
              </h3>
              <Link to="/calendar">
                <Button variant="ghost" size="sm">View all</Button>
              </Link>
            </div>
            <div className="space-y-2">
              {todayEvents.map(event => (
                <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                  <div 
                    className="w-1 h-8 rounded-full" 
                    style={{ backgroundColor: event.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{event.startTime} - {event.endTime}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/focus">
          <Card className="glass border-primary/20 hover:border-primary/40 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
              <Timer className="w-8 h-8 text-primary mb-2" />
              <p className="font-semibold">Start Focus</p>
              <p className="text-xs text-muted-foreground">25 min Pomodoro</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/journal">
          <Card className="glass hover:border-primary/20 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
              <BookOpen className="w-8 h-8 text-primary mb-2" />
              <p className="font-semibold">Write Journal</p>
              <p className="text-xs text-muted-foreground">Capture thoughts</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Today's Habits */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Today's Habits</h2>
          <Link to="/habits">
            <Button variant="ghost" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </Link>
        </div>

        {todayHabits.length === 0 ? (
          <Card className="glass">
            <CardContent className="p-8 text-center">
              <Target className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No habits for today</p>
              <Link to="/habits">
                <Button variant="outline" className="mt-4">Create your first habit</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {todayHabits.map((habit, i) => {
              const log = logs.find(l => l.habitId === habit.id && l.date === today);
              const isDone = log?.status === "done";

              return (
                <motion.div
                  key={habit.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className={`glass transition-all ${isDone ? "border-success/30 bg-success/5" : ""}`}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: habit.color || "hsl(var(--primary))" }}
                        />
                        <span className={`font-medium ${isDone ? "text-muted-foreground line-through" : ""}`}>
                          {habit.name}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant={isDone ? "secondary" : "default"}
                        className={isDone ? "" : "gradient-primary text-primary-foreground"}
                        onClick={() => logHabit(habit.id, isDone ? "skipped" : "done")}
                      >
                        {isDone ? "Done" : "Complete"}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <Card className="glass">
      <CardContent className="p-4">
        <Icon className={`w-5 h-5 ${color} mb-2`} />
        <p className="text-xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
