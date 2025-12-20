import { BarChart3, TrendingUp, Target, Timer } from "lucide-react";
import { useHabitStore } from "@/store/habitStore";
import { useFocusStore } from "@/store/focusStore";
import { Card, CardContent } from "@/components/ui/card";
import { addDays, format } from "date-fns";

export default function Insights() {
  const { habits, logs } = useHabitStore();
  const { sessions } = useFocusStore();

  const last7Days = Array.from({ length: 7 }, (_, i) => format(addDays(new Date(), -6 + i), "yyyy-MM-dd"));
  
  const weeklyHabitCompletions = last7Days.map(date => {
    const dueHabits = habits.filter(h => !h.archived);
    const completed = dueHabits.filter(h => 
      logs.some(l => l.habitId === h.id && l.date === date && l.status === "done")
    );
    return { date, rate: dueHabits.length > 0 ? (completed.length / dueHabits.length) * 100 : 0 };
  });

  const weeklyFocusMinutes = last7Days.map(date => ({
    date,
    minutes: sessions.filter(s => s.date === date).reduce((acc, s) => acc + s.durationMinutes, 0)
  }));

  const totalFocusThisWeek = weeklyFocusMinutes.reduce((acc, d) => acc + d.minutes, 0);
  const avgCompletion = Math.round(weeklyHabitCompletions.reduce((acc, d) => acc + d.rate, 0) / 7);

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-display-sm">Insights</h1>
        <p className="text-muted-foreground mt-1">Your progress over time</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Card className="glass">
          <CardContent className="p-4">
            <TrendingUp className="w-5 h-5 text-primary mb-2" />
            <p className="text-2xl font-bold">{avgCompletion}%</p>
            <p className="text-xs text-muted-foreground">Avg completion (7d)</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4">
            <Timer className="w-5 h-5 text-primary mb-2" />
            <p className="text-2xl font-bold">{Math.floor(totalFocusThisWeek / 60)}h {totalFocusThisWeek % 60}m</p>
            <p className="text-xs text-muted-foreground">Focus this week</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Habit Completion (7 days)
          </h3>
          <div className="flex items-end gap-1 h-32">
            {weeklyHabitCompletions.map((day, i) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div 
                  className="w-full rounded-t-sm gradient-primary transition-all"
                  style={{ height: `${Math.max(4, day.rate)}%` }}
                />
                <span className="text-2xs text-muted-foreground">
                  {format(addDays(new Date(), -6 + i), "EEE")}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Timer className="w-4 h-4 text-primary" />
            Focus Minutes (7 days)
          </h3>
          <div className="flex items-end gap-1 h-32">
            {weeklyFocusMinutes.map((day, i) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div 
                  className="w-full rounded-t-sm bg-primary/60 transition-all"
                  style={{ height: `${Math.max(4, (day.minutes / Math.max(...weeklyFocusMinutes.map(d => d.minutes), 1)) * 100)}%` }}
                />
                <span className="text-2xs text-muted-foreground">
                  {format(addDays(new Date(), -6 + i), "EEE")}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
