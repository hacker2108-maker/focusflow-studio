import { ReactNode, useState } from "react";
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

  const currentIndex = navItems.findIndex((item) => item.to === location.pathname);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (currentIndex === -1) return;

    const threshold = 50;
    const velocity = info.velocity.x;
    const offset = info.offset.x;

    if (Math.abs(offset) > threshold || Math.abs(velocity) > 500) {
      if (offset > 0 || velocity > 500) {
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
    <div className="relative overflow-hidden min-h-screen">
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
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className="absolute inset-0 touch-pan-y"
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
