import { Moon, Sun, Download, Upload, Trash2 } from "lucide-react";
import { useSettingsStore } from "@/store/settingsStore";
import { useHabitStore } from "@/store/habitStore";
import { useFocusStore } from "@/store/focusStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function Settings() {
  const { settings, setTheme, resetSettings, clearAllData: clearSettings, weeklyReviews } = useSettingsStore();
  const { habits, logs, clearAllData: clearHabits } = useHabitStore();
  const { sessions, clearAllData: clearFocus } = useFocusStore();

  const handleExport = () => {
    const data = { habits, logs, sessions, settings, weeklyReviews };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `focushabit-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported successfully");
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.habits) useHabitStore.getState().importData(data.habits, data.logs || []);
        if (data.sessions) useFocusStore.getState().importData(data.sessions);
        if (data.settings) useSettingsStore.getState().importData(data.settings, data.weeklyReviews || []);
        toast.success("Data imported successfully");
      } catch {
        toast.error("Invalid backup file");
      }
    };
    input.click();
  };

  const handleClearAll = () => {
    if (confirm("Are you sure? This will delete all your habits, logs, and focus sessions.")) {
      clearHabits();
      clearFocus();
      clearSettings();
      toast.success("All data cleared");
    }
  };

  const isDark = settings.theme === "dark";

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-display-sm">Settings</h1>
        <p className="text-muted-foreground mt-1">Customize your experience</p>
      </header>

      <Card className="glass">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isDark ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-sm text-muted-foreground">Switch between light and dark theme</p>
              </div>
            </div>
            <Switch checked={isDark} onCheckedChange={c => setTheme(c ? "dark" : "light")} />
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardContent className="p-6 space-y-4">
          <h3 className="font-semibold">Data Management</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={handleExport} className="justify-start">
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
            <Button variant="outline" onClick={handleImport} className="justify-start">
              <Upload className="w-4 h-4 mr-2" />
              Import Data
            </Button>
          </div>

          <div className="pt-4 border-t border-border">
            <Button variant="destructive" onClick={handleClearAll} className="w-full">
              <Trash2 className="w-4 h-4 mr-2" />
              Reset All Data
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              This action cannot be undone
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground text-center">
            FocusHabit v1.0 · All data stored locally
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
