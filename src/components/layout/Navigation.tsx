import { NavLink, useLocation } from "react-router-dom";
import { Home, Target, Timer, BarChart3, Settings, BookOpen, CalendarDays, MapPin, StickyNote, Navigation, Github } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/habits", icon: Target, label: "Habits" },
  { to: "/focus", icon: Timer, label: "Focus" },
  { to: "/github", icon: Github, label: "GitHub" },
  { to: "/notes", icon: StickyNote, label: "Notes" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-border/50 md:hidden safe-area-pb">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="relative flex flex-col items-center justify-center w-16 h-full"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
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
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

const sidebarNavItems = [
  ...navItems,
  { to: "/activity", icon: MapPin, label: "Activity" },
  { to: "/navigate", icon: Navigation, label: "Navigate" },
  { to: "/calendar", icon: CalendarDays, label: "Calendar" },
  { to: "/journal", icon: BookOpen, label: "Journal" },
  { to: "/insights", icon: BarChart3, label: "Insights" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen glass-strong border-r border-border/50 fixed left-0 top-0">
      <div className="p-6">
        <h1 className="text-xl font-bold text-gradient">FocusHabit</h1>
        <p className="text-xs text-muted-foreground mt-1">Your productivity hub</p>
      </div>
      
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {sidebarNavItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-secondary/80",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 mx-3 mb-3 rounded-xl bg-primary/5 border border-primary/10">
        <p className="text-xs text-muted-foreground">
          Stay focused, build habits.
        </p>
      </div>
    </aside>
  );
}
