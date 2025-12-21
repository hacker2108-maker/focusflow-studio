import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, RotateCcw, Coffee, Brain, CheckCircle2, Volume2 } from "lucide-react";
import { useFocusStore } from "@/store/focusStore";
import { useHabitStore } from "@/store/habitStore";
import { formatTime, getToday, isHabitDueToday } from "@/lib/utils";
import { alarmSound } from "@/lib/audio";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function Focus() {
  const { timer, preset, startTimer, pauseTimer, resumeTimer, resetTimer, completeSession, getTimeRemaining } = useFocusStore();
  const { habits, logs, logHabit } = useHabitStore();
  
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining());
  const [mode, setMode] = useState<"pomodoro" | "deepFocus">("pomodoro");
  const [task, setTask] = useState("");
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const today = getToday();

  const todayHabits = habits.filter(h => !h.archived && isHabitDueToday(h));
  const incompleteHabits = todayHabits.filter(h => 
    !logs.some(l => l.habitId === h.id && l.date === today && l.status === "done")
  );

  useEffect(() => {
    if (!timer.isRunning || timer.isPaused) {
      setTimeRemaining(getTimeRemaining());
      return;
    }

    const interval = setInterval(() => {
      const remaining = getTimeRemaining();
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        // Show completion dialog for work sessions
        if (timer.phase === "work") {
          setShowCompleteDialog(true);
          // Play alarm sound
          alarmSound.playAlarm();
          // Show browser notification (if permitted)
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Focus session complete!", {
              body: timer.task || "Great work! Time for a break.",
              icon: "/icon.svg"
            });
          }
        } else {
          // Play softer sound for break end
          alarmSound.playBreakEnd();
          toast.success("Break complete! Ready for the next session?");
          completeSession();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [timer.isRunning, timer.isPaused, timer.startTimestamp, timer.phase]);

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const progress = timer.isRunning 
    ? (1 - timeRemaining / timer.totalDuration) * 100 
    : 0;

  const handleStart = () => {
    const duration = mode === "pomodoro" ? preset.workMinutes * 60 : 60 * 60;
    startTimer(mode, task.trim() || undefined, duration);
    toast.success(`${mode === "pomodoro" ? "Pomodoro" : "Deep Focus"} started`);
  };

  const handleComplete = (markHabits: string[] = []) => {
    completeSession();
    setShowCompleteDialog(false);
    
    // Mark selected habits as done
    markHabits.forEach(habitId => {
      logHabit(habitId, "done");
    });

    if (timer.mode === "pomodoro" && timer.phase === "work") {
      toast.success("Great work! Taking a break now.");
    }
  };

  const handleReset = () => {
    resetTimer();
    setTask("");
    toast.info("Timer reset");
  };

  const phaseLabel = timer.phase === "work" ? "Focus" : timer.phase === "break" ? "Break" : "Long Break";
  const phaseColor = timer.phase === "work" ? "text-primary" : "text-success";

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-display-sm">Focus</h1>
        <p className="text-muted-foreground mt-1">Deep work, distraction-free</p>
      </header>

      {!timer.isRunning && (
        <>
          <Tabs value={mode} onValueChange={v => setMode(v as any)}>
            <TabsList className="glass w-full">
              <TabsTrigger value="pomodoro" className="flex-1">
                <Coffee className="w-4 h-4 mr-2" />
                Pomodoro
              </TabsTrigger>
              <TabsTrigger value="deepFocus" className="flex-1">
                <Brain className="w-4 h-4 mr-2" />
                Deep Focus
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div>
            <Input
              value={task}
              onChange={e => setTask(e.target.value)}
              placeholder="What are you working on? (optional)"
              className="glass"
            />
          </div>
        </>
      )}

      <Card className="glass overflow-hidden">
        <CardContent className="p-8 flex flex-col items-center">
          {/* Timer Circle */}
          <div className="relative w-64 h-64 mb-8">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="128"
                cy="128"
                r="120"
                fill="none"
                stroke="hsl(var(--secondary))"
                strokeWidth="8"
              />
              <motion.circle
                cx="128"
                cy="128"
                r="120"
                fill="none"
                stroke={timer.phase === "work" ? "hsl(var(--primary))" : "hsl(var(--success))"}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 120}
                strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
                className={timer.phase === "work" ? "drop-shadow-[0_0_10px_hsl(var(--primary))]" : "drop-shadow-[0_0_10px_hsl(var(--success))]"}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold font-mono tracking-tight">
                {formatTime(Math.ceil(timeRemaining))}
              </span>
              {timer.isRunning && (
                <span className={`text-sm mt-2 ${phaseColor}`}>{phaseLabel}</span>
              )}
              {timer.task && timer.isRunning && (
                <span className="text-xs text-muted-foreground mt-1 max-w-[180px] truncate">
                  {timer.task}
                </span>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            {!timer.isRunning ? (
              <Button
                size="lg"
                className="gradient-primary text-primary-foreground shadow-glow px-8"
                onClick={handleStart}
              >
                <Play className="w-5 h-5 mr-2" />
                Start {mode === "pomodoro" ? `${preset.workMinutes}m` : "60m"}
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={timer.isPaused ? resumeTimer : pauseTimer}
                >
                  {timer.isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleReset}
                >
                  <RotateCcw className="w-5 h-5" />
                </Button>
              </>
            )}
          </div>

          {timer.isRunning && timer.mode === "pomodoro" && (
            <p className="text-sm text-muted-foreground mt-6">
              Session {timer.currentSession} of {preset.sessionsBeforeLongBreak}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Preset cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="glass">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{preset.workMinutes}m</p>
            <p className="text-xs text-muted-foreground">Work</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{preset.breakMinutes}m</p>
            <p className="text-xs text-muted-foreground">Break</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{preset.longBreakMinutes}m</p>
            <p className="text-xs text-muted-foreground">Long Break</p>
          </CardContent>
        </Card>
      </div>

      {/* Session Complete Dialog */}
      <SessionCompleteDialog 
        open={showCompleteDialog}
        onComplete={handleComplete}
        incompleteHabits={incompleteHabits}
        task={timer.task}
      />
    </div>
  );
}

function SessionCompleteDialog({ 
  open, 
  onComplete, 
  incompleteHabits,
  task 
}: { 
  open: boolean; 
  onComplete: (habits: string[]) => void; 
  incompleteHabits: any[];
  task?: string;
}) {
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);

  const toggleHabit = (id: string) => {
    setSelectedHabits(prev => 
      prev.includes(id) ? prev.filter(h => h !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open={open}>
      <DialogContent className="glass-strong">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            Session Complete!
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-2">
          {task && (
            <p className="text-sm text-muted-foreground">
              Great work on: <span className="text-foreground">{task}</span>
            </p>
          )}

          {incompleteHabits.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Mark habits as complete?</p>
              <div className="space-y-2">
                {incompleteHabits.slice(0, 4).map(habit => (
                  <button
                    key={habit.id}
                    onClick={() => toggleHabit(habit.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      selectedHabits.includes(habit.id) 
                        ? "bg-success/10 border border-success/30" 
                        : "bg-secondary hover:bg-secondary/80"
                    }`}
                  >
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: habit.color }} 
                    />
                    <span className="text-sm flex-1 text-left">{habit.name}</span>
                    {selectedHabits.includes(habit.id) && (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button 
            onClick={() => onComplete(selectedHabits)} 
            className="w-full gradient-primary text-primary-foreground"
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}