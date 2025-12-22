import { useState, useEffect } from "react";
import { Cloud, MapPin, RefreshCw, Thermometer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface WeatherData {
  current: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    description: string;
    icon: string;
  };
  forecast: {
    date: string;
    high: number;
    low: number;
    description: string;
    icon: string;
  }[];
}

interface WeatherWidgetProps {
  compact?: boolean;
}

export function WeatherWidget({ compact = false }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState(() => localStorage.getItem("weather-city") || "");
  const [editingCity, setEditingCity] = useState(false);
  const [cityInput, setCityInput] = useState(city);

  const fetchWeather = async (useGeolocation = false) => {
    setLoading(true);
    setError(null);

    try {
      let body: { lat?: number; lon?: number; city?: string } = {};

      if (useGeolocation && "geolocation" in navigator) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        body = { lat: position.coords.latitude, lon: position.coords.longitude };
      } else if (city) {
        body = { city };
      } else {
        // Default to a major city if nothing else
        body = { city: "New York" };
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-weather`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to fetch weather");
      }

      const data = await response.json();
      setWeather(data);
    } catch (err) {
      console.error("Weather error:", err);
      setError(err instanceof Error ? err.message : "Failed to load weather");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (city) {
      fetchWeather();
    } else {
      fetchWeather(true);
    }
  }, [city]);

  const handleSetCity = () => {
    if (cityInput.trim()) {
      localStorage.setItem("weather-city", cityInput.trim());
      setCity(cityInput.trim());
    }
    setEditingCity(false);
  };

  const handleUseLocation = () => {
    localStorage.removeItem("weather-city");
    setCity("");
    fetchWeather(true);
    setEditingCity(false);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        {loading ? (
          <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : weather ? (
          <>
            <span className="text-lg">{weather.current.icon}</span>
            <span className="font-medium">{weather.current.temperature}°C</span>
            <span className="text-muted-foreground">{weather.current.description}</span>
          </>
        ) : (
          <span className="text-muted-foreground">Weather unavailable</span>
        )}
      </div>
    );
  }

  return (
    <Card className="glass overflow-hidden">
      <CardContent className="p-4">
        {editingCity ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                placeholder="Enter city name..."
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleSetCity()}
              />
              <Button size="sm" onClick={handleSetCity}>Set</Button>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={handleUseLocation}>
              <MapPin className="w-4 h-4 mr-2" />
              Use my location
            </Button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <Cloud className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => setEditingCity(true)}>
              Set location
            </Button>
          </div>
        ) : weather ? (
          <div className="space-y-4">
            {/* Current Weather */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{weather.current.icon}</span>
                <div>
                  <p className="text-3xl font-bold">{weather.current.temperature}°C</p>
                  <p className="text-sm text-muted-foreground">{weather.current.description}</p>
                </div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>💧 {weather.current.humidity}%</p>
                <p>💨 {weather.current.windSpeed} km/h</p>
              </div>
            </div>
            
            {/* Location & Refresh */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <button 
                onClick={() => setEditingCity(true)}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <MapPin className="w-3 h-3" />
                {city || "Current location"}
              </button>
              <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => fetchWeather()}>
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
            
            {/* 5-day forecast */}
            <div className="grid grid-cols-5 gap-1 pt-2 border-t border-border/50">
              {weather.forecast.map((day, i) => (
                <div key={day.date} className="text-center">
                  <p className="text-xs text-muted-foreground">
                    {i === 0 ? "Today" : new Date(day.date).toLocaleDateString("en", { weekday: "short" })}
                  </p>
                  <p className="text-lg my-1">{day.icon}</p>
                  <p className="text-xs font-medium">{day.high}°</p>
                  <p className="text-xs text-muted-foreground">{day.low}°</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
