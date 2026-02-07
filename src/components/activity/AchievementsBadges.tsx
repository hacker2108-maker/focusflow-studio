import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "@/store/activityStore";
import { motion } from "framer-motion";
import { Trophy, Flame, Footprints, Route, Timer, Zap, Target, Medal, Star, Crown } from "lucide-react";

interface AchievementsBadgesProps {
  activities: Activity[];
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  requirement: (activities: Activity[]) => boolean;
  progress: (activities: Activity[]) => { current: number; target: number };
}

const achievements: Achievement[] = [
  {
    id: "first_steps",
    name: "First Steps",
    description: "Complete your first activity",
    icon: Footprints,
    color: "#10B981",
    bgColor: "#10B98120",
    requirement: (acts) => acts.length >= 1,
    progress: (acts) => ({ current: acts.length, target: 1 }),
  },
  {
    id: "distance_5k",
    name: "5K Runner",
    description: "Run a total of 5 kilometers",
    icon: Route,
    color: "#3B82F6",
    bgColor: "#3B82F620",
    requirement: (acts) => acts.filter(a => a.type === "run").reduce((s, a) => s + a.distanceKm, 0) >= 5,
    progress: (acts) => ({ 
      current: Math.round(acts.filter(a => a.type === "run").reduce((s, a) => s + a.distanceKm, 0) * 10) / 10, 
      target: 5 
    }),
  },
  {
    id: "distance_10k",
    name: "10K Champion",
    description: "Run a total of 10 kilometers",
    icon: Medal,
    color: "#F59E0B",
    bgColor: "#F59E0B20",
    requirement: (acts) => acts.filter(a => a.type === "run").reduce((s, a) => s + a.distanceKm, 0) >= 10,
    progress: (acts) => ({ 
      current: Math.round(acts.filter(a => a.type === "run").reduce((s, a) => s + a.distanceKm, 0) * 10) / 10, 
      target: 10 
    }),
  },
  {
    id: "calorie_burner",
    name: "Calorie Crusher",
    description: "Burn 1,000 calories total",
    icon: Flame,
    color: "#EF4444",
    bgColor: "#EF444420",
    requirement: (acts) => acts.reduce((s, a) => s + (a.caloriesBurned || 0), 0) >= 1000,
    progress: (acts) => ({ 
      current: acts.reduce((s, a) => s + (a.caloriesBurned || 0), 0), 
      target: 1000 
    }),
  },
  {
    id: "super_burner",
    name: "Super Burner",
    description: "Burn 5,000 calories total",
    icon: Zap,
    color: "#F97316",
    bgColor: "#F9731620",
    requirement: (acts) => acts.reduce((s, a) => s + (a.caloriesBurned || 0), 0) >= 5000,
    progress: (acts) => ({ 
      current: acts.reduce((s, a) => s + (a.caloriesBurned || 0), 0), 
      target: 5000 
    }),
  },
  {
    id: "marathon",
    name: "Marathon Master",
    description: "Complete 42 km total distance",
    icon: Crown,
    color: "#8B5CF6",
    bgColor: "#8B5CF620",
    requirement: (acts) => acts.reduce((s, a) => s + a.distanceKm, 0) >= 42,
    progress: (acts) => ({ 
      current: Math.round(acts.reduce((s, a) => s + a.distanceKm, 0) * 10) / 10, 
      target: 42 
    }),
  },
  {
    id: "time_warrior",
    name: "Time Warrior",
    description: "Exercise for 60 minutes total",
    icon: Timer,
    color: "#06B6D4",
    bgColor: "#06B6D420",
    requirement: (acts) => acts.reduce((s, a) => s + a.durationMinutes, 0) >= 60,
    progress: (acts) => ({ 
      current: Math.round(acts.reduce((s, a) => s + a.durationMinutes, 0)), 
      target: 60 
    }),
  },
  {
    id: "consistency",
    name: "Consistency King",
    description: "Complete 7 activities",
    icon: Target,
    color: "#EC4899",
    bgColor: "#EC489920",
    requirement: (acts) => acts.length >= 7,
    progress: (acts) => ({ current: acts.length, target: 7 }),
  },
  {
    id: "variety",
    name: "All-Rounder",
    description: "Try all activity types",
    icon: Star,
    color: "#FBBF24",
    bgColor: "#FBBF2420",
    requirement: (acts) => {
      const types = new Set(acts.map(a => a.type));
      return types.size >= 4;
    },
    progress: (acts) => ({ 
      current: new Set(acts.map(a => a.type)).size, 
      target: 4 
    }),
  },
];

export function AchievementsBadges({ activities }: AchievementsBadgesProps) {
  const achievementStatus = useMemo(() => {
    return achievements.map((achievement) => ({
      ...achievement,
      unlocked: achievement.requirement(activities),
      progress: achievement.progress(activities),
    }));
  }, [activities]);

  const unlockedCount = achievementStatus.filter((a) => a.unlocked).length;

  return (
    <Card className="glass hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-warning" />
            Achievements
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {unlockedCount}/{achievements.length}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {achievementStatus.map((achievement, index) => {
            const Icon = achievement.icon;
            const progressPercent = Math.min(
              (achievement.progress.current / achievement.progress.target) * 100,
              100
            );

            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`relative p-3 rounded-xl text-center transition-all ${
                  achievement.unlocked
                    ? "bg-gradient-to-br from-warning/20 to-warning/5 border border-warning/30"
                    : "bg-secondary/30 opacity-60"
                }`}
              >
                {/* Progress ring */}
                {!achievement.unlocked && (
                  <div className="absolute inset-0 rounded-xl overflow-hidden">
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-primary/10 transition-all"
                      style={{ height: `${progressPercent}%` }}
                    />
                  </div>
                )}

                <div
                  className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center relative"
                  style={{ backgroundColor: achievement.unlocked ? achievement.bgColor : "hsl(var(--muted))" }}
                >
                  <Icon
                    className="w-5 h-5"
                    style={{ color: achievement.unlocked ? achievement.color : "hsl(var(--muted-foreground))" }}
                  />
                  {achievement.unlocked && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-warning rounded-full flex items-center justify-center"
                    >
                      <span className="text-[8px]">✓</span>
                    </motion.div>
                  )}
                </div>

                <p className="text-xs font-medium line-clamp-1">{achievement.name}</p>
                
                {!achievement.unlocked && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {achievement.progress.current}/{achievement.progress.target}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
