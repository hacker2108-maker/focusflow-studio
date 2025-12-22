import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface TimeWidgetProps {
  compact?: boolean;
}

export function TimeWidget({ compact = false }: TimeWidgetProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Clock className="w-4 h-4 text-primary" />
        <span className="font-medium">{formatTime(time)}</span>
        <span className="text-muted-foreground">•</span>
        <span className="text-muted-foreground">{formatDate(time)}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-4 glass rounded-xl">
      <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
        <Clock className="w-6 h-6 text-primary-foreground" />
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight">{formatTime(time)}</p>
        <p className="text-sm text-muted-foreground">{formatDate(time)}</p>
      </div>
    </div>
  );
}
