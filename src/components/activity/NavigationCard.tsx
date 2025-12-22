import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navigation, MapPin, ExternalLink, Search } from "lucide-react";
import { toast } from "sonner";

interface NavigationCardProps {
  currentPosition: { lat: number; lng: number } | null;
}

export function NavigationCard({ currentPosition }: NavigationCardProps) {
  const [destination, setDestination] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleGetDirections = () => {
    if (!destination.trim()) {
      toast.error("Please enter a destination");
      return;
    }

    const encodedDestination = encodeURIComponent(destination.trim());
    
    // Build Google Maps directions URL
    let mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}`;
    
    if (currentPosition) {
      mapsUrl += `&origin=${currentPosition.lat},${currentPosition.lng}`;
    }
    
    mapsUrl += "&travelmode=walking";

    // Open in new tab
    window.open(mapsUrl, "_blank");
    toast.success("Opening directions in Google Maps");
  };

  const handleOpenInMaps = () => {
    if (!currentPosition) {
      toast.error("Location not available");
      return;
    }

    const mapsUrl = `https://www.google.com/maps?q=${currentPosition.lat},${currentPosition.lng}`;
    window.open(mapsUrl, "_blank");
  };

  const travelModes = [
    { mode: "walking", label: "Walk", icon: "🚶" },
    { mode: "bicycling", label: "Bike", icon: "🚴" },
    { mode: "driving", label: "Drive", icon: "🚗" },
  ];

  const [selectedMode, setSelectedMode] = useState("walking");

  const handleDirectionsWithMode = () => {
    if (!destination.trim()) {
      toast.error("Please enter a destination");
      return;
    }

    const encodedDestination = encodeURIComponent(destination.trim());
    let mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}&travelmode=${selectedMode}`;
    
    if (currentPosition) {
      mapsUrl += `&origin=${currentPosition.lat},${currentPosition.lng}`;
    }

    window.open(mapsUrl, "_blank");
    toast.success(`Opening ${selectedMode} directions`);
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
              <p className="text-sm text-muted-foreground">Getting location...</p>
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
              onKeyDown={(e) => e.key === "Enter" && handleDirectionsWithMode()}
            />
          </div>
        </div>

        {/* Travel Mode Selector */}
        <div className="flex gap-2">
          {travelModes.map(({ mode, label, icon }) => (
            <button
              key={mode}
              onClick={() => setSelectedMode(mode)}
              className={`flex-1 p-2 rounded-lg border text-center transition-all ${
                selectedMode === mode
                  ? "border-primary bg-primary/10"
                  : "border-border/50 hover:border-border"
              }`}
            >
              <span className="text-lg">{icon}</span>
              <p className="text-xs mt-1">{label}</p>
            </button>
          ))}
        </div>

        {/* Get Directions Button */}
        <Button
          onClick={handleDirectionsWithMode}
          className="w-full"
          disabled={!destination.trim()}
        >
          <Navigation className="w-4 h-4 mr-2" />
          Get Directions
        </Button>
      </CardContent>
    </Card>
  );
}
