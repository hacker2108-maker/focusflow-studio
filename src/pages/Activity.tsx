import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useActivityStore, type Activity } from "@/store/activityStore";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Dynamic import for Leaflet (client-side only)
import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const activityTypes = [
  { type: "run" as const, label: "Run", icon: Footprints, color: "#EF4444" },
  { type: "walk" as const, label: "Walk", icon: PersonStanding, color: "#10B981" },
  { type: "cycle" as const, label: "Cycle", icon: Bike, color: "#3B82F6" },
  { type: "drive" as const, label: "Drive", icon: Car, color: "#8B5CF6" },
];

function MapUpdater({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 16);
    }
  }, [center, map]);
  return null;
}

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
  } = useActivityStore();

  const [selectedType, setSelectedType] = useState<Activity["type"]>("run");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);

  // Get current location on mount
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter([position.coords.latitude, position.coords.longitude]);
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
          setMapCenter([position.coords.latitude, position.coords.longitude]);
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
  const activityColor = activityTypes.find((a) => a.type === selectedType)?.color || "#F59E0B";

  // Stats summary
  const totalDistance = activities.reduce((sum, a) => sum + a.distanceKm, 0);
  const totalSteps = activities.reduce((sum, a) => sum + (a.steps || 0), 0);
  const totalCalories = activities.reduce((sum, a) => sum + (a.caloriesBurned || 0), 0);
  const totalDuration = activities.reduce((sum, a) => sum + a.durationMinutes, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-display-sm">Activity</h1>
        <p className="text-muted-foreground mt-1">Track your runs, walks, and more</p>
      </header>

      {/* Map */}
      <Card className="glass overflow-hidden">
        <div className="h-[300px] relative">
          {mapCenter ? (
            <MapContainer
              center={mapCenter}
              zoom={16}
              style={{ height: "100%", width: "100%" }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapUpdater center={mapCenter} />
              {currentPosition ? (
                <Marker position={[currentPosition.lat, currentPosition.lng]} />
              ) : null}
              {routePoints.length > 1 ? (
                <Polyline
                  positions={routePoints.map((p) => [p.lat, p.lng] as [number, number])}
                  color={activityColor}
                  weight={4}
                />
              ) : null}
            </MapContainer>
          ) : (
            <div className="h-full flex items-center justify-center bg-secondary">
              <div className="text-center">
                <MapPin className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Loading map...</p>
              </div>
            </div>
          )}

          {/* Overlay stats while tracking */}
          {isTracking && (
            <div className="absolute top-4 left-4 right-4 flex gap-2">
              <div className="glass-strong rounded-xl px-4 py-2 flex items-center gap-2">
                <Timer className="w-4 h-4 text-primary" />
                <span className="font-mono font-bold">{formatDuration(elapsedTime)}</span>
              </div>
              <div className="glass-strong rounded-xl px-4 py-2 flex items-center gap-2">
                <Route className="w-4 h-4 text-primary" />
                <span className="font-mono font-bold">{distanceKm.toFixed(2)} km</span>
              </div>
              <div className="glass-strong rounded-xl px-4 py-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="font-mono font-bold">{currentSpeed.toFixed(1)} km/h</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Activity Type Selector & Controls */}
      <Card className="glass">
        <CardContent className="p-4">
          <AnimatePresence mode="wait">
            {!isTracking ? (
              <motion.div
                key="selector"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-4 gap-2">
                  {activityTypes.map(({ type, label, icon: Icon, color }) => (
                    <motion.button
                      key={type}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedType(type)}
                      className={cn(
                        "p-4 rounded-xl border transition-all text-center",
                        selectedType === type
                          ? "border-primary bg-primary/10"
                          : "border-border/50 hover:border-border"
                      )}
                    >
                      <Icon
                        className="w-6 h-6 mx-auto mb-2"
                        style={{ color: selectedType === type ? color : undefined }}
                      />
                      <span className="text-sm font-medium">{label}</span>
                    </motion.button>
                  ))}
                </div>

                <Button
                  onClick={handleStart}
                  className="w-full h-14 text-lg gradient-primary text-primary-foreground shadow-glow"
                >
                  <Play className="w-6 h-6 mr-2" />
                  Start {activityTypes.find((a) => a.type === selectedType)?.label}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="tracking"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold font-mono">{formatDuration(elapsedTime)}</p>
                    <p className="text-xs text-muted-foreground">Duration</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold font-mono">{distanceKm.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Kilometers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold font-mono">{currentSpeed.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">km/h</p>
                  </div>
                </div>

                <Button
                  onClick={handleStop}
                  variant="destructive"
                  className="w-full h-14 text-lg"
                >
                  <Square className="w-6 h-6 mr-2" />
                  Stop Activity
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass">
          <CardContent className="p-4 text-center">
            <Footprints className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{totalSteps.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Steps</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 text-center">
            <Route className="w-5 h-5 mx-auto mb-1 text-success" />
            <p className="text-2xl font-bold">{totalDistance.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Total km</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 text-center">
            <Flame className="w-5 h-5 mx-auto mb-1 text-destructive" />
            <p className="text-2xl font-bold">{totalCalories.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Calories</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="p-4 text-center">
            <Timer className="w-5 h-5 mx-auto mb-1 text-warning" />
            <p className="text-2xl font-bold">{Math.floor(totalDuration)}</p>
            <p className="text-xs text-muted-foreground">Minutes</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity History */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">Recent Activities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Route className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No activities yet. Start tracking to see your history!</p>
            </div>
          ) : (
            activities.slice(0, 5).map((activity) => {
              const activityInfo = activityTypes.find((a) => a.type === activity.type);
              const Icon = activityInfo?.icon || Footprints;
              return (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 p-3 rounded-xl bg-secondary/30"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: (activityInfo?.color || "#F59E0B") + "20" }}
                  >
                    <Icon className="w-5 h-5" style={{ color: activityInfo?.color }} />
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
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
