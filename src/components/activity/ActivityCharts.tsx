import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Activity } from "@/store/activityStore";
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, subWeeks, startOfMonth, endOfMonth, eachWeekOfInterval } from "date-fns";

interface ActivityChartsProps {
  activities: Activity[];
}

export function ActivityCharts({ activities }: ActivityChartsProps) {
  const [period, setPeriod] = useState<"week" | "month">("week");

  const weeklyData = useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayActivities = activities.filter((a) => a.date === dayStr);
      const distance = dayActivities.reduce((sum, a) => sum + a.distanceKm, 0);
      const calories = dayActivities.reduce((sum, a) => sum + (a.caloriesBurned || 0), 0);
      const duration = dayActivities.reduce((sum, a) => sum + a.durationMinutes, 0);

      return {
        name: format(day, "EEE"),
        distance: Math.round(distance * 10) / 10,
        calories,
        duration: Math.round(duration),
      };
    });
  }, [activities]);

  const monthlyData = useMemo(() => {
    const today = new Date();
    const weeks = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(today, i), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(subWeeks(today, i), { weekStartsOn: 1 });
      
      const weekActivities = activities.filter((a) => {
        const actDate = new Date(a.date);
        return actDate >= weekStart && actDate <= weekEnd;
      });

      const distance = weekActivities.reduce((sum, a) => sum + a.distanceKm, 0);
      const calories = weekActivities.reduce((sum, a) => sum + (a.caloriesBurned || 0), 0);
      const duration = weekActivities.reduce((sum, a) => sum + a.durationMinutes, 0);

      weeks.push({
        name: `Week ${4 - i}`,
        distance: Math.round(distance * 10) / 10,
        calories,
        duration: Math.round(duration),
      });
    }
    return weeks;
  }, [activities]);

  const data = period === "week" ? weeklyData : monthlyData;
  const totalDistance = data.reduce((sum, d) => sum + d.distance, 0);
  const totalCalories = data.reduce((sum, d) => sum + d.calories, 0);

  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">Activity Trends</CardTitle>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as "week" | "month")}>
          <TabsList className="h-8">
            <TabsTrigger value="week" className="text-xs px-3">Week</TabsTrigger>
            <TabsTrigger value="month" className="text-xs px-3">Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-center">
            <p className="text-2xl font-bold text-primary">{totalDistance.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">km this {period}</p>
          </div>
          <div className="p-3 rounded-xl bg-destructive/10 text-center">
            <p className="text-2xl font-bold text-destructive">{totalCalories.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">calories burned</p>
          </div>
        </div>

        {/* Distance Chart */}
        <div>
          <p className="text-sm font-medium mb-2">Distance (km)</p>
          <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`${value} km`, "Distance"]}
                />
                <Bar 
                  dataKey="distance" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Calories Chart */}
        <div>
          <p className="text-sm font-medium mb-2">Calories Burned</p>
          <div className="h-[100px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`${value} cal`, "Calories"]}
                />
                <Area 
                  type="monotone" 
                  dataKey="calories" 
                  stroke="hsl(var(--destructive))" 
                  fill="hsl(var(--destructive) / 0.2)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
