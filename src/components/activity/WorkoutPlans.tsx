import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Dumbbell, 
  Play, 
  Pause, 
  SkipForward, 
  Check, 
  Timer, 
  Flame,
  Zap,
  Heart,
  Target,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Exercise {
  name: string;
  duration: number | null;
  reps: number | null;
  rest: number;
}

interface WorkoutPlan {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  duration_minutes: number;
  category: string;
  exercises: Exercise[];
}

const categoryIcons: Record<string, React.ElementType> = {
  cardio: Zap,
  strength: Dumbbell,
  hiit: Flame,
  yoga: Heart,
  general: Target,
};

const difficultyColors: Record<string, string> = {
  beginner: "bg-green-500/20 text-green-500",
  intermediate: "bg-yellow-500/20 text-yellow-500",
  advanced: "bg-red-500/20 text-red-500",
};

export function WorkoutPlans() {
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("workout_plans")
        .select("*")
        .eq("is_public", true);

      if (error) throw error;

      const formattedPlans = (data || []).map((plan) => ({
        ...plan,
        exercises: (plan.exercises as unknown as Exercise[]) || [],
      }));

      setPlans(formattedPlans);
    } catch (error) {
      console.error("Error fetching workout plans:", error);
    }
    setIsLoading(false);
  };

  const startWorkout = (plan: WorkoutPlan) => {
    setSelectedPlan(plan);
    setIsWorkoutActive(true);
    setCurrentExerciseIndex(0);
    setIsResting(false);
    setIsPaused(false);
    
    const firstExercise = plan.exercises[0];
    if (firstExercise.duration) {
      setTimeRemaining(firstExercise.duration);
    } else {
      setTimeRemaining(0);
    }
  };

  const completeWorkout = useCallback(async () => {
    if (!selectedPlan) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("workout_sessions").insert({
          user_id: user.id,
          plan_id: selectedPlan.id,
          completed_at: new Date().toISOString(),
          exercises_completed: selectedPlan.exercises.length,
          total_exercises: selectedPlan.exercises.length,
          status: "completed",
        });
      }
    } catch (error) {
      console.error("Error saving workout session:", error);
    }

    toast.success("Workout completed! Great job!");
    setIsWorkoutActive(false);
    setSelectedPlan(null);
  }, [selectedPlan]);

  const nextExercise = useCallback(() => {
    if (!selectedPlan) return;

    if (isResting) {
      // Move to next exercise
      const nextIndex = currentExerciseIndex + 1;
      if (nextIndex >= selectedPlan.exercises.length) {
        completeWorkout();
        return;
      }

      setCurrentExerciseIndex(nextIndex);
      setIsResting(false);
      const nextEx = selectedPlan.exercises[nextIndex];
      setTimeRemaining(nextEx.duration || 0);
    } else {
      // Start rest period
      const currentEx = selectedPlan.exercises[currentExerciseIndex];
      if (currentEx.rest > 0) {
        setIsResting(true);
        setTimeRemaining(currentEx.rest);
      } else {
        // No rest, move to next exercise
        const nextIndex = currentExerciseIndex + 1;
        if (nextIndex >= selectedPlan.exercises.length) {
          completeWorkout();
          return;
        }
        setCurrentExerciseIndex(nextIndex);
        const nextEx = selectedPlan.exercises[nextIndex];
        setTimeRemaining(nextEx.duration || 0);
      }
    }
  }, [selectedPlan, currentExerciseIndex, isResting, completeWorkout]);

  // Timer effect
  useEffect(() => {
    if (!isWorkoutActive || isPaused || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          nextExercise();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isWorkoutActive, isPaused, timeRemaining, nextExercise]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const currentExercise = selectedPlan?.exercises[currentExerciseIndex];
  const progress = selectedPlan
    ? ((currentExerciseIndex + (isResting ? 0.5 : 0)) / selectedPlan.exercises.length) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Workout Plans Grid */}
      <div className="grid gap-4">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Dumbbell className="w-8 h-8 mx-auto mb-2 animate-pulse" />
            <p>Loading workout plans...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Dumbbell className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No workout plans available</p>
          </div>
        ) : (
          plans.map((plan) => {
            const Icon = categoryIcons[plan.category] || Dumbbell;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="glass hover:border-primary/30 transition-all cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{plan.title}</h3>
                          <Badge
                            variant="secondary"
                            className={difficultyColors[plan.difficulty]}
                          >
                            {plan.difficulty}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {plan.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Timer className="w-3 h-3" />
                            {plan.duration_minutes} min
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {plan.exercises.length} exercises
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => startWorkout(plan)}
                        className="flex-shrink-0"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Start
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Active Workout Dialog */}
      <Dialog open={isWorkoutActive} onOpenChange={(open) => !open && setIsWorkoutActive(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedPlan?.title}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsWorkoutActive(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {currentExercise && (
            <div className="space-y-6 py-4">
              {/* Progress */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>
                    Exercise {currentExerciseIndex + 1} of{" "}
                    {selectedPlan?.exercises.length}
                  </span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Current Exercise */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${currentExerciseIndex}-${isResting}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="text-center py-8"
                >
                  {isResting ? (
                    <>
                      <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                        <Timer className="w-10 h-10 text-muted-foreground" />
                      </div>
                      <h2 className="text-xl font-bold text-muted-foreground">
                        Rest
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Get ready for the next exercise
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                        <Dumbbell className="w-10 h-10 text-primary" />
                      </div>
                      <h2 className="text-2xl font-bold">{currentExercise.name}</h2>
                      {currentExercise.reps ? (
                        <p className="text-lg text-primary mt-2">
                          {currentExercise.reps} reps
                        </p>
                      ) : (
                        <p className="text-lg text-muted-foreground mt-2">
                          Hold for time
                        </p>
                      )}
                    </>
                  )}

                  {/* Timer Display */}
                  {timeRemaining > 0 && (
                    <div className="mt-6">
                      <p className="text-5xl font-mono font-bold">
                        {formatTime(timeRemaining)}
                      </p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Controls */}
              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setIsPaused(!isPaused)}
                >
                  {isPaused ? (
                    <Play className="w-5 h-5" />
                  ) : (
                    <Pause className="w-5 h-5" />
                  )}
                </Button>

                {currentExercise.reps && !isResting && (
                  <Button size="lg" onClick={nextExercise}>
                    <Check className="w-5 h-5 mr-2" />
                    Done
                  </Button>
                )}

                <Button variant="outline" size="lg" onClick={nextExercise}>
                  <SkipForward className="w-5 h-5" />
                </Button>
              </div>

              {/* Next Up */}
              {!isResting &&
                currentExerciseIndex < (selectedPlan?.exercises.length || 0) - 1 && (
                  <div className="text-center text-sm text-muted-foreground">
                    <p>
                      Next:{" "}
                      {selectedPlan?.exercises[currentExerciseIndex + 1]?.name}
                    </p>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
