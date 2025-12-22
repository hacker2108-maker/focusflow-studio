import { useState, useRef, ReactNode } from "react";
import { motion, useAnimation, PanInfo } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/hooks/useHaptics";

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
}

export function PullToRefresh({ children, onRefresh, className }: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  const { impact } = useHaptics();

  const threshold = 80;
  const maxPull = 120;

  const handleDragEnd = async (_: any, info: PanInfo) => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      impact("medium");
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
    controls.start({ y: 0 });
  };

  const handleDrag = (_: any, info: PanInfo) => {
    // Only allow pull when at top of scroll
    if (containerRef.current && containerRef.current.scrollTop === 0 && info.offset.y > 0) {
      const distance = Math.min(info.offset.y * 0.5, maxPull);
      setPullDistance(distance);
      
      // Trigger haptic when crossing threshold
      if (distance >= threshold && pullDistance < threshold) {
        impact("light");
      }
    }
  };

  const progress = Math.min(pullDistance / threshold, 1);
  const showIndicator = pullDistance > 10;

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden", className)}>
      {/* Pull indicator */}
      <motion.div
        className="absolute left-0 right-0 flex justify-center pointer-events-none z-10"
        style={{ top: pullDistance - 50 }}
        animate={{ opacity: showIndicator ? 1 : 0 }}
      >
        <div className={cn(
          "w-10 h-10 rounded-full bg-background border shadow-lg flex items-center justify-center",
          pullDistance >= threshold && "border-primary"
        )}>
          <RefreshCw 
            className={cn(
              "w-5 h-5 text-muted-foreground transition-colors",
              isRefreshing && "animate-spin text-primary",
              pullDistance >= threshold && !isRefreshing && "text-primary"
            )}
            style={{ 
              transform: !isRefreshing ? `rotate(${progress * 180}deg)` : undefined 
            }}
          />
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.5, bottom: 0 }}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ y: pullDistance }}
        className="min-h-full"
      >
        {children}
      </motion.div>
    </div>
  );
}
