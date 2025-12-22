import { ReactNode, useEffect } from "react";
import { Sidebar } from "./Navigation";
import { SwipeableBottomNav, SwipeableNavigation } from "./SwipeableNavigation";
import { FocusMiniBanner } from "@/components/FocusMiniBanner";
import { AIAssistant } from "@/components/AIAssistant";
import { useFocusStore } from "@/store/focusStore";
import { useSettingsStore } from "@/store/settingsStore";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { timer } = useFocusStore();
  const { settings } = useSettingsStore();

  // Initialize theme on mount
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    
    if (settings.theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(settings.theme);
    }
  }, [settings.theme]);

  return (
    <div className="min-h-screen bg-background pt-[env(safe-area-inset-top)]">
      <Sidebar />
      {timer.isRunning && <FocusMiniBanner />}
      <main className={`md:ml-64 pb-28 md:pb-6 ${timer.isRunning ? "pt-14 md:pt-0" : "pt-0"}`}>
        <SwipeableNavigation>
          <div className="max-w-4xl mx-auto px-4 py-4 md:py-6 min-h-screen">
            {children}
          </div>
        </SwipeableNavigation>
      </main>
      <SwipeableBottomNav />
      <AIAssistant />
    </div>
  );
}
