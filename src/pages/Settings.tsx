import { useState, useEffect } from "react";
import { Moon, Sun, Download, Upload, Trash2, LogOut, Bell, BellOff, Cloud, CloudOff, Palette, Globe, User, Shield, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSettingsStore } from "@/store/settingsStore";
import { useHabitStore } from "@/store/habitStore";
import { useFocusStore } from "@/store/focusStore";
import { useJournalStore } from "@/store/journalStore";
import { useCalendarStore } from "@/store/calendarStore";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";

export default function Settings() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { settings, setTheme, updateSettings, resetSettings, clearAllData: clearSettings, weeklyReviews } = useSettingsStore();
  const { habits, logs, clearAllData: clearHabits } = useHabitStore();
  const { sessions, clearAllData: clearFocus } = useFocusStore();
  const { entries: journalEntries, clearAllData: clearJournal } = useJournalStore();
  const { events, clearAllData: clearCalendar } = useCalendarStore();
  
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(() => 
    localStorage.getItem("last-sync-time")
  );
  const [weatherCity, setWeatherCity] = useState(() => 
    localStorage.getItem("weather-city") || ""
  );

  const isNative = Capacitor.isNativePlatform();

  const handleExport = () => {
    const data = { habits, logs, sessions, settings, weeklyReviews, journalEntries, events };
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

  const handleSyncToCloud = async () => {
    if (!user) {
      toast.error("Please sign in to sync data");
      return;
    }
    
    setSyncing(true);
    try {
      // Sync habits
      for (const habit of habits) {
        const { error } = await supabase.from("habits").upsert({
          id: habit.id,
          user_id: user.id,
          name: habit.name,
          description: habit.description,
          color: habit.color,
          archived: habit.archived,
          schedule_type: habit.schedule.type,
          schedule_days_of_week: habit.schedule.daysOfWeek,
          schedule_times_per_week: habit.schedule.timesPerWeek,
          reminder_time: habit.reminderTime,
          goal_type: habit.goalType,
          goal_target: habit.goalTarget,
        }, { onConflict: "id" });
        
        if (error) console.error("Habit sync error:", error);
      }
      
      // Sync habit logs
      for (const log of logs) {
        const { error } = await supabase.from("habit_logs").upsert({
          id: log.id,
          user_id: user.id,
          habit_id: log.habitId,
          date: log.date,
          status: log.status,
          value: log.value,
          note: log.note,
          timestamp: log.timestamp,
        }, { onConflict: "id" });
        
        if (error) console.error("Log sync error:", error);
      }
      
      // Sync journal entries
      for (const entry of journalEntries) {
        const { error } = await supabase.from("journal_entries").upsert({
          id: entry.id,
          user_id: user.id,
          date: entry.date,
          title: entry.title,
          content: entry.content,
          mood: entry.mood,
          tags: entry.tags,
        }, { onConflict: "id" });
        
        if (error) console.error("Journal sync error:", error);
      }
      
      // Sync calendar events
      for (const event of events) {
        const { error } = await supabase.from("calendar_events").upsert({
          id: event.id,
          user_id: user.id,
          title: event.title,
          description: event.description,
          date: event.date,
          start_time: event.startTime,
          end_time: event.endTime,
          color: event.color,
          reminder: event.reminder,
          is_recurring: event.isRecurring,
          recurrence_type: event.recurrenceType,
          recurrence_end_date: event.recurrenceEndDate,
        }, { onConflict: "id" });
        
        if (error) console.error("Event sync error:", error);
      }
      
      // Sync focus sessions
      for (const session of sessions) {
        const { error } = await supabase.from("focus_sessions").upsert({
          id: session.id,
          user_id: user.id,
          date: session.date,
          start_time: session.startTime,
          duration_minutes: session.durationMinutes,
          mode: session.mode,
          task: session.task,
          note: session.note,
          completed: session.completed,
        }, { onConflict: "id" });
        
        if (error) console.error("Session sync error:", error);
      }
      
      const now = new Date().toISOString();
      setLastSync(now);
      localStorage.setItem("last-sync-time", now);
      toast.success("Data synced to cloud!");
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Failed to sync data");
    } finally {
      setSyncing(false);
    }
  };

  const handleClearAll = () => {
    if (confirm("Are you sure? This will delete all your local data.")) {
      clearHabits();
      clearFocus();
      clearSettings();
      clearJournal?.();
      clearCalendar?.();
      toast.success("All data cleared");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/auth");
  };

  const handleSaveWeatherCity = () => {
    localStorage.setItem("weather-city", weatherCity);
    toast.success("Weather location saved");
  };

  const isDark = settings.theme === "dark";
  const focusModeEnabled = settings.focusModeEnabled ?? false;

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <header>
        <h1 className="text-display-sm">Settings</h1>
        <p className="text-muted-foreground mt-1">Customize your experience</p>
      </header>

      {/* Account */}
      <Card className="glass">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
              <User className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Account</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cloud Sync */}
      <Card className="glass border-primary/20">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cloud className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">Cloud Sync</p>
                <p className="text-sm text-muted-foreground">
                  {lastSync 
                    ? `Last synced: ${new Date(lastSync).toLocaleDateString()} ${new Date(lastSync).toLocaleTimeString()}`
                    : "Sync your data to the cloud"}
                </p>
              </div>
            </div>
            <Button 
              onClick={handleSyncToCloud} 
              disabled={syncing}
              className="gradient-primary text-primary-foreground"
            >
              {syncing ? "Syncing..." : "Sync Now"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="glass">
        <CardContent className="p-6 space-y-6">
          <h3 className="font-semibold flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            Appearance
          </h3>
          
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
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Week Starts On</p>
              <p className="text-sm text-muted-foreground">Configure your calendar</p>
            </div>
            <Select 
              value={settings.weekStartsMonday ? "monday" : "sunday"}
              onValueChange={(v) => updateSettings({ weekStartsMonday: v === "monday" })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sunday">Sunday</SelectItem>
                <SelectItem value="monday">Monday</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Weather Location */}
      <Card className="glass">
        <CardContent className="p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            Weather Location
          </h3>
          
          <div className="flex gap-2">
            <Input
              value={weatherCity}
              onChange={(e) => setWeatherCity(e.target.value)}
              placeholder="Enter city name (e.g., Paris)"
              className="flex-1"
            />
            <Button onClick={handleSaveWeatherCity}>Save</Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Leave empty to use your current location
          </p>
        </CardContent>
      </Card>

      {/* Focus Mode */}
      <Card className="glass">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {focusModeEnabled ? (
                <BellOff className="w-5 h-5 text-primary" />
              ) : (
                <Bell className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">Focus Mode</p>
                <p className="text-sm text-muted-foreground">
                  {focusModeEnabled 
                    ? "Notifications silenced during focus sessions" 
                    : "Mute notifications during focus sessions"}
                </p>
              </div>
            </div>
            <Switch 
              checked={focusModeEnabled} 
              onCheckedChange={c => updateSettings({ focusModeEnabled: c })} 
            />
          </div>
          {focusModeEnabled && (
            <p className="text-xs text-muted-foreground mt-3 p-3 bg-primary/5 rounded-lg">
              Note: Enable "Do Not Disturb" on your device for best results.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Native App Info */}
      {isNative && (
        <Card className="glass border-success/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-success" />
              <div>
                <p className="font-medium">Native App</p>
                <p className="text-sm text-muted-foreground">
                  Running as a native mobile app
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Management */}
      <Card className="glass">
        <CardContent className="p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Data Management
          </h3>
          
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
              Reset All Local Data
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
            FocusHabit v2.0 · Built with ❤️
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
