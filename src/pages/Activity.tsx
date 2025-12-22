import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Square,
  MapPin,
  Timer,
  Footprints,
  Flame,
  TrendingUp,
  Route,
  Car,
  PersonStanding,
  Bike,
  Navigation,
  Trophy,
  Zap,
  Target,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useActivityStore, type Activity } from "@/store/activityStore";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ActivityCharts } from "@/components/activity/ActivityCharts";
import { NavigationCard } from "@/components/activity/NavigationCard";
import { AchievementsBadges } from "@/components/activity/AchievementsBadges";
import { SocialLeaderboard } from "@/components/activity/SocialLeaderboard";
import { WorkoutPlans } from "@/components/activity/WorkoutPlans";

const activityTypes = [
  { type: "run" as const, label: "Run", icon: Footprints, color: "#EF4444", gradient: "from-red-500 to-orange-500" },
  { type: "walk" as const, label: "Walk", icon: PersonStanding, color: "#10B981", gradient: "from-emerald-500 to-teal-500" },
  { type: "cycle" as const, label: "Cycle", icon: Bike, color: "#3B82F6", gradient: "from-blue-500 to-cyan-500" },
  { type: "drive" as const, label: "Drive", icon: Car, color: "#8B5CF6", gradient: "from-violet-500 to-purple-500" },
];

function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.floor((minutes % 1) * 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function Activity() {
  const {
    activities,
    isTracking,
    currentPosition,
    routePoints,
    distanceKm,
    startTime,
    startTracking,
    stopTracking,
    updatePosition,
    fetchActivities,
    isLoading,
  } = useActivityStore();

  const [selectedType, setSelectedType] = useState<Activity["type"]>("run");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [activeTab, setActiveTab] = useState("track");

  // Fetch activities from database on mount
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Get current location on mount
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter({ lat: position.coords.latitude, lng: position.coords.longitude });
          updatePosition(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.error("Could not get your location. Please enable location services.");
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Track position while activity is running
  useEffect(() => {
    let watchId: number | null = null;

    if (isTracking && "geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          updatePosition(position.coords.latitude, position.coords.longitude);
          setMapCenter({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        (error) => console.error("Watch position error:", error),
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
      );
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isTracking, updatePosition]);

  // Timer for elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isTracking && startTime) {
      interval = setInterval(() => {
        setElapsedTime((Date.now() - startTime) / 60000);
      }, 1000);
    } else {
      setElapsedTime(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTracking, startTime]);

  const handleStart = () => {
    startTracking(selectedType);
    toast.success(`Started ${selectedType}ing! Let's go!`);
  };

  const handleStop = () => {
    stopTracking();
    toast.success("Activity saved!");
  };

  const currentSpeed = elapsedTime > 0 ? (distanceKm / elapsedTime) * 60 : 0;
  const activityInfo = activityTypes.find((a) => a.type === selectedType);
  const activityColor = activityInfo?.color || "#F59E0B";

  // Stats summary
  const totalDistance = activities.reduce((sum, a) => sum + a.distanceKm, 0);
  const totalSteps = activities.reduce((sum, a) => sum + (a.steps || 0), 0);
  const totalCalories = activities.reduce((sum, a) => sum + (a.caloriesBurned || 0), 0);
  const totalDuration = activities.reduce((sum, a) => sum + a.durationMinutes, 0);
  const totalActivities = activities.length;

  // Weekly goal progress (example: 20km per week)
  const weeklyGoal = 20;
  const weeklyProgress = Math.min((totalDistance / weeklyGoal) * 100, 100);

  // Build OpenStreetMap iframe URL
  const mapUrl = mapCenter
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${mapCenter.lng - 0.01}%2C${mapCenter.lat - 0.01}%2C${mapCenter.lng + 0.01}%2C${mapCenter.lat + 0.01}&layer=mapnik&marker=${mapCenter.lat}%2C${mapCenter.lng}`
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with gradient */}
      <header className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent rounded-3xl blur-3xl -z-10" />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-display-sm bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Activity</h1>
            <p className="text-muted-foreground mt-1">Track your fitness journey</p>
          </div>
          {/* Quick Stats Badge */}
          <div className="flex items-center gap-2 glass rounded-full px-4 py-2">
            <Flame className="w-4 h-4 text-destructive" />
            <span className="text-sm font-semibold">{totalCalories.toLocaleString()} cal</span>
          </div>
        </div>
      </header>

      {/* Weekly Progress Card */}
      <Card className="glass overflow-hidden border-none">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Target className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold">Weekly Goal</p>
                <p className="text-xs text-muted-foreground">{totalDistance.toFixed(1)} / {weeklyGoal} km</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-primary">{Math.round(weeklyProgress)}%</span>
          </div>
          <Progress value={weeklyProgress} className="h-3" />
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
          <TabsList className="inline-flex w-auto min-w-full md:grid md:grid-cols-6 gap-1 bg-secondary/50 p-1">
            <TabsTrigger value="track" className="text-xs px-4 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Play className="w-3 h-3 mr-1.5" />
              Track
            </TabsTrigger>
            <TabsTrigger value="workouts" className="text-xs px-4 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Zap className="w-3 h-3 mr-1.5" />
              Workouts
            </TabsTrigger>
            <TabsTrigger value="navigate" className="text-xs px-4 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Navigation className="w-3 h-3 mr-1.5" />
              Navigate
            </TabsTrigger>
            <TabsTrigger value="stats" className="text-xs px-4 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <TrendingUp className="w-3 h-3 mr-1.5" />
              Stats
            </TabsTrigger>
            <TabsTrigger value="social" className="text-xs px-4 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Footprints className="w-3 h-3 mr-1.5" />
              Social
            </TabsTrigger>
            <TabsTrigger value="achievements" className="text-xs px-4 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Trophy className="w-3 h-3 mr-1.5" />
              Badges
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="track" className="space-y-4 mt-4">
          {/* Map Card */}
          <Card className="glass overflow-hidden border-none shadow-lg">
            <div className="h-[220px] relative">
              {mapUrl ? (
                <iframe
                  src={mapUrl}
                  className="w-full h-full border-0"
                  title="Activity Map"
                  loading="lazy"
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-gradient-to-br from-secondary to-secondary/50">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <MapPin className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                    <p className="text-sm text-muted-foreground">Getting your location...</p>
                  </div>
                </div>
              )}

              {/* Live Stats Overlay */}
              {isTracking && (
                <div className="absolute top-3 left-3 right-3 flex gap-2 flex-wrap">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="glass-strong rounded-xl px-3 py-2 flex items-center gap-2"
                  >
                    <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                    <Timer className="w-4 h-4 text-primary" />
                    <span className="font-mono font-bold text-sm">{formatDuration(elapsedTime)}</span>
                  </motion.div>
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="glass-strong rounded-xl px-3 py-2 flex items-center gap-2"
                  >
                    <Route className="w-4 h-4 text-primary" />
                    <span className="font-mono font-bold text-sm">{distanceKm.toFixed(2)} km</span>
                  </motion.div>
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="glass-strong rounded-xl px-3 py-2 flex items-center gap-2"
                  >
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="font-mono font-bold text-sm">{currentSpeed.toFixed(1)} km/h</span>
                  </motion.div>
                </div>
              )}
            </div>
          </Card>

          {/* Activity Type Selector & Controls */}
          <Card className="glass border-none">
            <CardContent className="p-4">
              <AnimatePresence mode="wait">
                {!isTracking ? (
                  <motion.div
                    key="selector"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-4 gap-3">
                      {activityTypes.map(({ type, label, icon: Icon, color, gradient }) => (
                        <motion.button
                          key={type}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setSelectedType(type)}
                          className={cn(
                            "p-4 rounded-2xl border-2 transition-all text-center relative overflow-hidden",
                            selectedType === type
                              ? "border-primary shadow-lg"
                              : "border-border/30 hover:border-border"
                          )}
                        >
                          {selectedType === type && (
                            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-10", gradient)} />
                          )}
                          <Icon
                            className="w-7 h-7 mx-auto mb-2 relative z-10"
                            style={{ color: selectedType === type ? color : undefined }}
                          />
                          <span className={cn(
                            "text-sm font-medium relative z-10",
                            selectedType === type ? "text-foreground" : "text-muted-foreground"
                          )}>{label}</span>
                        </motion.button>
                      ))}
                    </div>

                    <Button
                      onClick={handleStart}
                      className={cn(
                        "w-full h-14 text-lg font-semibold rounded-2xl shadow-lg",
                        "bg-gradient-to-r",
                        activityInfo?.gradient || "from-primary to-primary/80",
                        "text-white hover:opacity-90 transition-opacity"
                      )}
                    >
                      <Play className="w-6 h-6 mr-2" />
                      Start {activityInfo?.label}
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="tracking"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 rounded-2xl bg-secondary/50">
                        <p className="text-3xl font-bold font-mono">{formatDuration(elapsedTime)}</p>
                        <p className="text-xs text-muted-foreground mt-1">Duration</p>
                      </div>
                      <div className="text-center p-4 rounded-2xl bg-secondary/50">
                        <p className="text-3xl font-bold font-mono">{distanceKm.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground mt-1">Kilometers</p>
                      </div>
                      <div className="text-center p-4 rounded-2xl bg-secondary/50">
                        <p className="text-3xl font-bold font-mono">{currentSpeed.toFixed(1)}</p>
                        <p className="text-xs text-muted-foreground mt-1">km/h</p>
                      </div>
                    </div>

                    <Button
                      onClick={handleStop}
                      variant="destructive"
                      className="w-full h-14 text-lg font-semibold rounded-2xl"
                    >
                      <Square className="w-6 h-6 mr-2" />
                      Stop Activity
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="glass border-none">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Footprints className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalSteps.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Total Steps</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass border-none">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-success/20 to-success/5 flex items-center justify-center">
                    <Route className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalDistance.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">Total km</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass border-none">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-destructive/20 to-destructive/5 flex items-center justify-center">
                    <Flame className="w-6 h-6 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalCalories.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Calories</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass border-none">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-warning/20 to-warning/5 flex items-center justify-center">
                    <Timer className="w-6 h-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{Math.floor(totalDuration)}</p>
                    <p className="text-xs text-muted-foreground">Minutes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity History */}
          <Card className="glass border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                Recent Activities
                <span className="text-xs text-muted-foreground font-normal">{totalActivities} total</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-3">
                    <Route className="w-8 h-8 opacity-50" />
                  </div>
                  <p className="font-medium">No activities yet</p>
                  <p className="text-sm">Start tracking to see your history!</p>
                </div>
              ) : (
                activities.slice(0, 5).map((activity) => {
                  const info = activityTypes.find((a) => a.type === activity.type);
                  const Icon = info?.icon || Footprints;
                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-4 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: (info?.color || "#F59E0B") + "15" }}
                      >
                        <Icon className="w-6 h-6" style={{ color: info?.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium capitalize">{activity.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.date), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{activity.distanceKm.toFixed(2)} km</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDuration(activity.durationMinutes)}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </motion.div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="navigate" className="space-y-4 mt-4">
          {/* Map for Navigation */}
          <Card className="glass overflow-hidden border-none">
            <div className="h-[220px] relative">
              {mapUrl ? (
                <iframe
                  src={mapUrl}
                  className="w-full h-full border-0"
                  title="Navigation Map"
                  loading="lazy"
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-gradient-to-br from-secondary to-secondary/50">
                  <div className="text-center">
                    <MapPin className="w-8 h-8 mx-auto text-muted-foreground mb-2 animate-pulse" />
                    <p className="text-sm text-muted-foreground">Getting your location...</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <NavigationCard currentPosition={currentPosition} />
        </TabsContent>

        <TabsContent value="stats" className="space-y-4 mt-4">
          <ActivityCharts activities={activities} />

          {/* Stats Summary */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="glass border-none">
              <CardContent className="p-4 text-center">
                <Footprints className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{totalSteps.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Steps</p>
              </CardContent>
            </Card>
            <Card className="glass border-none">
              <CardContent className="p-4 text-center">
                <Route className="w-6 h-6 mx-auto mb-2 text-success" />
                <p className="text-2xl font-bold">{totalDistance.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Total km</p>
              </CardContent>
            </Card>
            <Card className="glass border-none">
              <CardContent className="p-4 text-center">
                <Flame className="w-6 h-6 mx-auto mb-2 text-destructive" />
                <p className="text-2xl font-bold">{totalCalories.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Calories</p>
              </CardContent>
            </Card>
            <Card className="glass border-none">
              <CardContent className="p-4 text-center">
                <Timer className="w-6 h-6 mx-auto mb-2 text-warning" />
                <p className="text-2xl font-bold">{Math.floor(totalDuration)}</p>
                <p className="text-xs text-muted-foreground">Minutes</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4 mt-4">
          <AchievementsBadges activities={activities} />
          
          {/* All-time Stats */}
          <Card className="glass border-none">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                All-Time Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-xl bg-secondary/30">
                <p className="text-3xl font-bold">{totalActivities}</p>
                <p className="text-xs text-muted-foreground">Activities</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-secondary/30">
                <p className="text-3xl font-bold">{totalDistance.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Kilometers</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-secondary/30">
                <p className="text-3xl font-bold">{totalSteps.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Steps</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-secondary/30">
                <p className="text-3xl font-bold">{totalCalories.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Calories</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workouts" className="space-y-4 mt-4">
          <WorkoutPlans />
        </TabsContent>

        <TabsContent value="social" className="space-y-4 mt-4">
          <SocialLeaderboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
