import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, RotateCcw, Coffee, Brain } from "lucide-react";
import { useFocusStore } from "@/store/focusStore";
import { formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Focus() {
  const { timer, preset, startTimer, pauseTimer, resumeTimer, resetTimer, completeSession, getTimeRemaining } = useFocusStore();
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining());
  const [mode, setMode] = useState<"pomodoro" | "deepFocus">("pomodoro");

  useEffect(() => {
    if (!timer.isRunning || timer.isPaused) {
      setTimeRemaining(getTimeRemaining());
      return;
    }

    const interval = setInterval(() => {
      const remaining = getTimeRemaining();
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        completeSession();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [timer.isRunning, timer.isPaused, timer.startTimestamp]);

  const progress = timer.isRunning 
    ? (1 - timeRemaining / timer.totalDuration) * 100 
    : 0;

  const handleStart = () => {
    startTimer(mode, undefined, mode === "pomodoro" ? preset.workMinutes * 60 : 60 * 60);
  };

  const phaseLabel = timer.phase === "work" ? "Focus" : timer.phase === "break" ? "Break" : "Long Break";

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-display-sm">Focus</h1>
        <p className="text-muted-foreground mt-1">Deep work, distraction-free</p>
      </header>

      {!timer.isRunning && (
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
                stroke="hsl(var(--primary))"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 120}
                strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
                className="drop-shadow-[0_0_10px_hsl(var(--primary))]"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold font-mono tracking-tight">
                {formatTime(Math.ceil(timeRemaining))}
              </span>
              {timer.isRunning && (
                <span className="text-sm text-muted-foreground mt-2">{phaseLabel}</span>
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
                  onClick={resetTimer}
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
    </div>
  );
}
