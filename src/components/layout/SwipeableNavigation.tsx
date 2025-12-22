import { ReactNode, useCallback, useRef, useState, type PointerEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Home, Target, Timer, BookOpen, CalendarDays, BarChart3, Settings, MapPin, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/habits", icon: Target, label: "Habits" },
  { to: "/focus", icon: Timer, label: "Focus" },
  { to: "/activity", icon: MapPin, label: "Activity" },
  { to: "/notes", icon: StickyNote, label: "Notes" },
  { to: "/journal", icon: BookOpen, label: "Journal" },
  { to: "/calendar", icon: CalendarDays, label: "Calendar" },
  { to: "/insights", icon: BarChart3, label: "Insights" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

interface SwipeableNavigationProps {
  children: ReactNode;
}

export function SwipeableNavigation({ children }: SwipeableNavigationProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [direction, setDirection] = useState(0);

  // IMPORTANT: We restrict page-swipe to an edge gesture so it doesn't steal taps/scrolls
  // from inputs, buttons, and horizontal scrollers.
  const SWIPE_EDGE_PX = 32;
  const [dragEnabled, setDragEnabled] = useState(false);
  const startXRef = useRef<number>(0);

  const currentIndex = navItems.findIndex((item) => item.to === location.pathname);

  const shouldBlockPageSwipe = useCallback((target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    if (!el) return false;

    // Opt-out for areas that handle their own horizontal gestures.
    if (el.closest("[data-no-page-swipe]")) return true;

    // Don't hijack interaction controls.
    if (
      el.closest(
        "button, a, input, textarea, select, option, label, [role='button'], [role='switch'], [role='checkbox'], [contenteditable='true']",
      )
    ) {
      return true;
    }

    return false;
  }, []);

  const onPointerDownCapture = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      startXRef.current = e.clientX;
      const isEdge =
        e.clientX <= SWIPE_EDGE_PX ||
        e.clientX >= (window.innerWidth || 0) - SWIPE_EDGE_PX;

      setDragEnabled(isEdge && !shouldBlockPageSwipe(e.target));
    },
    [shouldBlockPageSwipe],
  );

  const onPointerUp = useCallback(() => {
    setDragEnabled(false);
  }, []);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (currentIndex === -1) return;

    // Only trigger if gesture began from the edge.
    const startedFromEdge =
      startXRef.current <= SWIPE_EDGE_PX ||
      startXRef.current >= (window.innerWidth || 0) - SWIPE_EDGE_PX;
    if (!startedFromEdge) return;

    const threshold = 90;
    const velocity = info.velocity.x;
    const offset = info.offset.x;

    if (Math.abs(offset) > threshold || Math.abs(velocity) > 800) {
      if (offset > 0 || velocity > 800) {
        // Swipe right - go to previous page
        if (currentIndex > 0) {
          setDirection(-1);
          navigate(navItems[currentIndex - 1].to);
        }
      } else {
        // Swipe left - go to next page
        if (currentIndex < navItems.length - 1) {
          setDirection(1);
          navigate(navItems[currentIndex + 1].to);
        }
      }
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? "100%" : "-100%",
      opacity: 0,
    }),
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={location.pathname}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
          drag={dragEnabled ? "x" : false}
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          onPointerDownCapture={onPointerDownCapture}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="touch-pan-y"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function SwipeableBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-border/50 md:hidden safe-area-pb">
      <div className="h-16 px-2 overflow-x-auto scrollbar-hide">
        <div className="flex items-center justify-around gap-1 w-max min-w-full">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <motion.a
                key={item.to}
                href={item.to}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.to);
                }}
                className="relative flex flex-col items-center justify-center w-16 h-16 flex-shrink-0"
                whileTap={{ scale: 0.95 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabSwipe"
                    className="absolute inset-x-2 top-1 h-1 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <item.icon
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span
                  className={cn(
                    "text-2xs mt-1 font-medium transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </motion.a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
