import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navigation, MapPin, ExternalLink, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface NavigationCardProps {
  currentPosition: { lat: number; lng: number } | null;
}

export function NavigationCard({ currentPosition }: NavigationCardProps) {
  const [destination, setDestination] = useState("");
  const [selectedMode, setSelectedMode] = useState("walking");
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const travelModes = [
    { mode: "walking", label: "Walk", icon: "🚶" },
    { mode: "bicycling", label: "Bike", icon: "🚴" },
    { mode: "driving", label: "Drive", icon: "🚗" },
  ];

  const handleOpenInMaps = () => {
    if (!currentPosition) {
      toast.error("Location not available yet");
      return;
    }

    // Use geo: URI scheme for better mobile support
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Try to open in native maps app
      const geoUrl = `geo:${currentPosition.lat},${currentPosition.lng}?q=${currentPosition.lat},${currentPosition.lng}`;
      window.location.href = geoUrl;
    } else {
      const mapsUrl = `https://www.google.com/maps?q=${currentPosition.lat},${currentPosition.lng}`;
      window.open(mapsUrl, "_blank");
    }
  };

  const handleGetDirections = () => {
    if (!destination.trim()) {
      toast.error("Please enter a destination address");
      return;
    }

    const encodedDestination = encodeURIComponent(destination.trim());
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    let mapsUrl: string;

    if (isMobile) {
      if (isIOS) {
        // Apple Maps URL scheme
        mapsUrl = `maps://maps.apple.com/?daddr=${encodedDestination}&dirflg=${selectedMode === 'driving' ? 'd' : selectedMode === 'walking' ? 'w' : 'b'}`;
        
        if (currentPosition) {
          mapsUrl = `maps://maps.apple.com/?saddr=${currentPosition.lat},${currentPosition.lng}&daddr=${encodedDestination}&dirflg=${selectedMode === 'driving' ? 'd' : selectedMode === 'walking' ? 'w' : 'b'}`;
        }
      } else {
        // Android - use Google Maps intent
        mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}&travelmode=${selectedMode}`;
        
        if (currentPosition) {
          mapsUrl += `&origin=${currentPosition.lat},${currentPosition.lng}`;
        }
      }
    } else {
      // Desktop - use web Google Maps
      mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}&travelmode=${selectedMode}`;
      
      if (currentPosition) {
        mapsUrl += `&origin=${currentPosition.lat},${currentPosition.lng}`;
      }
    }

    // For iOS, try Apple Maps first, fallback to Google Maps
    if (isIOS) {
      // Try to open Apple Maps
      const appleUrl = mapsUrl;
      const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}&travelmode=${selectedMode}${currentPosition ? `&origin=${currentPosition.lat},${currentPosition.lng}` : ''}`;
      
      // Use a timeout to fallback to Google Maps if Apple Maps doesn't open
      const start = Date.now();
      window.location.href = appleUrl;
      
      setTimeout(() => {
        if (Date.now() - start < 2000) {
          window.open(googleUrl, "_blank");
        }
      }, 1500);
    } else {
      window.open(mapsUrl, "_blank");
    }

    toast.success("Opening directions...");
  };

  const handleUseCurrentLocation = () => {
    if (currentPosition) {
      toast.success("Using your current location as starting point");
    } else {
      setIsGettingLocation(true);
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          () => {
            setIsGettingLocation(false);
            toast.success("Location found!");
          },
          (error) => {
            setIsGettingLocation(false);
            toast.error("Could not get your location. Please enable location services.");
          },
          { enableHighAccuracy: true }
        );
      }
    }
  };

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Navigation className="w-5 h-5 text-primary" />
          Get Directions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Location */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/30">
          <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Your location</p>
            {currentPosition ? (
              <p className="text-sm font-medium truncate">
                {currentPosition.lat.toFixed(4)}, {currentPosition.lng.toFixed(4)}
              </p>
            ) : (
              <button 
                onClick={handleUseCurrentLocation}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                {isGettingLocation ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Getting location...
                  </>
                ) : (
                  "Tap to get location"
                )}
              </button>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenInMaps}
            disabled={!currentPosition}
            className="flex-shrink-0"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>

        {/* Destination Input */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Enter destination address..."
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="pl-10"
              onKeyDown={(e) => e.key === "Enter" && handleGetDirections()}
              autoComplete="street-address"
            />
          </div>
        </div>

        {/* Travel Mode Selector */}
        <div className="flex gap-2">
          {travelModes.map(({ mode, label, icon }) => (
            <button
              key={mode}
              onClick={() => setSelectedMode(mode)}
              className={`flex-1 p-3 rounded-xl border text-center transition-all active:scale-95 ${
                selectedMode === mode
                  ? "border-primary bg-primary/10"
                  : "border-border/50 hover:border-border"
              }`}
            >
              <span className="text-xl">{icon}</span>
              <p className="text-xs mt-1 font-medium">{label}</p>
            </button>
          ))}
        </div>

        {/* Get Directions Button */}
        <Button
          onClick={handleGetDirections}
          className="w-full h-12 text-base"
          disabled={!destination.trim()}
        >
          <Navigation className="w-5 h-5 mr-2" />
          Get Directions
        </Button>

        {/* Quick tip for mobile */}
        <p className="text-xs text-center text-muted-foreground">
          Opens in your default maps app
        </p>
      </CardContent>
    </Card>
  );
}
