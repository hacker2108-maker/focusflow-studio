import { useState, useMemo, useEffect } from "react";
import { BarChart3, TrendingUp, Target, Timer, Trophy, AlertCircle, Lightbulb, ChevronDown, ChevronLeft, ChevronRight, Brain, Zap, Calendar } from "lucide-react";
import { useHabitStore } from "@/store/habitStore";
import { useFocusStore } from "@/store/focusStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useJournalStore } from "@/store/journalStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { format, startOfWeek, endOfWeek, subWeeks, addDays, subDays } from "date-fns";
import { calculateStreak, calculateCompletionRate, isHabitDueOnDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

export default function Insights() {
  const { habits, logs } = useHabitStore();
  const { sessions, fetchSessions } = useFocusStore();
  const { weeklyReviews, addWeeklyReview, settings } = useSettingsStore();
  const { entries: journalEntries } = useJournalStore();
  
  const [range, setRange] = useState<7 | 30>(7);

  // Refresh focus sessions when the page mounts to ensure latest data
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, 1 = last week, etc.

  const today = new Date();
  const todayNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);

  // Week selector dates
  const weekStartsOn = settings.weekStartsMonday ? 1 : 0;
  const selectedWeekStart = startOfWeek(subWeeks(todayNoon, weekOffset), { weekStartsOn });
  const selectedWeekEnd = endOfWeek(subWeeks(todayNoon, weekOffset), { weekStartsOn });

  // Generate week days for the selected week
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    format(addDays(selectedWeekStart, i), "yyyy-MM-dd")
  );

  // Generate days for overall stats (range-based)
  const days = Array.from({ length: range }, (_, i) => 
    format(subDays(todayNoon, range - 1 - i), "yyyy-MM-dd")
  );
  
  // Weekly habit completions for the selected week (for week chart)
  const weekHabitCompletions = weekDays.map((date) => {
    const activeHabits = habits.filter((h) => !h.archived);
    const dateObj = new Date(date + "T12:00:00");
    const dueHabits = activeHabits.filter((h) => isHabitDueOnDate(h, dateObj));
    const completed = dueHabits.filter((h) =>
      logs.some((l) => l.habitId === h.id && l.date === date && l.status === "done")
    );

    const total = dueHabits.length;
    return {
      date,
      day: format(dateObj, "EEE"),
      rate: total > 0 ? Math.round((completed.length / total) * 100) : 0,
      completed: completed.length,
      total,
    };
  });

  // Weekly focus minutes for the selected week
  const weekFocusMinutes = weekDays.map((date) => ({
    date,
    day: format(new Date(date + "T12:00:00"), "EEE"),
    minutes: sessions
      .filter((s) => s.date === date)
      .reduce((acc, s) => acc + s.durationMinutes, 0),
  }));

  // Overall stats use the range-based days
  const habitCompletions = days.map((date) => {
    const activeHabits = habits.filter((h) => !h.archived);
    const dateObj = new Date(date + "T12:00:00");
    const dueHabits = activeHabits.filter((h) => isHabitDueOnDate(h, dateObj));
    const completed = dueHabits.filter((h) =>
      logs.some((l) => l.habitId === h.id && l.date === date && l.status === "done")
    );

    const total = dueHabits.length;
    return {
      date,
      day: format(dateObj, "EEE"),
      rate: total > 0 ? Math.round((completed.length / total) * 100) : 0,
      completed: completed.length,
      total,
    };
  });

  // Focus minutes per day (for overall stats)
  const focusMinutes = days.map((date) => ({
    date,
    day: format(new Date(date + "T12:00:00"), "EEE"),
    minutes: sessions
      .filter((s) => s.date === date)
      .reduce((acc, s) => acc + s.durationMinutes, 0),
  }));

  // Selected week focus total (follows the week selector)
  const selectedWeekFocusTotal = weekFocusMinutes.reduce((acc, d) => acc + d.minutes, 0);
  const totalFocus = selectedWeekFocusTotal;

  // Average completion should ignore days where no habits were due (so weekends don't tank the score)
  const completionDays = habitCompletions.filter((d) => d.total > 0);
  const avgCompletion = completionDays.length
    ? Math.round(completionDays.reduce((acc, d) => acc + d.rate, 0) / completionDays.length)
    : 0;

  const totalSessions = sessions.filter((s) => days.includes(s.date)).length;

  // Mood tracking from journal
  const moodCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    journalEntries.filter((e) => days.includes(e.date)).forEach((e) => {
      if (e.mood) {
        counts[e.mood] = (counts[e.mood] || 0) + 1;
      }
    });
    return counts;
  }, [journalEntries, days]);

  const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  // ML-like progress tracking
  const progressScore = useMemo(() => {
    let score = 0;
    
    // Habit completion contributes 40%
    score += avgCompletion * 0.4;
    
    // Focus time contributes 30% (max 120 min/day average = 100%)
    const avgDailyFocus = totalFocus / range;
    score += Math.min(100, (avgDailyFocus / 120) * 100) * 0.3;
    
    // Consistency bonus 20% (streaks)
    const avgStreak = habits.filter(h => !h.archived).reduce((acc, h) => {
      return acc + calculateStreak(h, logs).current;
    }, 0) / Math.max(1, habits.filter(h => !h.archived).length);
    score += Math.min(100, avgStreak * 10) * 0.2;
    
    // Journaling bonus 10%
    const journalDays = new Set(journalEntries.filter(e => days.includes(e.date)).map(e => e.date)).size;
    score += (journalDays / range) * 100 * 0.1;
    
    return Math.round(score);
  }, [avgCompletion, totalFocus, range, habits, logs, journalEntries, days]);

  // Trend calculation (compare against previous period using the same "due habits" logic)
  const previousPeriod = Array.from({ length: range }, (_, i) =>
    format(subDays(todayNoon, range * 2 - 1 - i), "yyyy-MM-dd")
  );
  
  const previousAvg = useMemo(() => {
    const activeHabits = habits.filter((h) => !h.archived);

    const dayRates = previousPeriod.map((date) => {
      const dateObj = new Date(date + "T12:00:00");
      const dueHabits = activeHabits.filter((h) => isHabitDueOnDate(h, dateObj));
      const total = dueHabits.length;
      if (total === 0) return null;

      const completed = dueHabits.filter((h) =>
        logs.some((l) => l.habitId === h.id && l.date === date && l.status === "done")
      );

      return (completed.length / total) * 100;
    });

    const validRates = dayRates.filter((r): r is number => r !== null);
    return validRates.length
      ? Math.round(validRates.reduce((a, b) => a + b, 0) / validRates.length)
      : 0;
  }, [previousPeriod, habits, logs]);

  const trend = avgCompletion - previousAvg;

  // Find best day and worst day
  const dayCompletions = [0, 1, 2, 3, 4, 5, 6].map(dayNum => {
    const daysOfWeek = days.filter(d => new Date(d + "T12:00:00").getDay() === dayNum);
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

  // Smart tips based on ML-like analysis
  const tips: string[] = useMemo(() => {
    const tips: string[] = [];
    
    if (progressScore < 40) {
      tips.push("Your productivity score is low. Try focusing on just 1-2 key habits to build momentum.");
    } else if (progressScore >= 80) {
      tips.push("Excellent progress! You're in the top performance zone. Consider adding a new challenge.");
    }
    
    if (trend < -10) {
      tips.push("Your completion rate dropped compared to last period. Check if you're overcommitting.");
    } else if (trend > 10) {
      tips.push(`Great improvement! You're up ${trend}% from last period.`);
    }
    
    if (totalFocus < 60 && range === 7) {
      tips.push("Try adding at least 30 minutes of focused work daily to boost productivity.");
    }
    
    if (mostMissed && mostMissed.completionRate < 30) {
      tips.push(`"${mostMissed.habit.name}" needs attention. Consider adjusting the schedule or breaking it down.`);
    }
    
    if (bestDay.avgRate > 70) {
      tips.push(`${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][bestDay.day]} is your power day. Schedule important tasks then.`);
    }
    
    if (Object.keys(moodCounts).length > 0 && dominantMood === "bad" || dominantMood === "terrible") {
      tips.push("Your journal shows lower moods recently. Consider adding self-care habits.");
    }
    
    return tips.slice(0, 3);
  }, [progressScore, trend, totalFocus, range, mostMissed, bestDay, moodCounts, dominantMood]);

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-display-sm">Insights</h1>
          <p className="text-muted-foreground mt-1">AI-powered progress analysis</p>
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

      {/* Progress Score */}
      <Card className="glass border-primary/20 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center shadow-glow">
              <Brain className="w-8 h-8 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{progressScore}</span>
                <span className="text-muted-foreground">/100</span>
              </div>
              <p className="text-sm text-muted-foreground">Productivity Score</p>
            </div>
            {trend !== 0 && (
              <div className={cn(
                "px-3 py-1 rounded-full text-sm font-medium",
                trend > 0 ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
              )}>
                {trend > 0 ? "+" : ""}{trend}%
              </div>
            )}
          </div>
          <Progress value={progressScore} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            Based on habits, focus time, streaks, and journaling
          </p>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
            <p className="text-xs text-muted-foreground">
              {format(selectedWeekStart, "MMM d")}–{format(selectedWeekEnd, "MMM d")}
            </p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4">
            <Zap className="w-5 h-5 text-warning mb-2" />
            <p className="text-2xl font-bold">{totalSessions}</p>
            <p className="text-xs text-muted-foreground">Focus sessions</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4">
            <Calendar className="w-5 h-5 text-success mb-2" />
            <p className="text-2xl font-bold">{new Set(journalEntries.filter(e => days.includes(e.date)).map(e => e.date)).size}</p>
            <p className="text-xs text-muted-foreground">Journal entries</p>
          </CardContent>
        </Card>
      </div>

      {/* Week Selector */}
      <Card className="glass border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Weekly Overview
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setWeekOffset(weekOffset + 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium min-w-[140px] text-center">
                {format(selectedWeekStart, "MMM d")} - {format(selectedWeekEnd, "MMM d")}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
                disabled={weekOffset === 0}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Week Stats Summary */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Week Completion</p>
              <p className="text-xl font-bold">
                {weekHabitCompletions.filter(d => d.total > 0).length > 0
                  ? Math.round(
                      weekHabitCompletions
                        .filter(d => d.total > 0)
                        .reduce((acc, d) => acc + d.rate, 0) /
                        weekHabitCompletions.filter(d => d.total > 0).length
                    )
                  : 0}%
              </p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Week Focus</p>
              <p className="text-xl font-bold">
                {Math.floor(weekFocusMinutes.reduce((acc, d) => acc + d.minutes, 0) / 60)}h{" "}
                {weekFocusMinutes.reduce((acc, d) => acc + d.minutes, 0) % 60}m
              </p>
            </div>
          </div>

          {/* Week Habit Completion Chart */}
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">Habit Completion</p>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekHabitCompletions}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number, name: string, props: { payload?: { completed?: number; total?: number } }) => [
                      `${value}% (${props.payload?.completed ?? 0}/${props.payload?.total ?? 0})`,
                      "Completion",
                    ]}
                  />
                  <Bar
                    dataKey="rate"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    opacity={0.8}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Week Focus Minutes Chart */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Focus Minutes</p>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weekFocusMinutes}>
                  <defs>
                    <linearGradient id="weekFocusGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`${value} min`, "Focus"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="minutes"
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                    fill="url(#weekFocusGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Habit Completion Chart */}
      <Card className="glass">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Habit Completion
          </h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={habitCompletions.slice(-7)}>
                <defs>
                  <linearGradient id="completionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                  formatter={(value: number) => [`${value}%`, "Completion"]}
                />
                <Area 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fill="url(#completionGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
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
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={focusMinutes.slice(-7)}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                  formatter={(value: number) => [`${value} min`, "Focus"]}
                />
                <Bar 
                  dataKey="minutes" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                  opacity={0.8}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Insights Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="glass">
          <CardContent className="p-4">
            <Trophy className="w-4 h-4 text-success mb-2" />
            <p className="text-sm font-medium">Best Day</p>
            <p className="text-xs text-muted-foreground">{dayLabels[bestDay.day]} ({Math.round(bestDay.avgRate)}%)</p>
          </CardContent>
        </Card>
        
        {mostConsistent && (
          <Card className="glass">
            <CardContent className="p-4">
              <Target className="w-4 h-4 text-primary mb-2" />
              <p className="text-sm font-medium truncate">{mostConsistent.habit.name}</p>
              <p className="text-xs text-muted-foreground">{mostConsistent.completionRate}% • {mostConsistent.streak.current} day streak</p>
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

      {/* AI Tips */}
      {tips.length > 0 && (
        <Card className="glass border-primary/20">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              AI Insights
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
