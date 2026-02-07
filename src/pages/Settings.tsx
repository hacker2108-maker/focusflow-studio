import { useState, useEffect } from "react";
import { Moon, Sun, Download, Upload, Trash2, LogOut, Bell, BellOff, Cloud, Palette, Globe, Shield, Smartphone, ChevronRight, Vibrate, Clock, Timer, Eye, Zap, Github } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useSettingsStore } from "@/store/settingsStore";
import { useHabitStore } from "@/store/habitStore";
import { useFocusStore } from "@/store/focusStore";
import { useJournalStore } from "@/store/journalStore";
import { useCalendarStore } from "@/store/calendarStore";
import { useGitHubStore } from "@/store/githubStore";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { requestNotificationPermission } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";

export default function Settings() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { settings, setTheme, updateSettings, resetSettings, clearAllData: clearSettings, weeklyReviews } = useSettingsStore();
  const { habits, logs, clearAllData: clearHabits } = useHabitStore();
  const { accessToken, setAccessToken } = useGitHubStore();
  const { sessions, preset, updatePreset, clearAllData: clearFocus } = useFocusStore();
  const { entries: journalEntries, clearAllData: clearJournal } = useJournalStore();
  const { events, clearAllData: clearCalendar } = useCalendarStore();
  
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(() => 
    localStorage.getItem("last-sync-time")
  );
  const [weatherCity, setWeatherCity] = useState(() => 
    localStorage.getItem("weather-city") || ""
  );
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => 
    localStorage.getItem("notifications-enabled") === "true"
  );
  const [hapticsEnabled, setHapticsEnabled] = useState(() => 
    localStorage.getItem("haptics-enabled") !== "false"
  );
  const [use24Hour, setUse24Hour] = useState(() => 
    localStorage.getItem("use-24-hour") === "true"
  );
  const [compactView, setCompactView] = useState(() => 
    localStorage.getItem("compact-view") === "true"
  );
  const [showStreaks, setShowStreaks] = useState(() => 
    localStorage.getItem("show-streaks") !== "false"
  );
  const [autoStartBreaks, setAutoStartBreaks] = useState(() => 
    preset.autoStartBreaks ?? false
  );
  const [autoStartWork, setAutoStartWork] = useState(() => 
    preset.autoStartWork ?? false
  );

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data);
        });
    }
  }, [user]);

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
        // Note: Import now only works for local stores, cloud-synced data loads automatically
        if (data.sessions) useFocusStore.getState().importData(data.sessions);
        if (data.settings) useSettingsStore.getState().importData(data.settings, data.weeklyReviews || []);
        toast.success("Data imported successfully. Refresh to load cloud data.");
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

  const handleClearAll = async () => {
    if (confirm("Are you sure? This will delete ALL your data from the cloud and locally. This cannot be undone.")) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Delete all user data from Supabase
          await Promise.all([
            supabase.from("habits").delete().eq("user_id", user.id),
            supabase.from("habit_logs").delete().eq("user_id", user.id),
            supabase.from("focus_sessions").delete().eq("user_id", user.id),
            supabase.from("journal_entries").delete().eq("user_id", user.id),
            supabase.from("calendar_events").delete().eq("user_id", user.id),
            supabase.from("notes").delete().eq("user_id", user.id),
          ]);
        }
        
        // Clear local stores
        clearHabits();
        clearFocus();
        clearSettings();
        clearJournal?.();
        clearCalendar?.();
        
        toast.success("All data deleted");
      } catch (error) {
        console.error("Error clearing data:", error);
        toast.error("Failed to delete some data");
      }
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

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotificationsEnabled(true);
        localStorage.setItem("notifications-enabled", "true");
        toast.success("Notifications enabled");
      } else {
        toast.error("Notification permission denied. Please enable in your device settings.");
      }
    } else {
      setNotificationsEnabled(false);
      localStorage.setItem("notifications-enabled", "false");
      toast.info("Notifications disabled");
    }
  };

  const handleHapticsToggle = (enabled: boolean) => {
    setHapticsEnabled(enabled);
    localStorage.setItem("haptics-enabled", enabled.toString());
    if (enabled) {
      // Trigger a sample vibration
      if (navigator.vibrate) navigator.vibrate(50);
    }
    toast.success(enabled ? "Haptic feedback enabled" : "Haptic feedback disabled");
  };

  const handleTimeFormatToggle = (use24: boolean) => {
    setUse24Hour(use24);
    localStorage.setItem("use-24-hour", use24.toString());
  };

  const handleCompactViewToggle = (compact: boolean) => {
    setCompactView(compact);
    localStorage.setItem("compact-view", compact.toString());
  };

  const handleShowStreaksToggle = (show: boolean) => {
    setShowStreaks(show);
    localStorage.setItem("show-streaks", show.toString());
  };

  const handleAutoStartBreaksToggle = (enabled: boolean) => {
    setAutoStartBreaks(enabled);
    updatePreset({ autoStartBreaks: enabled });
  };

  const handleAutoStartWorkToggle = (enabled: boolean) => {
    setAutoStartWork(enabled);
    updatePreset({ autoStartWork: enabled });
  };

  const isDark = settings.theme === "dark";
  const focusModeEnabled = settings.focusModeEnabled ?? false;

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <header>
        <h1 className="text-display-sm">Settings</h1>
        <p className="text-muted-foreground mt-1">Customize your experience</p>
      </header>

      {/* Account */}
      <Link to="/profile">
        <Card className="glass hover:border-primary/30 transition-colors cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-12 h-12 border-2 border-primary/20">
                <AvatarImage src={profile?.avatar_url || undefined} alt="Profile" />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {profile?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{profile?.display_name || "Set up your profile"}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Sign Out */}
      <Card className="glass">
        <CardContent className="p-4">
          <Button variant="outline" onClick={handleSignOut} className="w-full justify-center">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
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

      {/* GitHub */}
      <Card className="glass">
        <CardContent className="p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Github className="w-4 h-4 text-primary" />
            GitHub
          </h3>
          <div>
            <p className="font-medium">Access Token (for editing)</p>
            <p className="text-sm text-muted-foreground mb-2">
              Add a Personal Access Token to edit files in the app. Create one at github.com/settings/tokens with repo scope.
            </p>
            <div className="flex gap-2">
              {accessToken ? (
                <>
                  <div className="flex-1 flex items-center px-3 py-2 rounded-md border bg-secondary/30 text-sm text-muted-foreground">
                    Token configured
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setAccessToken(null)}>
                    Clear
                  </Button>
                </>
              ) : (
                <Input
                  type="password"
                  placeholder="ghp_..."
                  onChange={(e) => setAccessToken(e.target.value || null)}
                  className="font-mono flex-1"
                />
              )}
            </div>
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

      {/* Notifications & Haptics */}
      <Card className="glass">
        <CardContent className="p-6 space-y-6">
          <h3 className="font-semibold flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            Notifications & Feedback
          </h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">Get notified when focus sessions end</p>
              </div>
            </div>
            <Switch checked={notificationsEnabled} onCheckedChange={handleNotificationToggle} />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Vibrate className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">Haptic Feedback</p>
                <p className="text-sm text-muted-foreground">Vibration on button taps</p>
              </div>
            </div>
            <Switch checked={hapticsEnabled} onCheckedChange={handleHapticsToggle} />
          </div>
        </CardContent>
      </Card>

      {/* Focus Timer Settings */}
      <Card className="glass">
        <CardContent className="p-6 space-y-6">
          <h3 className="font-semibold flex items-center gap-2">
            <Timer className="w-4 h-4 text-primary" />
            Focus Timer
          </h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">Auto-start Breaks</p>
                <p className="text-sm text-muted-foreground">Start breaks automatically after work</p>
              </div>
            </div>
            <Switch checked={autoStartBreaks} onCheckedChange={handleAutoStartBreaksToggle} />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">Auto-start Work</p>
                <p className="text-sm text-muted-foreground">Start work automatically after breaks</p>
              </div>
            </div>
            <Switch checked={autoStartWork} onCheckedChange={handleAutoStartWorkToggle} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Default Work Duration</p>
              <p className="text-sm text-muted-foreground">Pomodoro work session length</p>
            </div>
            <Select 
              value={preset.workMinutes.toString()}
              onValueChange={(v) => updatePreset({ workMinutes: parseInt(v) })}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 min</SelectItem>
                <SelectItem value="20">20 min</SelectItem>
                <SelectItem value="25">25 min</SelectItem>
                <SelectItem value="30">30 min</SelectItem>
                <SelectItem value="45">45 min</SelectItem>
                <SelectItem value="50">50 min</SelectItem>
                <SelectItem value="60">60 min</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Display Preferences */}
      <Card className="glass">
        <CardContent className="p-6 space-y-6">
          <h3 className="font-semibold flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            Display Preferences
          </h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">24-Hour Time</p>
                <p className="text-sm text-muted-foreground">Use 24-hour format (14:00 vs 2:00 PM)</p>
              </div>
            </div>
            <Switch checked={use24Hour} onCheckedChange={handleTimeFormatToggle} />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">Compact View</p>
                <p className="text-sm text-muted-foreground">Show more items with less spacing</p>
              </div>
            </div>
            <Switch checked={compactView} onCheckedChange={handleCompactViewToggle} />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-warning" />
              <div>
                <p className="font-medium">Show Streaks</p>
                <p className="text-sm text-muted-foreground">Display streak counters on habits</p>
              </div>
            </div>
            <Switch checked={showStreaks} onCheckedChange={handleShowStreaksToggle} />
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
