import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, Play, Pause } from "lucide-react";
import { useFocusStore } from "@/store/focusStore";
import { formatTime } from "@/lib/utils";

export function FocusMiniBanner() {
  const { timer, getTimeRemaining, pauseTimer, resumeTimer } = useFocusStore();
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining());

  useEffect(() => {
    if (!timer.isRunning) return;

    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [timer.isRunning, timer.isPaused, getTimeRemaining]);

  if (!timer.isRunning) return null;

  const phaseLabel = timer.phase === "work" ? "Focus" : timer.phase === "break" ? "Break" : "Long Break";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-[60] md:left-64"
      >
        <Link to="/focus" className="block">
          <div className="glass-strong border-b border-primary/20 px-4 py-2">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shadow-glow">
                  <Timer className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <span className="text-sm font-medium">{phaseLabel}</span>
                  {timer.task && (
                    <span className="text-xs text-muted-foreground ml-2">· {timer.task}</span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-primary">
                  {formatTime(Math.ceil(timeRemaining))}
                </span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    timer.isPaused ? resumeTimer() : pauseTimer();
                  }}
                  className="p-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  {timer.isPaused ? (
                    <Play className="w-4 h-4 text-primary" />
                  ) : (
                    <Pause className="w-4 h-4 text-primary" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
}