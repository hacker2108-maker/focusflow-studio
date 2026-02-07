import { useEffect, useState, useMemo, useRef } from "react";
import { Play, Pause, RotateCcw, Coffee, Brain, CheckCircle2, Settings, Volume2, VolumeX, Minus, Plus, Bell, Smartphone } from "lucide-react";
import { useFocusStore } from "@/store/focusStore";
import { useScreenWakeLock } from "@/hooks/useScreenWakeLock";
import { useHabitStore } from "@/store/habitStore";
import { formatTime, getToday, isHabitDueToday } from "@/lib/utils";
import { alarmSound, AlarmSoundType } from "@/lib/audio";
import { requestNotificationPermission, scheduleTimerNotificationViaSW, cancelTimerNotificationViaSW } from "@/lib/notifications";
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
  const hasHandledCompletionRef = useRef(false);
  const today = getToday();

  const todayHabits = habits.filter(h => !h.archived && isHabitDueToday(h));
  const incompleteHabits = todayHabits.filter(h =>
    !logs.some(l => l.habitId === h.id && l.date === today && l.status === "done")
  );

  const displayDuration = useMemo(() => {
    if (timer.isRunning) return timeRemaining;
    return mode === "pomodoro"
      ? preset.workMinutes * 60
      : preset.deepFocusMinutes * 60;
  }, [timer.isRunning, mode, preset.workMinutes, preset.deepFocusMinutes, timeRemaining]);

  const buttonDuration = mode === "pomodoro" ? preset.workMinutes : preset.deepFocusMinutes;

  useEffect(() => {
    if (!timer.isRunning || timer.isPaused) {
      setTimeRemaining(getTimeRemaining());
      hasHandledCompletionRef.current = false;
      return;
    }

    // Reset when starting a new phase so break completion can fire
    hasHandledCompletionRef.current = false;

    const interval = setInterval(() => {
      const remaining = getTimeRemaining();
      setTimeRemaining(remaining);

      if (remaining <= 0 && !hasHandledCompletionRef.current) {
        hasHandledCompletionRef.current = true;
        if (timer.phase === "work") {
          setShowCompleteDialog(true);
          alarmSound.playAlarm(preset.alarmSound);
          // Notification shown via service worker (scheduled at timer start) - works when app is background/closed
        } else {
          alarmSound.playBreakEnd(preset.alarmSound);
          toast.success("Break complete! Ready for the next session?");
          completeSession();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [timer.isRunning, timer.isPaused, timer.startTimestamp, timer.phase, preset.alarmSound]);

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

  // Schedule SW notification when phase changes (break → work, work → break)
  useEffect(() => {
    if (!timer.isRunning || timer.isPaused || !timer.startTimestamp) return;
    const endTime = timer.startTimestamp + timer.totalDuration * 1000;
    // Only schedule if end time is in the future (avoid immediate notification on page load)
    if (endTime <= Date.now() + 1000) return;
    if (timer.phase === "work") {
      scheduleTimerNotificationViaSW(
        endTime,
        "Focus session complete!",
        timer.task || "Great work! Time for a break."
      );
    } else {
      scheduleTimerNotificationViaSW(
        endTime,
        "Break is over! ☕",
        "Ready for the next focus session?"
      );
    }
  }, [timer.isRunning, timer.isPaused, timer.startTimestamp, timer.phase, timer.totalDuration, timer.task]);

  // Cancel scheduled notification when pausing or resetting
  useEffect(() => {
    if (!timer.isRunning || timer.isPaused) {
      cancelTimerNotificationViaSW();
    }
  }, [timer.isRunning, timer.isPaused]);

  const handleComplete = (markHabits: string[] = []) => {
    completeSession();
    setShowCompleteDialog(false);

    markHabits.forEach(habitId => logHabit(habitId, "done"));

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
  const isWorkPhase = timer.phase === "work";

  // Keep screen on during active focus sessions (mobile PWA)
  useScreenWakeLock(timer.isRunning && !timer.isPaused);

  return (
    <div className="relative min-h-[calc(100vh-8rem)] -mx-4 -mt-4 px-4 pt-4 pb-32 overflow-hidden">
      {/* Ambient background */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
      >
        <div
          className={`absolute -top-1/2 -left-1/2 w-full h-full rounded-full opacity-[0.08] blur-3xl transition-colors duration-700 ${
            isWorkPhase ? "bg-primary" : "bg-success"
          }`}
          style={{ transform: "scale(1.5)" }}
        />
        <div
          className={`absolute -bottom-1/4 -right-1/4 w-3/4 h-3/4 rounded-full opacity-[0.05] blur-3xl transition-colors duration-700 ${
            isWorkPhase ? "bg-primary" : "bg-success"
          }`}
          style={{ transform: "scale(1.2)" }}
        />
      </div>

      <div className="relative space-y-6 animate-fade-in">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-display-sm font-semibold tracking-tight">Focus</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">Deep work, distraction-free</p>
          </div>
          <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 rounded-full">
                <Settings className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <FocusSettingsDialog preset={preset} updatePreset={updatePreset} onClose={() => setShowSettingsDialog(false)} />
          </Dialog>
        </header>

        {!timer.isRunning && (
          <>
            <Tabs value={mode} onValueChange={v => setMode(v as "pomodoro" | "deepFocus")}>
              <TabsList className="glass w-full p-1 rounded-xl h-12">
                <TabsTrigger value="pomodoro" className="flex-1 rounded-lg data-[state=active]:shadow-sm">
                  <Coffee className="w-4 h-4 mr-2" />
                  Pomodoro
                </TabsTrigger>
                <TabsTrigger value="deepFocus" className="flex-1 rounded-lg data-[state=active]:shadow-sm">
                  <Brain className="w-4 h-4 mr-2" />
                  Deep Focus
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Input
              value={task}
              onChange={e => setTask(e.target.value)}
              placeholder="What are you working on? (optional)"
              className="glass rounded-xl border-0 h-12 bg-background/60 backdrop-blur-xl"
            />
          </>
        )}

        {/* Timer Card - Premium design */}
        <Card className="glass border-0 overflow-hidden bg-background/40 backdrop-blur-2xl shadow-xl">
          <CardContent className="p-8 md:p-12 flex flex-col items-center">
            <div className="relative w-72 h-72 md:w-80 md:h-80 mb-8">
              {/* Outer glow ring */}
              <div
                className={`absolute inset-0 rounded-full opacity-20 blur-xl transition-opacity duration-500 ${
                  isWorkPhase ? "bg-primary" : "bg-success"
                }`}
                style={{
                  transform: `scale(${1 + progress / 200})`,
                }}
              />
              {/* Progress ring */}
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-border/40"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 46}
                  strokeDashoffset={2 * Math.PI * 46 * (1 - progress / 100)}
                  className={isWorkPhase ? "text-primary" : "text-success"}
                  style={{ transition: "stroke-dashoffset 0.5s ease-in-out" }}
                />
              </svg>
              {/* Inner content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-5xl md:text-6xl font-semibold tracking-tighter tabular-nums text-foreground">
                  {formatTime(Math.ceil(displayDuration))}
                </span>
                {timer.isRunning ? (
                  <span
                    className={`text-sm mt-2 font-medium ${
                      isWorkPhase ? "text-primary" : "text-success"
                    }`}
                  >
                    {phaseLabel}
                  </span>
                ) : (
                  <span className="text-sm mt-2 text-muted-foreground">
                    {mode === "pomodoro" ? "Pomodoro" : "Deep Focus"}
                  </span>
                )}
                {timer.task && timer.isRunning && (
                  <span className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate px-2">
                    {timer.task}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!timer.isRunning ? (
                <Button
                  size="lg"
                  className="h-14 px-10 rounded-xl text-base font-semibold shadow-lg hover:shadow-xl transition-all gradient-primary text-primary-foreground"
                  onClick={handleStart}
                >
                  <Play className="w-5 h-5 mr-2 fill-current" />
                  Start {buttonDuration}m
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    variant="secondary"
                    className="h-12 w-12 rounded-xl"
                    onClick={timer.isPaused ? resumeTimer : pauseTimer}
                  >
                    {timer.isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5" />}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 w-12 rounded-xl"
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

        {timer.isRunning && !timer.isPaused && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/60 border border-border/50 text-sm text-muted-foreground">
            <Smartphone className="w-4 h-4 shrink-0 text-primary" />
            <span>
              <strong className="text-foreground">Focus mode:</strong> Enable Do Not Disturb on your device to block other app notifications and messages.
            </span>
          </div>
        )}

        {mode === "pomodoro" ? (
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: preset.workMinutes, label: "Work", unit: "m" },
              { value: preset.breakMinutes, label: "Break", unit: "m" },
              { value: preset.longBreakMinutes, label: "Long", unit: "m" },
            ].map(({ value, label, unit }) => (
              <Card
                key={label}
                className="glass cursor-pointer hover:bg-secondary/50 transition-all rounded-xl border-0 bg-background/40 backdrop-blur-xl"
                onClick={() => setShowSettingsDialog(true)}
              >
                <CardContent className="p-4 text-center">
                  <p className="font-mono text-2xl font-semibold tabular-nums">{value}{unit}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </CardContent>
              </Card>
            ))}
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
                  className="rounded-lg"
                  onClick={() => updatePreset({ deepFocusMinutes: mins })}
                >
                  {mins}m
                </Button>
              ))}
            </div>
            <div className="flex items-center justify-center gap-4 mt-4">
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl"
                onClick={() => updatePreset({ deepFocusMinutes: Math.max(5, preset.deepFocusMinutes - 5) })}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <div className="text-center min-w-[80px]">
                <p className="font-mono text-2xl font-semibold tabular-nums">{preset.deepFocusMinutes}m</p>
                <p className="text-xs text-muted-foreground">Duration</p>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl"
                onClick={() => updatePreset({ deepFocusMinutes: Math.min(180, preset.deepFocusMinutes + 5) })}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        <SessionCompleteDialog
          open={showCompleteDialog}
          onComplete={handleComplete}
          incompleteHabits={incompleteHabits}
          task={timer.task}
        />
      </div>
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
    alarmSound.playPreview(value);
  };

  return (
    <DialogContent className="glass-strong max-w-md rounded-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Focus Settings
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-6 mt-4">
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">Pomodoro Durations</h3>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Work (min)</Label>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setLocalPreset({ ...localPreset, workMinutes: Math.max(5, localPreset.workMinutes - 5) })}>
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-10 text-center font-mono text-sm">{localPreset.workMinutes}</span>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setLocalPreset({ ...localPreset, workMinutes: Math.min(120, localPreset.workMinutes + 5) })}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Break (min)</Label>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setLocalPreset({ ...localPreset, breakMinutes: Math.max(1, localPreset.breakMinutes - 1) })}>
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-10 text-center font-mono text-sm">{localPreset.breakMinutes}</span>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setLocalPreset({ ...localPreset, breakMinutes: Math.min(30, localPreset.breakMinutes + 1) })}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Long Break</Label>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setLocalPreset({ ...localPreset, longBreakMinutes: Math.max(5, localPreset.longBreakMinutes - 5) })}>
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-10 text-center font-mono text-sm">{localPreset.longBreakMinutes}</span>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setLocalPreset({ ...localPreset, longBreakMinutes: Math.min(60, localPreset.longBreakMinutes + 5) })}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Long break every</Label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setLocalPreset({ ...localPreset, sessionsBeforeLongBreak: Math.max(2, localPreset.sessionsBeforeLongBreak - 1) })}>
                <Minus className="w-3 h-3" />
              </Button>
              <span className="font-mono">{localPreset.sessionsBeforeLongBreak}</span>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setLocalPreset({ ...localPreset, sessionsBeforeLongBreak: Math.min(8, localPreset.sessionsBeforeLongBreak + 1) })}>
                <Plus className="w-3 h-3" />
              </Button>
              <span className="text-sm text-muted-foreground">sessions</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">Deep Focus Duration</h3>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="rounded-xl" onClick={() => setLocalPreset({ ...localPreset, deepFocusMinutes: Math.max(5, localPreset.deepFocusMinutes - 5) })}>
              <Minus className="w-4 h-4" />
            </Button>
            <div className="text-center">
              <p className="font-mono text-2xl font-semibold">{localPreset.deepFocusMinutes}</p>
              <p className="text-xs text-muted-foreground">minutes</p>
            </div>
            <Button variant="outline" size="icon" className="rounded-xl" onClick={() => setLocalPreset({ ...localPreset, deepFocusMinutes: Math.min(180, localPreset.deepFocusMinutes + 5) })}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">Alarm Sound</h3>
          <Select value={localPreset.alarmSound || "chime"} onValueChange={handleSoundChange}>
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="chime"><div className="flex items-center gap-2"><Volume2 className="w-4 h-4" />Chime</div></SelectItem>
              <SelectItem value="bell"><div className="flex items-center gap-2"><Volume2 className="w-4 h-4" />Bell</div></SelectItem>
              <SelectItem value="gentle"><div className="flex items-center gap-2"><Volume2 className="w-4 h-4" />Gentle</div></SelectItem>
              <SelectItem value="melody"><div className="flex items-center gap-2"><Bell className="w-4 h-4" />Melody</div></SelectItem>
              <SelectItem value="song"><div className="flex items-center gap-2"><Bell className="w-4 h-4" />Song (celebration)</div></SelectItem>
              <SelectItem value="none"><div className="flex items-center gap-2"><VolumeX className="w-4 h-4" />None</div></SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">Automation</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Auto-start breaks</Label>
              <Switch checked={localPreset.autoStartBreaks || false} onCheckedChange={checked => setLocalPreset({ ...localPreset, autoStartBreaks: checked })} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Auto-start next focus</Label>
              <Switch checked={localPreset.autoStartWork || false} onCheckedChange={checked => setLocalPreset({ ...localPreset, autoStartWork: checked })} />
            </div>
          </div>
        </div>

        <Button onClick={handleSave} className="w-full rounded-xl gradient-primary text-primary-foreground h-11">
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
    setSelectedHabits(prev => prev.includes(id) ? prev.filter(h => h !== id) : [...prev, id]);
  };

  return (
    <Dialog open={open}>
      <DialogContent className="glass-strong rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            Session Complete!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {task && (
            <p className="text-sm text-muted-foreground">
              Great work on: <span className="text-foreground font-medium">{task}</span>
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
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      selectedHabits.includes(habit.id)
                        ? "bg-success/10 border border-success/30"
                        : "bg-secondary hover:bg-secondary/80 border border-transparent"
                    }`}
                  >
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: habit.color }} />
                    <span className="text-sm flex-1 text-left">{habit.name}</span>
                    {selectedHabits.includes(habit.id) && <CheckCircle2 className="w-4 h-4 text-success shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button onClick={() => onComplete(selectedHabits)} className="w-full rounded-xl gradient-primary text-primary-foreground h-11">
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
