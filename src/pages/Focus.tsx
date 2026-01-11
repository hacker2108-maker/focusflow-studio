import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Play, Pause, RotateCcw, Coffee, Brain, CheckCircle2, Settings, Volume2, VolumeX, Minus, Plus, Bell } from "lucide-react";
import { useFocusStore } from "@/store/focusStore";
import { useHabitStore } from "@/store/habitStore";
import { formatTime, getToday, isHabitDueToday } from "@/lib/utils";
import { alarmSound, AlarmSoundType } from "@/lib/audio";
import { requestNotificationPermission, scheduleNotification } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function Focus() {
  const { timer, preset, startTimer, pauseTimer, resumeTimer, resetTimer, completeSession, getTimeRemaining, updatePreset } = useFocusStore();
  const { habits, logs, logHabit } = useHabitStore();
  
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining());
  const [mode, setMode] = useState<"pomodoro" | "deepFocus">("pomodoro");
  const [task, setTask] = useState("");
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const today = getToday();

  const todayHabits = habits.filter(h => !h.archived && isHabitDueToday(h));
  const incompleteHabits = todayHabits.filter(h => 
    !logs.some(l => l.habitId === h.id && l.date === today && l.status === "done")
  );

  // Calculate the display duration based on mode (when timer is not running)
  const displayDuration = useMemo(() => {
    if (timer.isRunning) {
      return timeRemaining;
    }
    // When not running, show the duration for the selected mode
    return mode === "pomodoro" 
      ? preset.workMinutes * 60 
      : preset.deepFocusMinutes * 60;
  }, [timer.isRunning, mode, preset.workMinutes, preset.deepFocusMinutes, timeRemaining]);

  // Get the button label duration
  const buttonDuration = mode === "pomodoro" ? preset.workMinutes : preset.deepFocusMinutes;

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
          // Play alarm sound with selected type
          alarmSound.playAlarm(preset.alarmSound);
          // Send notification (works on iOS, Android, and web)
          scheduleNotification(
            Date.now(),
            "Focus session complete! 🎉",
            timer.task || "Great work! Time for a break.",
            new Date()
          );
        } else {
          // Play softer sound for break end
          alarmSound.playBreakEnd(preset.alarmSound);
          toast.success("Break complete! Ready for the next session?");
          // Send notification for break end too
          scheduleNotification(
            Date.now(),
            "Break is over! ☕",
            "Ready for the next focus session?",
            new Date()
          );
          completeSession();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [timer.isRunning, timer.isPaused, timer.startTimestamp, timer.phase, preset.alarmSound]);

  // Request notification permission on mount (handles both web and native)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  useEffect(() => {
    const checkPermission = async () => {
      const granted = await requestNotificationPermission();
      setNotificationsEnabled(granted);
      if (granted) {
        toast.success("Notifications enabled! You'll be notified when your focus session ends.", { duration: 3000 });
      }
    };
    checkPermission();
  }, []);

  const progress = timer.isRunning 
    ? (1 - timeRemaining / timer.totalDuration) * 100 
    : 0;

  const handleStart = () => {
    const duration = mode === "pomodoro" ? preset.workMinutes * 60 : preset.deepFocusMinutes * 60;
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
    <div className="space-y-6 animate-fade-in pb-32">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-display-sm">Focus</h1>
          <p className="text-muted-foreground mt-1">Deep work, distraction-free</p>
        </div>
        <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <Settings className="w-5 h-5" />
            </Button>
          </DialogTrigger>
          <FocusSettingsDialog preset={preset} updatePreset={updatePreset} onClose={() => setShowSettingsDialog(false)} />
        </Dialog>
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
                {formatTime(Math.ceil(displayDuration))}
              </span>
              {timer.isRunning && (
                <span className={`text-sm mt-2 ${phaseColor}`}>{phaseLabel}</span>
              )}
              {!timer.isRunning && (
                <span className="text-sm mt-2 text-muted-foreground">
                  {mode === "pomodoro" ? "Pomodoro" : "Deep Focus"}
                </span>
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
                Start {buttonDuration}m
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

      {/* Preset cards - show different content based on mode */}
      {mode === "pomodoro" ? (
        <div className="grid grid-cols-3 gap-3">
          <Card className="glass cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => setShowSettingsDialog(true)}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{preset.workMinutes}m</p>
              <p className="text-xs text-muted-foreground">Work</p>
            </CardContent>
          </Card>
          <Card className="glass cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => setShowSettingsDialog(true)}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{preset.breakMinutes}m</p>
              <p className="text-xs text-muted-foreground">Break</p>
            </CardContent>
          </Card>
          <Card className="glass cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => setShowSettingsDialog(true)}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{preset.longBreakMinutes}m</p>
              <p className="text-xs text-muted-foreground">Long Break</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground text-center">Quick durations</p>
          <div className="flex flex-wrap justify-center gap-2">
            {[15, 25, 45, 60, 90, 120].map(mins => (
              <Button
                key={mins}
                variant={preset.deepFocusMinutes === mins ? "default" : "outline"}
                size="sm"
                onClick={() => updatePreset({ deepFocusMinutes: mins })}
                className={preset.deepFocusMinutes === mins ? "gradient-primary text-primary-foreground" : ""}
              >
                {mins}m
              </Button>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 mt-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => updatePreset({ deepFocusMinutes: Math.max(5, preset.deepFocusMinutes - 5) })}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <div className="text-center min-w-[80px]">
              <p className="text-2xl font-bold">{preset.deepFocusMinutes}m</p>
              <p className="text-xs text-muted-foreground">Duration</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => updatePreset({ deepFocusMinutes: Math.min(180, preset.deepFocusMinutes + 5) })}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

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

function FocusSettingsDialog({ 
  preset, 
  updatePreset,
  onClose 
}: { 
  preset: any;
  updatePreset: (updates: any) => void;
  onClose: () => void;
}) {
  const [localPreset, setLocalPreset] = useState({ ...preset });

  const handleSave = () => {
    updatePreset(localPreset);
    toast.success("Settings saved");
    onClose();
  };

  const handleSoundChange = (value: AlarmSoundType) => {
    setLocalPreset({ ...localPreset, alarmSound: value });
    // Play preview
    alarmSound.playPreview(value);
  };

  return (
    <DialogContent className="glass-strong max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Focus Settings
        </DialogTitle>
      </DialogHeader>
      
      <div className="space-y-6 mt-4">
        {/* Pomodoro Settings */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">Pomodoro Durations</h3>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Work (min)</Label>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setLocalPreset({ ...localPreset, workMinutes: Math.max(5, localPreset.workMinutes - 5) })}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-10 text-center font-mono">{localPreset.workMinutes}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setLocalPreset({ ...localPreset, workMinutes: Math.min(120, localPreset.workMinutes + 5) })}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">Break (min)</Label>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setLocalPreset({ ...localPreset, breakMinutes: Math.max(1, localPreset.breakMinutes - 1) })}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-10 text-center font-mono">{localPreset.breakMinutes}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setLocalPreset({ ...localPreset, breakMinutes: Math.min(30, localPreset.breakMinutes + 1) })}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">Long Break</Label>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setLocalPreset({ ...localPreset, longBreakMinutes: Math.max(5, localPreset.longBreakMinutes - 5) })}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-10 text-center font-mono">{localPreset.longBreakMinutes}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setLocalPreset({ ...localPreset, longBreakMinutes: Math.min(60, localPreset.longBreakMinutes + 5) })}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs">Long break every</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setLocalPreset({ ...localPreset, sessionsBeforeLongBreak: Math.max(2, localPreset.sessionsBeforeLongBreak - 1) })}
              >
                <Minus className="w-3 h-3" />
              </Button>
              <span className="font-mono">{localPreset.sessionsBeforeLongBreak}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setLocalPreset({ ...localPreset, sessionsBeforeLongBreak: Math.min(8, localPreset.sessionsBeforeLongBreak + 1) })}
              >
                <Plus className="w-3 h-3" />
              </Button>
              <span className="text-sm text-muted-foreground">sessions</span>
            </div>
          </div>
        </div>

        {/* Deep Focus Settings */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">Deep Focus Duration</h3>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setLocalPreset({ ...localPreset, deepFocusMinutes: Math.max(5, localPreset.deepFocusMinutes - 5) })}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <div className="text-center">
              <p className="text-2xl font-bold font-mono">{localPreset.deepFocusMinutes}</p>
              <p className="text-xs text-muted-foreground">minutes</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setLocalPreset({ ...localPreset, deepFocusMinutes: Math.min(180, localPreset.deepFocusMinutes + 5) })}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Sound Settings */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">Alarm Sound</h3>
          <Select value={localPreset.alarmSound || "chime"} onValueChange={handleSoundChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="chime">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  Chime
                </div>
              </SelectItem>
              <SelectItem value="bell">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  Bell
                </div>
              </SelectItem>
              <SelectItem value="gentle">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  Gentle
                </div>
              </SelectItem>
              <SelectItem value="none">
                <div className="flex items-center gap-2">
                  <VolumeX className="w-4 h-4" />
                  None
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Auto-start toggles */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">Automation</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Auto-start breaks</Label>
              <Switch 
                checked={localPreset.autoStartBreaks || false}
                onCheckedChange={(checked) => setLocalPreset({ ...localPreset, autoStartBreaks: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Auto-start next focus</Label>
              <Switch 
                checked={localPreset.autoStartWork || false}
                onCheckedChange={(checked) => setLocalPreset({ ...localPreset, autoStartWork: checked })}
              />
            </div>
          </div>
        </div>

        <Button onClick={handleSave} className="w-full gradient-primary text-primary-foreground">
          Save Settings
        </Button>
      </div>
    </DialogContent>
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
