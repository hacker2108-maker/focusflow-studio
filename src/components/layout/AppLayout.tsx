import { ReactNode, useEffect } from "react";
import { BottomNav, Sidebar } from "./Navigation";
import { FocusMiniBanner } from "@/components/FocusMiniBanner";
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
    <div className="min-h-screen bg-background">
      <Sidebar />
      {timer.isRunning && <FocusMiniBanner />}
      <main className={`md:ml-64 pb-20 md:pb-6 ${timer.isRunning ? "pt-14" : ""}`}>
        <div className="max-w-4xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}