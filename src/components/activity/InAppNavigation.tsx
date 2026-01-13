import { useState, useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Navigation, 
  MapPin, 
  Search, 
  Loader2, 
  X, 
  ChevronUp,
  ChevronDown,
  LocateFixed,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  CornerUpLeft,
  CornerUpRight,
  MoveUp,
  Milestone,
  Clock,
  Route as RouteIcon
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface InAppNavigationProps {
  currentPosition: { lat: number; lng: number } | null;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
}

interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver: string;
  name: string;
}

interface RouteData {
  distance: number;
  duration: number;
  coordinates: [number, number][];
  steps: RouteStep[];
}

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: 24px;
      height: 24px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

function getManeuverIcon(maneuver: string) {
  const iconClass = "w-5 h-5";
  
  if (maneuver.includes("left") && maneuver.includes("slight")) {
    return <CornerUpLeft className={iconClass} />;
  }
  if (maneuver.includes("right") && maneuver.includes("slight")) {
    return <CornerUpRight className={iconClass} />;
  }
  if (maneuver.includes("left")) {
    return <ArrowLeft className={iconClass} />;
  }
  if (maneuver.includes("right")) {
    return <ArrowRight className={iconClass} />;
  }
  if (maneuver.includes("straight") || maneuver.includes("continue")) {
    return <MoveUp className={iconClass} />;
  }
  if (maneuver.includes("arrive") || maneuver.includes("destination")) {
    return <Milestone className={iconClass} />;
  }
  return <ArrowUp className={iconClass} />;
}

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)} sec`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `${hours} hr ${remainingMins} min`;
}

export function InAppNavigation({ currentPosition }: InAppNavigationProps) {
  const [destination, setDestination] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [selectedMode, setSelectedMode] = useState<"foot" | "bike" | "car">("foot");
  const [route, setRoute] = useState<RouteData | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showDirections, setShowDirections] = useState(false);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const originMarkerRef = useRef<L.Marker | null>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const travelModes = [
    { mode: "foot" as const, label: "Walk", icon: "🚶" },
    { mode: "bike" as const, label: "Bike", icon: "🚴" },
    { mode: "car" as const, label: "Drive", icon: "🚗" },
  ];

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const defaultCenter: [number, number] = currentPosition 
      ? [currentPosition.lat, currentPosition.lng] 
      : [40.7128, -74.006];

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 15,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Add zoom control to bottom left
    L.control.zoom({ position: "bottomleft" }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update origin marker when position changes
  useEffect(() => {
    if (!mapRef.current || !currentPosition) return;

    if (originMarkerRef.current) {
      originMarkerRef.current.setLatLng([currentPosition.lat, currentPosition.lng]);
    } else {
      originMarkerRef.current = L.marker(
        [currentPosition.lat, currentPosition.lng],
        { icon: createCustomIcon("#22c55e") }
      ).addTo(mapRef.current);
    }

    // Center map on user if no destination selected
    if (!selectedDestination) {
      mapRef.current.setView([currentPosition.lat, currentPosition.lng], 15);
    }
  }, [currentPosition, selectedDestination]);

  // Update destination marker
  useEffect(() => {
    if (!mapRef.current) return;

    if (destinationMarkerRef.current) {
      mapRef.current.removeLayer(destinationMarkerRef.current);
      destinationMarkerRef.current = null;
    }

    if (selectedDestination) {
      destinationMarkerRef.current = L.marker(
        [selectedDestination.lat, selectedDestination.lng],
        { icon: createCustomIcon("#ef4444") }
      ).addTo(mapRef.current);

      // Fit bounds to show both markers
      if (currentPosition) {
        const bounds = L.latLngBounds(
          [currentPosition.lat, currentPosition.lng],
          [selectedDestination.lat, selectedDestination.lng]
        );
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      } else {
        mapRef.current.setView([selectedDestination.lat, selectedDestination.lng], 14);
      }
    }
  }, [selectedDestination, currentPosition]);

  // Update route line
  useEffect(() => {
    if (!mapRef.current) return;

    if (routeLineRef.current) {
      mapRef.current.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }

    if (route) {
      routeLineRef.current = L.polyline(route.coordinates, {
        color: "#3b82f6",
        weight: 5,
        opacity: 0.8,
      }).addTo(mapRef.current);
    }
  }, [route]);

  // Search for addresses
  const searchAddress = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search for address");
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (destination.length >= 3 && !selectedDestination) {
      searchTimeoutRef.current = setTimeout(() => {
        searchAddress(destination);
      }, 500);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [destination, searchAddress, selectedDestination]);

  // Get route from OSRM
  const fetchRoute = useCallback(async () => {
    if (!currentPosition || !selectedDestination) return;

    setIsLoadingRoute(true);
    try {
      const profile = selectedMode === "foot" ? "foot" : selectedMode === "bike" ? "bike" : "car";
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/${profile}/${currentPosition.lng},${currentPosition.lat};${selectedDestination.lng},${selectedDestination.lat}?overview=full&geometries=geojson&steps=true`
      );
      const data = await response.json();

      if (data.code === "Ok" && data.routes.length > 0) {
        const routeData = data.routes[0];
        const coordinates = routeData.geometry.coordinates.map(
          (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
        );
        
        const steps: RouteStep[] = routeData.legs[0].steps.map((step: any) => ({
          instruction: step.maneuver.instruction || `Continue on ${step.name || "road"}`,
          distance: step.distance,
          duration: step.duration,
          maneuver: step.maneuver.type + (step.maneuver.modifier ? `-${step.maneuver.modifier}` : ""),
          name: step.name || "Unknown road",
        }));

        setRoute({
          distance: routeData.distance,
          duration: routeData.duration,
          coordinates,
          steps,
        });
      } else {
        toast.error("Could not find a route to this destination");
      }
    } catch (error) {
      console.error("Route error:", error);
      toast.error("Failed to get directions");
    } finally {
      setIsLoadingRoute(false);
    }
  }, [currentPosition, selectedDestination, selectedMode]);

  // Fetch route when destination or mode changes
  useEffect(() => {
    if (selectedDestination && currentPosition) {
      fetchRoute();
    }
  }, [selectedDestination, selectedMode, fetchRoute]);

  const handleSelectResult = (result: SearchResult) => {
    setSelectedDestination({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      name: result.display_name,
    });
    setDestination(result.display_name.split(",")[0]);
    setSearchResults([]);
  };

  const handleClearDestination = () => {
    setDestination("");
    setSelectedDestination(null);
    setRoute(null);
    setSearchResults([]);
    setIsNavigating(false);
    setCurrentStepIndex(0);
    setShowDirections(false);
  };

  const handleStartNavigation = () => {
    if (!route) return;
    setIsNavigating(true);
    setCurrentStepIndex(0);
    setShowDirections(true);
    toast.success("Navigation started!");
  };

  const handleCenterOnUser = () => {
    if (currentPosition && mapRef.current) {
      mapRef.current.setView([currentPosition.lat, currentPosition.lng], 15);
    } else {
      toast.error("Location not available");
    }
  };

  return (
    <div className="relative h-[calc(100vh-280px)] min-h-[400px] rounded-2xl overflow-hidden">
      {/* Map container */}
      <div ref={mapContainerRef} className="h-full w-full z-0" />

      {/* Locate button */}
      <button
        onClick={handleCenterOnUser}
        className="absolute bottom-4 right-4 z-[1000] w-12 h-12 bg-background rounded-full shadow-lg flex items-center justify-center hover:bg-secondary transition-colors"
      >
        <LocateFixed className="w-5 h-5 text-primary" />
      </button>

      {/* Search overlay */}
      <div className="absolute top-4 left-4 right-4 z-[1000]">
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search destination..."
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                if (selectedDestination) {
                  setSelectedDestination(null);
                  setRoute(null);
                }
              }}
              className="pl-12 pr-12 h-14 bg-background/95 backdrop-blur-sm shadow-lg rounded-2xl text-base"
            />
            {(destination || isSearching) && (
              <button
                onClick={handleClearDestination}
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                {isSearching ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : (
                  <X className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            )}
          </div>

          {/* Search results dropdown */}
          <AnimatePresence>
            {searchResults.length > 0 && !selectedDestination && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden"
              >
                {searchResults.map((result) => (
                  <button
                    key={result.place_id}
                    onClick={() => handleSelectResult(result)}
                    className="w-full px-4 py-3 text-left hover:bg-secondary/50 transition-colors flex items-start gap-3 border-b border-border/50 last:border-0"
                  >
                    <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{result.display_name.split(",")[0]}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {result.display_name.split(",").slice(1, 3).join(",")}
                      </p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Route info & controls panel */}
      <AnimatePresence>
        {selectedDestination && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="absolute bottom-0 left-0 right-0 z-[1000]"
          >
            <Card className="rounded-t-3xl rounded-b-none border-0 shadow-2xl bg-background/95 backdrop-blur-sm">
              <CardContent className="p-4 space-y-4">
                {/* Route summary */}
                {route && !isNavigating && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-primary">
                        <Clock className="w-4 h-4" />
                        <span className="font-semibold">{formatDuration(route.duration)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <RouteIcon className="w-4 h-4" />
                        <span>{formatDistance(route.distance)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowDirections(!showDirections)}
                      className="text-muted-foreground"
                    >
                      {showDirections ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </button>
                  </div>
                )}

                {/* Travel mode selector */}
                {!isNavigating && (
                  <div className="flex gap-2">
                    {travelModes.map(({ mode, label, icon }) => (
                      <button
                        key={mode}
                        onClick={() => setSelectedMode(mode)}
                        className={cn(
                          "flex-1 p-3 rounded-xl border text-center transition-all active:scale-95",
                          selectedMode === mode
                            ? "border-primary bg-primary/10"
                            : "border-border/50 hover:border-border"
                        )}
                      >
                        <span className="text-xl">{icon}</span>
                        <p className="text-xs mt-1 font-medium">{label}</p>
                      </button>
                    ))}
                  </div>
                )}

                {/* Directions list */}
                <AnimatePresence>
                  {showDirections && route && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                        {route.steps.map((step, index) => (
                          <div
                            key={index}
                            className={cn(
                              "flex items-start gap-3 p-3 rounded-xl transition-colors",
                              isNavigating && index === currentStepIndex
                                ? "bg-primary/20"
                                : "bg-secondary/30"
                            )}
                          >
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                              isNavigating && index === currentStepIndex
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary"
                            )}>
                              {getManeuverIcon(step.maneuver)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{step.instruction}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDistance(step.distance)} · {formatDuration(step.duration)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleClearDestination}
                    className="flex-1 h-12"
                  >
                    Cancel
                  </Button>
                  {!isNavigating ? (
                    <Button
                      onClick={handleStartNavigation}
                      disabled={!route || isLoadingRoute}
                      className="flex-1 h-12 bg-primary"
                    >
                      {isLoadingRoute ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      ) : (
                        <Navigation className="w-5 h-5 mr-2" />
                      )}
                      {isLoadingRoute ? "Getting route..." : "Start"}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        setIsNavigating(false);
                        toast.success("Navigation ended");
                      }}
                      variant="destructive"
                      className="flex-1 h-12"
                    >
                      End Navigation
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current navigation step overlay */}
      <AnimatePresence>
        {isNavigating && route && route.steps[currentStepIndex] && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 left-4 right-4 z-[1000]"
          >
            <Card className="bg-primary text-primary-foreground shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                    {getManeuverIcon(route.steps[currentStepIndex].maneuver)}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-lg">{route.steps[currentStepIndex].instruction}</p>
                    <p className="text-primary-foreground/80 text-sm">
                      {formatDistance(route.steps[currentStepIndex].distance)}
                    </p>
                  </div>
                </div>
                
                {/* Navigation controls */}
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentStepIndex === 0}
                    onClick={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))}
                    className="flex-1"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentStepIndex === route.steps.length - 1}
                    onClick={() => setCurrentStepIndex(prev => Math.min(route.steps.length - 1, prev + 1))}
                    className="flex-1"
                  >
                    Next
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
