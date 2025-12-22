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
  X,
  Info,
  Activity,
  Smartphone,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useMotionDetection } from "@/hooks/useMotionDetection";
import { cn } from "@/lib/utils";

interface Exercise {
  name: string;
  duration: number | null;
  reps: number | null;
  rest: number;
  instructions?: string;
  imageUrl?: string;
  targetMuscles?: string[];
}

interface WorkoutPlan {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  duration_minutes: number;
  category: string;
  exercises: Exercise[];
  image_url?: string;
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

// Default exercise library with images and instructions
const defaultExercises: Record<string, Partial<Exercise>> = {
  "jumping jacks": {
    instructions: "Stand with feet together, jump while spreading legs and raising arms overhead, return to start position.",
    imageUrl: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=300&fit=crop",
    targetMuscles: ["full body", "cardio"],
  },
  "push-ups": {
    instructions: "Place hands shoulder-width apart, lower chest to floor keeping body straight, push back up. Keep core engaged.",
    imageUrl: "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=400&h=300&fit=crop",
    targetMuscles: ["chest", "triceps", "shoulders"],
  },
  "squats": {
    instructions: "Stand with feet shoulder-width apart, lower hips back and down as if sitting in a chair, keep chest up and knees behind toes.",
    imageUrl: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&h=300&fit=crop",
    targetMuscles: ["quads", "glutes", "hamstrings"],
  },
  "plank": {
    instructions: "Rest on forearms and toes, keep body in straight line from head to heels, engage core and hold position.",
    imageUrl: "https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=400&h=300&fit=crop",
    targetMuscles: ["core", "shoulders"],
  },
  "lunges": {
    instructions: "Step forward with one leg, lower back knee toward ground, front knee stays behind toes, push back to start.",
    imageUrl: "https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=400&h=300&fit=crop",
    targetMuscles: ["quads", "glutes", "hamstrings"],
  },
  "burpees": {
    instructions: "Squat down, kick feet back to plank, do a push-up, jump feet forward, explosively jump up with arms overhead.",
    imageUrl: "https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=400&h=300&fit=crop",
    targetMuscles: ["full body", "cardio"],
  },
  "mountain climbers": {
    instructions: "Start in plank position, alternately drive knees toward chest rapidly while keeping hips low.",
    imageUrl: "https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=400&h=300&fit=crop",
    targetMuscles: ["core", "cardio", "shoulders"],
  },
  "high knees": {
    instructions: "Run in place, bringing knees up to hip level alternately, pump arms for momentum.",
    imageUrl: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=400&h=300&fit=crop",
    targetMuscles: ["legs", "cardio"],
  },
  "crunches": {
    instructions: "Lie on back with knees bent, hands behind head, curl upper body toward knees, lower slowly.",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop",
    targetMuscles: ["abs", "core"],
  },
  "bicep curls": {
    instructions: "Hold weights at sides, curl toward shoulders keeping elbows stationary, lower slowly.",
    imageUrl: "https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=400&h=300&fit=crop",
    targetMuscles: ["biceps", "forearms"],
  },
};

function getExerciseDetails(exercise: Exercise): Exercise {
  const key = exercise.name.toLowerCase();
  const defaults = defaultExercises[key];
  
  return {
    ...exercise,
    instructions: exercise.instructions || defaults?.instructions || "Perform the exercise with proper form.",
    imageUrl: exercise.imageUrl || defaults?.imageUrl,
    targetMuscles: exercise.targetMuscles || defaults?.targetMuscles || [],
  };
}

export function WorkoutPlans() {
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showExerciseInfo, setShowExerciseInfo] = useState(false);

  const {
    isSupported: motionSupported,
    isTracking: motionTracking,
    repCount,
    intensity,
    startTracking: startMotion,
    stopTracking: stopMotion,
    resetCount,
  } = useMotionDetection();

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
        exercises: ((plan.exercises as unknown as Exercise[]) || []).map(getExerciseDetails),
      }));

      // Add default workouts if none exist
      if (formattedPlans.length === 0) {
        const defaultPlans: WorkoutPlan[] = [
          {
            id: "default-1",
            title: "Quick Cardio Blast",
            description: "15-minute high-intensity cardio workout",
            difficulty: "intermediate",
            duration_minutes: 15,
            category: "cardio",
            exercises: [
              { name: "Jumping Jacks", duration: 30, reps: null, rest: 10 },
              { name: "High Knees", duration: 30, reps: null, rest: 10 },
              { name: "Burpees", duration: null, reps: 10, rest: 15 },
              { name: "Mountain Climbers", duration: 30, reps: null, rest: 10 },
            ].map(getExerciseDetails),
          },
          {
            id: "default-2",
            title: "Strength Builder",
            description: "Full body strength training",
            difficulty: "beginner",
            duration_minutes: 20,
            category: "strength",
            exercises: [
              { name: "Push-ups", duration: null, reps: 15, rest: 30 },
              { name: "Squats", duration: null, reps: 20, rest: 30 },
              { name: "Lunges", duration: null, reps: 12, rest: 30 },
              { name: "Plank", duration: 45, reps: null, rest: 20 },
            ].map(getExerciseDetails),
          }
        ];
        setPlans(defaultPlans);
      } else {
        setPlans(formattedPlans);
      }
    } catch (error) {
      console.error("Error fetching workout plans:", error);
    }
    setIsLoading(false);
  };

  const startWorkout = async (plan: WorkoutPlan) => {
    setSelectedPlan(plan);
    setIsWorkoutActive(true);
    setCurrentExerciseIndex(0);
    setIsResting(false);
    setIsPaused(false);
    resetCount();
    
    const firstExercise = plan.exercises[0];
    if (firstExercise.duration) {
      setTimeRemaining(firstExercise.duration);
    } else {
      setTimeRemaining(0);
    }

    // Start motion detection for rep-based exercises
    if (motionSupported && firstExercise.reps) {
      const started = await startMotion();
      if (started) {
        toast.success("Motion detection active!", {
          description: "Move your phone with your exercises",
          icon: <Smartphone className="w-4 h-4" />,
        });
      }
    }
  };

  const completeWorkout = useCallback(async () => {
    if (!selectedPlan) return;
    
    stopMotion();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("workout_sessions").insert({
          user_id: user.id,
          plan_id: selectedPlan.id.startsWith("default-") ? null : selectedPlan.id,
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
  }, [selectedPlan, stopMotion]);

  const nextExercise = useCallback(async () => {
    if (!selectedPlan) return;

    if (isResting) {
      const nextIndex = currentExerciseIndex + 1;
      if (nextIndex >= selectedPlan.exercises.length) {
        completeWorkout();
        return;
      }

      setCurrentExerciseIndex(nextIndex);
      setIsResting(false);
      resetCount();
      const nextEx = selectedPlan.exercises[nextIndex];
      setTimeRemaining(nextEx.duration || 0);

      // Start motion tracking for rep exercises
      if (motionSupported && nextEx.reps && !motionTracking) {
        await startMotion();
      }
    } else {
      const currentEx = selectedPlan.exercises[currentExerciseIndex];
      if (currentEx.rest > 0) {
        setIsResting(true);
        setTimeRemaining(currentEx.rest);
        stopMotion();
      } else {
        const nextIndex = currentExerciseIndex + 1;
        if (nextIndex >= selectedPlan.exercises.length) {
          completeWorkout();
          return;
        }
        setCurrentExerciseIndex(nextIndex);
        resetCount();
        const nextEx = selectedPlan.exercises[nextIndex];
        setTimeRemaining(nextEx.duration || 0);
      }
    }
  }, [selectedPlan, currentExerciseIndex, isResting, completeWorkout, motionSupported, motionTracking, startMotion, stopMotion, resetCount]);

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
                <Card className="glass hover:border-primary/30 transition-all cursor-pointer border-none">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-7 h-7 text-primary" />
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
                          {motionSupported && (
                            <span className="flex items-center gap-1 text-primary">
                              <Activity className="w-3 h-3" />
                              Motion
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => startWorkout(plan)}
                        className="flex-shrink-0 rounded-xl"
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
      <Dialog open={isWorkoutActive} onOpenChange={(open) => {
        if (!open) {
          stopMotion();
          setIsWorkoutActive(false);
        }
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedPlan?.title}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  stopMotion();
                  setIsWorkoutActive(false);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {currentExercise && (
            <div className="space-y-4 py-2">
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
                  className="text-center"
                >
                  {isResting ? (
                    <div className="py-6">
                      <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                        <Timer className="w-10 h-10 text-muted-foreground" />
                      </div>
                      <h2 className="text-xl font-bold text-muted-foreground">
                        Rest
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Get ready for: {selectedPlan?.exercises[currentExerciseIndex + 1]?.name}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Exercise Image */}
                      {currentExercise.imageUrl && (
                        <div className="relative rounded-2xl overflow-hidden h-40">
                          <img
                            src={currentExercise.imageUrl}
                            alt={currentExercise.name}
                            className="w-full h-full object-cover"
                          />
                          <Button
                            variant="secondary"
                            size="sm"
                            className="absolute top-2 right-2 rounded-full"
                            onClick={() => setShowExerciseInfo(!showExerciseInfo)}
                          >
                            <Info className="w-4 h-4" />
                          </Button>
                        </div>
                      )}

                      <h2 className="text-2xl font-bold">{currentExercise.name}</h2>

                      {/* Target Muscles */}
                      {currentExercise.targetMuscles && currentExercise.targetMuscles.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-2">
                          {currentExercise.targetMuscles.map((muscle) => (
                            <Badge key={muscle} variant="secondary" className="text-xs">
                              {muscle}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Instructions (collapsible) */}
                      <AnimatePresence>
                        {showExerciseInfo && currentExercise.instructions && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <p className="text-sm text-muted-foreground bg-secondary/50 rounded-xl p-3 text-left">
                              {currentExercise.instructions}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Rep Counter with Motion Detection */}
                      {currentExercise.reps && (
                        <div className="space-y-2">
                          <p className="text-lg text-primary">
                            {repCount} / {currentExercise.reps} reps
                          </p>
                          {motionTracking && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                <Activity className="w-3 h-3 animate-pulse text-primary" />
                                Motion detection active
                              </div>
                              <Progress value={intensity} className="h-1" />
                            </div>
                          )}
                          {!motionTracking && motionSupported && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={startMotion}
                              className="gap-2"
                            >
                              <Smartphone className="w-4 h-4" />
                              Enable motion tracking
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Timer Display */}
                      {timeRemaining > 0 && (
                        <p className="text-5xl font-mono font-bold mt-4">
                          {formatTime(timeRemaining)}
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Controls */}
              <div className="flex justify-center gap-3 pt-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setIsPaused(!isPaused)}
                  className="rounded-xl"
                >
                  {isPaused ? (
                    <Play className="w-5 h-5" />
                  ) : (
                    <Pause className="w-5 h-5" />
                  )}
                </Button>

                {currentExercise.reps && !isResting && (
                  <Button 
                    size="lg" 
                    onClick={nextExercise}
                    className="rounded-xl"
                    disabled={repCount < (currentExercise.reps || 0)}
                  >
                    <Check className="w-5 h-5 mr-2" />
                    Done ({repCount}/{currentExercise.reps})
                  </Button>
                )}

                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={nextExercise}
                  className="rounded-xl"
                >
                  <SkipForward className="w-5 h-5" />
                </Button>
              </div>

              {/* Next Up */}
              {!isResting &&
                currentExerciseIndex < (selectedPlan?.exercises.length || 0) - 1 && (
                  <div className="text-center text-sm text-muted-foreground pt-2">
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
