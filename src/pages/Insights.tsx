import { useState } from "react";
import { BarChart3, TrendingUp, Target, Timer, Trophy, AlertCircle, Lightbulb, ChevronDown } from "lucide-react";
import { useHabitStore } from "@/store/habitStore";
import { useFocusStore } from "@/store/focusStore";
import { useSettingsStore } from "@/store/settingsStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { addDays, format, startOfWeek, subDays } from "date-fns";
import { calculateStreak, calculateCompletionRate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function Insights() {
  const { habits, logs } = useHabitStore();
  const { sessions } = useFocusStore();
  const { weeklyReviews, addWeeklyReview, settings } = useSettingsStore();
  
  const [range, setRange] = useState<7 | 30>(7);
  const [reviewOpen, setReviewOpen] = useState(false);

  const today = new Date();
  const days = Array.from({ length: range }, (_, i) => 
    format(subDays(today, range - 1 - i), "yyyy-MM-dd")
  );
  
  // Weekly habit completions
  const habitCompletions = days.map(date => {
    const activeHabits = habits.filter(h => !h.archived);
    const completed = activeHabits.filter(h => 
      logs.some(l => l.habitId === h.id && l.date === date && l.status === "done")
    );
    return { 
      date, 
      rate: activeHabits.length > 0 ? (completed.length / activeHabits.length) * 100 : 0,
      completed: completed.length,
      total: activeHabits.length
    };
  });

  // Focus minutes per day
  const focusMinutes = days.map(date => ({
    date,
    minutes: sessions.filter(s => s.date === date).reduce((acc, s) => acc + s.durationMinutes, 0)
  }));

  const totalFocus = focusMinutes.reduce((acc, d) => acc + d.minutes, 0);
  const avgCompletion = Math.round(habitCompletions.reduce((acc, d) => acc + d.rate, 0) / range);
  const maxFocus = Math.max(...focusMinutes.map(d => d.minutes), 1);

  // Find best day and worst day
  const dayCompletions = [0, 1, 2, 3, 4, 5, 6].map(dayNum => {
    const daysOfWeek = days.filter(d => new Date(d).getDay() === dayNum);
    const totalRate = daysOfWeek.reduce((acc, d) => {
      const dayData = habitCompletions.find(hc => hc.date === d);
      return acc + (dayData?.rate || 0);
    }, 0);
    return { day: dayNum, avgRate: daysOfWeek.length > 0 ? totalRate / daysOfWeek.length : 0 };
  });
  
  const bestDay = dayCompletions.reduce((best, curr) => curr.avgRate > best.avgRate ? curr : best);
  const worstDay = dayCompletions.reduce((worst, curr) => curr.avgRate < worst.avgRate && curr.avgRate > 0 ? curr : worst, dayCompletions[0]);

  // Most consistent and most missed habits
  const habitStats = habits.filter(h => !h.archived).map(h => ({
    habit: h,
    completionRate: calculateCompletionRate(h, logs, range),
    streak: calculateStreak(h, logs)
  })).sort((a, b) => b.completionRate - a.completionRate);

  const mostConsistent = habitStats[0];
  const mostMissed = habitStats[habitStats.length - 1];

  // Weekly review
  const weekStart = format(startOfWeek(today, { weekStartsOn: settings.weekStartsMonday ? 1 : 0 }), "yyyy-MM-dd");
  const currentReview = weeklyReviews.find(r => r.weekStart === weekStart);
  const [wins, setWins] = useState(currentReview?.wins || "");
  const [slips, setSlips] = useState(currentReview?.slips || "");
  const [adjustment, setAdjustment] = useState(currentReview?.adjustment || "");

  const saveReview = () => {
    addWeeklyReview({ weekStart, wins, slips, adjustment });
  };

  // Coach tips based on data
  const tips: string[] = [];
  if (avgCompletion < 50) {
    tips.push("Try reducing the number of habits you track. Focus on 2-3 core habits first.");
  }
  if (totalFocus < 60 && range === 7) {
    tips.push("Aim for at least 2 hours of focused work per week to build momentum.");
  }
  if (mostMissed && mostMissed.completionRate < 30) {
    tips.push(`Consider adjusting "${mostMissed.habit.name}" - it may be too ambitious or scheduled at the wrong time.`);
  }
  if (bestDay.avgRate > 70) {
    tips.push(`${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][bestDay.day]} is your strongest day. Plan important habits then.`);
  }

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-display-sm">Insights</h1>
          <p className="text-muted-foreground mt-1">Your progress over time</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={range === 7 ? "default" : "outline"} 
            size="sm"
            onClick={() => setRange(7)}
            className={range === 7 ? "gradient-primary text-primary-foreground" : ""}
          >
            7 days
          </Button>
          <Button 
            variant={range === 30 ? "default" : "outline"} 
            size="sm"
            onClick={() => setRange(30)}
            className={range === 30 ? "gradient-primary text-primary-foreground" : ""}
          >
            30 days
          </Button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="glass">
          <CardContent className="p-4">
            <TrendingUp className="w-5 h-5 text-primary mb-2" />
            <p className="text-2xl font-bold">{avgCompletion}%</p>
            <p className="text-xs text-muted-foreground">Avg completion</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4">
            <Timer className="w-5 h-5 text-primary mb-2" />
            <p className="text-2xl font-bold">{Math.floor(totalFocus / 60)}h {totalFocus % 60}m</p>
            <p className="text-xs text-muted-foreground">Total focus</p>
          </CardContent>
        </Card>
      </div>

      {/* Habit Completion Chart */}
      <Card className="glass">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Habit Completion
          </h3>
          <div className="flex items-end gap-1 h-32">
            {habitCompletions.slice(-7).map((day, i) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div 
                  className="w-full rounded-t-sm gradient-primary transition-all"
                  style={{ height: `${Math.max(4, day.rate)}%` }}
                />
                <span className="text-2xs text-muted-foreground">
                  {format(new Date(day.date), "EEE")}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Focus Minutes Chart */}
      <Card className="glass">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Timer className="w-4 h-4 text-primary" />
            Focus Minutes
          </h3>
          <div className="flex items-end gap-1 h-32">
            {focusMinutes.slice(-7).map((day) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <div 
                  className="w-full rounded-t-sm bg-primary/60 transition-all"
                  style={{ height: `${Math.max(4, (day.minutes / maxFocus) * 100)}%` }}
                />
                <span className="text-2xs text-muted-foreground">
                  {format(new Date(day.date), "EEE")}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="glass">
          <CardContent className="p-4">
            <Trophy className="w-4 h-4 text-success mb-2" />
            <p className="text-sm font-medium">Best Day</p>
            <p className="text-xs text-muted-foreground">{dayLabels[bestDay.day]}</p>
          </CardContent>
        </Card>
        
        {mostConsistent && (
          <Card className="glass">
            <CardContent className="p-4">
              <Target className="w-4 h-4 text-primary mb-2" />
              <p className="text-sm font-medium truncate">{mostConsistent.habit.name}</p>
              <p className="text-xs text-muted-foreground">Most consistent</p>
            </CardContent>
          </Card>
        )}

        {mostMissed && mostMissed.completionRate < 50 && (
          <Card className="glass col-span-2">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-warning mt-0.5" />
              <div>
                <p className="text-sm font-medium">{mostMissed.habit.name} needs attention</p>
                <p className="text-xs text-muted-foreground">{Math.round(mostMissed.completionRate)}% completion rate</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Coach Tips */}
      {tips.length > 0 && (
        <Card className="glass border-primary/20">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              Tips for You
            </h3>
            <ul className="space-y-2">
              {tips.map((tip, i) => (
                <li key={i} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-primary">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Weekly Review */}
      <Collapsible open={reviewOpen} onOpenChange={setReviewOpen}>
        <Card className="glass">
          <CollapsibleTrigger asChild>
            <CardContent className="p-4 cursor-pointer hover:bg-secondary/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Weekly Review</h3>
                  <p className="text-xs text-muted-foreground">Reflect on your week</p>
                </div>
                <ChevronDown className={cn(
                  "w-5 h-5 text-muted-foreground transition-transform",
                  reviewOpen && "rotate-180"
                )} />
              </div>
            </CardContent>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="px-4 pb-4 space-y-4">
              <div>
                <label className="text-sm font-medium">Wins this week</label>
                <Textarea 
                  value={wins}
                  onChange={e => setWins(e.target.value)}
                  placeholder="What went well?"
                  className="mt-1.5 min-h-[60px]"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Slips</label>
                <Textarea 
                  value={slips}
                  onChange={e => setSlips(e.target.value)}
                  placeholder="What didn't go as planned?"
                  className="mt-1.5 min-h-[60px]"
                />
              </div>
              <div>
                <label className="text-sm font-medium">One adjustment</label>
                <Textarea 
                  value={adjustment}
                  onChange={e => setAdjustment(e.target.value)}
                  placeholder="What will you change next week?"
                  className="mt-1.5 min-h-[60px]"
                />
              </div>
              <Button onClick={saveReview} className="w-full gradient-primary text-primary-foreground">
                Save Review
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}