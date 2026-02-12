import { useState, useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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
  Route as RouteIcon,
  Volume2,
  VolumeX,
  PersonStanding,
  Bike,
  Car
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface InAppNavigationProps {
  currentPosition: { lat: number; lng: number } | null;
  fullScreen?: boolean;
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
  location: [number, number]; // [lng, lat]
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

// Google Maps-style markers: blue dot for user, red pin for destination
const createCustomIcon = (color: string, isDestination: boolean) => {
  if (isDestination) {
    return L.divIcon({
      className: "custom-marker-gmaps",
      html: `<div style="
        width: 36px;
        height: 36px;
        background: #EA4335;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.35);
      "></div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  }
  return L.divIcon({
    className: "custom-marker-gmaps",
    html: `<div style="
      width: 18px;
      height: 18px;
      background: #4285F4;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
};

// Calculate distance between two points in meters (Haversine formula)
function calculateDistanceMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Voice navigation helper
class VoiceNavigation {
  private synthesis: SpeechSynthesis | null = null;
  private enabled: boolean = true;
  private lastSpokenInstruction: string = "";

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.synthesis = window.speechSynthesis;
      // Chrome: trigger voice list load so getVoices() is populated
      if (this.synthesis.getVoices().length === 0) {
        this.synthesis.addEventListener("voiceschanged", () => {}, { once: true });
      }
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled && this.synthesis) {
      this.synthesis.cancel();
    }
  }

  isEnabled() {
    return this.enabled;
  }

  speak(text: string, force: boolean = false) {
    if (!this.synthesis || !this.enabled) return;
    if (!text || String(text).trim() === "") return;

    // Don't repeat the same instruction unless forced
    if (text === this.lastSpokenInstruction && !force) return;
    this.lastSpokenInstruction = text;

    // Cancel any ongoing speech so the new one is clear
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = "en-US";

    const voices = this.synthesis.getVoices();
    const preferredVoice = voices.find(v =>
      v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Enhanced"))
    ) || voices.find(v => v.lang.startsWith("en")) || voices[0];
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    this.synthesis.speak(utterance);
  }

  speakDistance(meters: number) {
    if (meters < 50) {
      return "now";
    } else if (meters < 100) {
      return "in 50 meters";
    } else if (meters < 200) {
      return "in 100 meters";
    } else if (meters < 500) {
      return `in ${Math.round(meters / 100) * 100} meters`;
    } else if (meters < 1000) {
      return `in ${Math.round(meters / 100) * 100} meters`;
    } else {
      return `in ${(meters / 1000).toFixed(1)} kilometers`;
    }
  }

  announceStep(step: RouteStep, distanceToStep: number) {
    const distanceText = this.speakDistance(distanceToStep);
    let announcement = "";

    if (distanceToStep < 30) {
      // Immediate instruction
      announcement = step.instruction;
    } else if (distanceToStep < 100) {
      // Approaching
      announcement = `${step.instruction}, ${distanceText}`;
    } else {
      // Advance warning
      announcement = `${distanceText}, ${step.instruction}`;
    }

    this.speak(announcement);
  }

  announceArrival() {
    this.speak("You have arrived at your destination.", true);
  }

  announceStart(totalDistance: number, duration: number) {
    const distanceText = totalDistance < 1000 
      ? `${Math.round(totalDistance)} meters`
      : `${(totalDistance / 1000).toFixed(1)} kilometers`;
    const durationMins = Math.round(duration / 60);
    this.speak(`Starting navigation. Your destination is ${distanceText} away, about ${durationMins} minutes.`, true);
  }
}

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

export function InAppNavigation({ currentPosition, fullScreen = false }: InAppNavigationProps) {
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
  const [livePosition, setLivePosition] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceToNextStep, setDistanceToNextStep] = useState<number | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [autoFollow, setAutoFollow] = useState(true);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const originMarkerRef = useRef<L.Marker | null>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gpsWatchRef = useRef<number | null>(null);
  const voiceNavRef = useRef<VoiceNavigation>(new VoiceNavigation());
  const lastAnnouncedDistanceRef = useRef<number>(Infinity);

  const travelModes = [
    { mode: "foot" as const, label: "Walk", icon: PersonStanding },
    { mode: "bike" as const, label: "Bike", icon: Bike },
    { mode: "car" as const, label: "Drive", icon: Car },
  ];

  // Toggle voice
  const toggleVoice = useCallback(() => {
    setVoiceEnabled(prev => {
      const newValue = !prev;
      voiceNavRef.current.setEnabled(newValue);
      toast.success(newValue ? "Voice navigation enabled" : "Voice navigation muted");
      return newValue;
    });
  }, []);

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

    // Google Maps-style tiles (CartoDB Voyager - clean streets, similar to Google Maps)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png", {
      subdomains: "abcd",
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    L.control.zoom({ position: "bottomleft" }).addTo(map);

    // Fix white gap on right when zooming out - recalc map size
    const onMapResize = () => map.invalidateSize();
    map.on("zoomend", onMapResize);
    map.on("moveend", onMapResize);

    // Initial size fix after container is laid out
    requestAnimationFrame(() => map.invalidateSize());

    const onDragStart = () => setAutoFollow(false);
    map.on("dragstart", onDragStart);

    // ResizeObserver: fix white gap when container resizes (sidebar, orientation)
    const ro = mapContainerRef.current && new ResizeObserver(onMapResize);
    if (ro) ro.observe(mapContainerRef.current);

    mapRef.current = map;

    return () => {
      ro?.disconnect();
      map.off("zoomend", onMapResize);
      map.off("moveend", onMapResize);
      map.off("dragstart", onDragStart);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Real-time GPS tracking during navigation
  useEffect(() => {
    if (!isNavigating || !route) {
      if (gpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
        gpsWatchRef.current = null;
      }
      return;
    }

    if ("geolocation" in navigator) {
      gpsWatchRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const newPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setLivePosition(newPos);

          // Update marker position
          if (mapRef.current && originMarkerRef.current) {
            originMarkerRef.current.setLatLng([newPos.lat, newPos.lng]);
            // Keep map centered on user during navigation (while auto-follow is enabled)
            if (autoFollow) {
              mapRef.current.setView([newPos.lat, newPos.lng], mapRef.current.getZoom());
            }
          }
        },
        (error) => {
          console.error("GPS error:", error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 10000,
        }
      );
    }

    return () => {
      if (gpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
        gpsWatchRef.current = null;
      }
    };
  }, [isNavigating, route, autoFollow]);

  // Auto-advance steps based on GPS position
  useEffect(() => {
    if (!isNavigating || !route || !livePosition) return;

    const currentStep = route.steps[currentStepIndex];
    if (!currentStep) return;

    // Calculate distance to current step's location
    const distanceToStep = calculateDistanceMeters(
      livePosition.lat,
      livePosition.lng,
      currentStep.location[1], // lat
      currentStep.location[0]  // lng
    );

    setDistanceToNextStep(distanceToStep);

    // Voice announcements at key distances
    const announcementThresholds = [500, 200, 100, 50, 30];
    for (const threshold of announcementThresholds) {
      if (lastAnnouncedDistanceRef.current > threshold && distanceToStep <= threshold) {
        voiceNavRef.current.announceStep(currentStep, distanceToStep);
        break;
      }
    }
    lastAnnouncedDistanceRef.current = distanceToStep;

    // Auto-advance to next step when within 25 meters
    if (distanceToStep < 25) {
      if (currentStepIndex < route.steps.length - 1) {
        setCurrentStepIndex(prev => prev + 1);
        lastAnnouncedDistanceRef.current = Infinity; // Reset for new step
        
        // Announce the next instruction
        const nextStep = route.steps[currentStepIndex + 1];
        if (nextStep) {
          setTimeout(() => {
            const nextDistance = calculateDistanceMeters(
              livePosition.lat,
              livePosition.lng,
              nextStep.location[1],
              nextStep.location[0]
            );
            voiceNavRef.current.announceStep(nextStep, nextDistance);
          }, 500);
        }
      } else {
        // Arrived at destination
        voiceNavRef.current.announceArrival();
        toast.success("You have arrived at your destination!");
        setIsNavigating(false);
      }
    }
  }, [livePosition, isNavigating, route, currentStepIndex]);

  // Update origin marker when position changes (non-navigating)
  useEffect(() => {
    if (!mapRef.current || !currentPosition || isNavigating) return;

    if (originMarkerRef.current) {
      originMarkerRef.current.setLatLng([currentPosition.lat, currentPosition.lng]);
    } else {
      originMarkerRef.current = L.marker(
        [currentPosition.lat, currentPosition.lng],
        { icon: createCustomIcon("#22c55e") }
      ).addTo(mapRef.current);
    }

    if (!selectedDestination) {
      mapRef.current.setView([currentPosition.lat, currentPosition.lng], 15);
    }
  }, [currentPosition, selectedDestination, isNavigating]);

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
        { icon: createCustomIcon("#EA4335", true) }
      ).addTo(mapRef.current);

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
        color: "#4285F4",
        weight: 5,
        opacity: 0.9,
      }).addTo(mapRef.current);
    }
  }, [route]);

  // Normalize US-style address for better geocoding (e.g. "32 nd" -> "32nd", "sw" -> "SW")
  const normalizeAddressQuery = useCallback((q: string): string => {
    return q
      .trim()
      // Drop apartment / unit numbers which Nominatim often can't match
      // e.g. "APT 405", "Apartment 12", "Unit 3B", "Suite 200", "#405"
      .replace(/\b(apt|apartment|unit|suite|ste|#)\s*\w+\b/gi, "")
      // Collapse ordinals like "32 nd" -> "32nd"
      .replace(/\b(\d+)\s+(nd|st|rd|th)\b/gi, "$1$2")
      // Normalize cardinal directions
      .replace(/\b(n|s|e|w|ne|nw|se|sw)\b/gi, (m) => m.toUpperCase())
      // Normalize common street-type abbreviations (keep abbreviation but normalize casing)
      .replace(/\b(ave|blvd|dr|ln|ct|pl|rd|st|hwy|pkwy|trl)\b/gi, (m) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase())
      // Remove extra commas/spaces
      .replace(/,+/g, ",")
      .replace(/\s+,/g, ",")
      .replace(/,\s+/g, ", ")
      .replace(/\s+/g, " ")
      .trim();
  }, []);

  // Search for addresses (global search so full addresses like "4500 sw 32 nd ave westpark florida" work)
  const searchAddress = useCallback(async (query: string): Promise<SearchResult[] | null> => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setSearchResults([]);
      return null;
    }

    setIsSearching(true);
    try {
      const normalized = normalizeAddressQuery(trimmed);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        normalized
      )}&limit=15&addressdetails=1`;

      const response = await fetch(url, {
        headers: {
          "Accept-Language": "en",
        },
      });
      const data: SearchResult[] = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        setSearchResults([]);
        toast.error("No places found. Try the full address with city and state.");
        return null;
      }

      setSearchResults(data);
      return data;
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search for places. Check your internet connection.");
      return null;
    } finally {
      setIsSearching(false);
    }
  }, [normalizeAddressQuery]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (destination.length >= 3) {
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
          location: step.maneuver.location as [number, number],
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
    setLivePosition(null);
    setDistanceToNextStep(null);
    lastAnnouncedDistanceRef.current = Infinity;
  };

  const handleStartNavigation = () => {
    if (!route) return;
    setIsNavigating(true);
    setAutoFollow(true);
    setCurrentStepIndex(0);
    // Start with a compact UI like Google Maps; user can expand details if needed
    setShowDirections(false);
    setLivePosition(currentPosition);
    lastAnnouncedDistanceRef.current = Infinity;
    
    // Announce start (runs in same user gesture so browser allows speech)
    voiceNavRef.current.announceStart(route.distance, route.duration);

    // Announce first step soon so it's still in user-gesture context (fixes muted voice on some browsers)
    const steps = route.steps;
    const startPos = currentPosition;
    setTimeout(() => {
      if (steps[0] && startPos) {
        const firstStepDist = calculateDistanceMeters(
          startPos.lat,
          startPos.lng,
          steps[0].location[1],
          steps[0].location[0]
        );
        voiceNavRef.current.announceStep(steps[0], firstStepDist);
      }
    }, 600);
    
    // Zoom to the whole route like Google Maps when you tap Start
    if (mapRef.current && route.coordinates.length > 0) {
      const bounds = L.latLngBounds(route.coordinates);
      mapRef.current.fitBounds(bounds, { padding: [80, 80] });
    }

    toast.success("Navigation started!");
  };

  const handleStopNavigation = () => {
    setIsNavigating(false);
    setLivePosition(null);
    setDistanceToNextStep(null);
    lastAnnouncedDistanceRef.current = Infinity;
    toast.success("Navigation ended");
  };

  const handleCenterOnUser = () => {
    const pos = livePosition || currentPosition;
    if (pos && mapRef.current) {
      setAutoFollow(true);
      mapRef.current.setView([pos.lat, pos.lng], 16);
    } else {
      toast.error("Location not available");
    }
  };

  return (
    <div className={cn(
      "relative overflow-hidden w-full font-['Roboto',sans-serif]",
      fullScreen 
        ? "h-full min-h-[400px] rounded-none" 
        : "h-[calc(100vh-280px)] min-h-[400px] rounded-2xl shadow-lg border border-border"
    )}>
      {/* Map container - absolute inset ensures full fill, prevents white gap when zooming */}
      <div ref={mapContainerRef} className="absolute inset-0 h-full w-full min-w-full z-0 bg-[#e5e3df]" />

      {/* Google Maps-style controls - fix gray attribution on right, style zoom */}
      <style>{`
        .leaflet-bottom.leaflet-left { left: 16px !important; bottom: 100px !important; }
        .leaflet-control-zoom { border: none !important; box-shadow: 0 2px 6px rgba(0,0,0,0.3) !important; }
        .leaflet-control-zoom a { background: white !important; color: #5f6368 !important; width: 40px !important; height: 40px !important; line-height: 40px !important; font-size: 18px !important; }
        .leaflet-control-zoom a:hover { background: #f8f9fa !important; }
        .custom-marker-gmaps { background: transparent !important; border: none !important; }
        .leaflet-control-attribution { background: transparent !important; color: #999 !important; font-size: 10px !important; padding: 2px 5px !important; box-shadow: none !important; }
        .leaflet-container, .leaflet-tile-pane { background: #e5e3df !important; }
      `}</style>

      {/* Voice toggle button - Google Maps style */}
      {isNavigating && (
        <button
          onClick={toggleVoice}
          className="absolute bottom-20 right-4 z-[1000] w-11 h-11 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-200"
        >
          {voiceEnabled ? (
            <Volume2 className="w-5 h-5 text-[#5f6368]" />
          ) : (
            <VolumeX className="w-5 h-5 text-[#5f6368]" />
          )}
        </button>
      )}

      {/* Locate button - Google Maps style (white circle with crosshair) */}
      <button
        onClick={handleCenterOnUser}
        className="absolute bottom-4 right-4 z-[1000] w-11 h-11 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-200"
      >
        <LocateFixed className="w-5 h-5 text-[#5f6368]" />
      </button>

      {/* Search bar - Google Maps pill style */}
      <div className="absolute top-4 left-4 right-4 z-[1000]">
        <div className="relative max-w-2xl mx-auto">
          <div className="relative bg-white rounded-full shadow-lg border border-gray-200">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5f6368]" />
            <Input
              placeholder="Search for a place or address"
              value={destination}
              onChange={(e) => {
                const value = e.target.value;
                setDestination(value);
                setSearchResults([]);
                if (selectedDestination) {
                  setSelectedDestination(null);
                  setRoute(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  // Immediate search on Enter; if we get exactly one result, auto-select it
                  searchAddress(destination).then((results) => {
                    if (results && results.length === 1) {
                      handleSelectResult(results[0]);
                    }
                  });
                }
              }}
              className="pl-12 pr-12 h-12 bg-transparent border-0 rounded-full text-base placeholder:text-[#5f6368] focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {(destination || isSearching) && (
              <button
                onClick={handleClearDestination}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100"
              >
                {isSearching ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#5f6368]" />
                ) : (
                  <X className="w-5 h-5 text-[#5f6368]" />
                )}
              </button>
            )}
          </div>

          {/* Search results dropdown - Google Maps style */}
          <AnimatePresence>
            {searchResults.length > 0 && !selectedDestination && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200"
              >
                {searchResults.map((result) => (
                  <button
                    key={result.place_id}
                    onClick={() => handleSelectResult(result)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-start gap-3 border-b border-gray-100 last:border-0 text-left"
                  >
                    <MapPin className="w-5 h-5 text-[#5f6368] mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{result.display_name.split(",")[0]}</p>
                      <p className="text-sm text-[#5f6368] truncate">
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

      {/* Bottom sheet - Google Maps style */}
      <AnimatePresence>
        {selectedDestination && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-[1000]"
          >
            <div className="bg-white rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
              {/* Drag handle - Google Maps style */}
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-300" />
              </div>
              <div className="p-4 space-y-4">
                {/* Route summary - Google Maps style */}
                {route && !isNavigating && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-[#5f6368]" />
                        <span className="font-medium text-gray-900">{formatDuration(route.duration)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <RouteIcon className="w-5 h-5 text-[#5f6368]" />
                        <span className="text-[#5f6368]">{formatDistance(route.distance)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowDirections(!showDirections)}
                      className="p-2 rounded-full hover:bg-gray-100 text-[#5f6368]"
                    >
                      {showDirections ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </button>
                  </div>
                )}

                {/* Travel mode selector - Google Maps horizontal pills */}
                {!isNavigating && (
                  <div className="flex gap-2">
                    {travelModes.map(({ mode, label, icon: Icon }) => (
                      <button
                        key={mode}
                        onClick={() => setSelectedMode(mode)}
                        className={cn(
                          "flex-1 p-3 rounded-lg border text-center transition-all active:scale-[0.98] hover:bg-gray-50",
                          selectedMode === mode
                            ? "border-[#4285F4] bg-[#E8F0FE] text-[#1967D2]"
                            : "border-gray-200 text-gray-700"
                        )}
                      >
                        <Icon className="w-5 h-5 mx-auto" />
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
                      <div className="max-h-48 overflow-y-auto space-y-1 pr-2">
                        {route.steps.map((step, index) => (
                          <div
                            key={index}
                            className={cn(
                              "flex items-start gap-3 p-3 rounded-lg transition-colors",
                              isNavigating && index === currentStepIndex
                                ? "bg-[#E8F0FE]"
                                : index < currentStepIndex
                                ? "bg-gray-50 opacity-70"
                                : "bg-gray-50"
                            )}
                          >
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                              isNavigating && index === currentStepIndex
                                ? "bg-[#4285F4] text-white"
                                : "bg-gray-300 text-gray-600"
                            )}>
                              {getManeuverIcon(step.maneuver)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-gray-900">{step.instruction}</p>
                              <p className="text-xs text-[#5f6368]">
                                {isNavigating && index === currentStepIndex && distanceToNextStep !== null
                                  ? `${formatDistance(distanceToNextStep)} away`
                                  : `${formatDistance(step.distance)} · ${formatDuration(step.duration)}`
                                }
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action buttons - Google Maps style */}
                <div className="flex gap-3">
                  <button
                    onClick={isNavigating ? handleStopNavigation : handleClearDestination}
                    className="flex-1 h-12 rounded-lg border border-gray-300 bg-white font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {isNavigating ? "End" : "Cancel"}
                  </button>
                  {!isNavigating ? (
                    <button
                      onClick={handleStartNavigation}
                      disabled={!route || isLoadingRoute}
                      className="flex-1 h-12 rounded-lg bg-[#4285F4] font-medium text-white hover:bg-[#3367D6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isLoadingRoute ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Navigation className="w-5 h-5" />
                      )}
                      {isLoadingRoute ? "Getting route..." : "Start"}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (route && route.steps[currentStepIndex] && livePosition) {
                          const dist = calculateDistanceMeters(
                            livePosition.lat,
                            livePosition.lng,
                            route.steps[currentStepIndex].location[1],
                            route.steps[currentStepIndex].location[0]
                          );
                          voiceNavRef.current.announceStep(route.steps[currentStepIndex], dist);
                        }
                      }}
                      className="flex-1 h-12 rounded-lg border border-gray-300 bg-white font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Volume2 className="w-5 h-5" />
                      Repeat
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimal next-turn strip - like Google Maps (no big card) */}
      <AnimatePresence>
        {isNavigating && route && route.steps[currentStepIndex] && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-20 left-4 right-4 z-[1000]"
          >
            <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-full shadow-md border border-gray-200/80 py-2 pl-3 pr-4 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#E8F0FE] flex items-center justify-center text-[#4285F4] flex-shrink-0">
                {getManeuverIcon(route.steps[currentStepIndex].maneuver)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{route.steps[currentStepIndex].instruction}</p>
                <p className="text-xs text-[#5f6368]">
                  {distanceToNextStep !== null
                    ? `${formatDistance(distanceToNextStep)} away`
                    : formatDistance(route.steps[currentStepIndex].distance)}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
