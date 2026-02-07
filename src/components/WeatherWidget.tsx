import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Cloud, MapPin, RefreshCw, Droplets, Wind } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const WEATHER_CACHE_KEY = "weather-cache";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min

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

function getCachedWeather(): WeatherData | null {
  try {
    const raw = localStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function setCachedWeather(data: WeatherData) {
  try {
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

async function fetchWeatherApi(
  body: { lat?: number; lon?: number; city?: string }
): Promise<WeatherData> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-weather`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    }
  );
  clearTimeout(timeout);

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to fetch weather");
  }
  return res.json();
}

export function WeatherWidget({ compact = false }: WeatherWidgetProps) {
  const queryClient = useQueryClient();
  const [editingCity, setEditingCity] = useState(false);
  const [cityInput, setCityInput] = useState(() => localStorage.getItem("weather-city") || "");
  const [city, setCity] = useState<string | null>(() => localStorage.getItem("weather-city"));

  const { data: weather, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["weather", city ?? "geo"],
    queryFn: async () => {
      let body: { lat?: number; lon?: number; city?: string } = {};

      if (city) {
        body = { city };
      } else if ("geolocation" in navigator) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 3000,
            maximumAge: 5 * 60 * 1000,
            enableHighAccuracy: false,
          });
        });
        body = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      } else {
        body = { city: "New York" };
      }

      const data = await fetchWeatherApi(body);
      setCachedWeather(data);
      return data;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: getCachedWeather,
    retry: 1,
    refetchOnWindowFocus: false,
    enabled: !editingCity,
  });

  const handleSetCity = () => {
    if (cityInput.trim()) {
      const newCity = cityInput.trim();
      localStorage.setItem("weather-city", newCity);
      setCity(newCity);
      setEditingCity(false);
      queryClient.invalidateQueries({ queryKey: ["weather"] });
    }
  };

  const handleUseLocation = () => {
    localStorage.removeItem("weather-city");
    setCity(null);
    setEditingCity(false);
    queryClient.invalidateQueries({ queryKey: ["weather"] });
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        {isLoading ? (
          <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : weather ? (
          <>
            <span className="text-lg">{weather.current.icon}</span>
            <span className="font-medium">{weather.current.temperature}°C</span>
            <span className="text-muted-foreground truncate">{weather.current.description}</span>
          </>
        ) : (
          <span className="text-muted-foreground">Weather unavailable</span>
        )}
      </div>
    );
  }

  return (
    <Card className="glass overflow-hidden hover:shadow-md transition-shadow">
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
        ) : isLoading && !weather ? (
          <WeatherSkeleton />
        ) : error ? (
          <div className="text-center py-4">
            <Cloud className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{error.message}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => setEditingCity(true)}>
              Set location
            </Button>
          </div>
        ) : weather ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{weather.current.icon}</span>
                <div>
                  <p className="text-3xl font-bold tabular-nums">{weather.current.temperature}°C</p>
                  <p className="text-sm text-muted-foreground">{weather.current.description}</p>
                </div>
              </div>
              <div className="flex flex-col gap-1 text-right text-sm text-muted-foreground">
                <p className="flex items-center justify-end gap-1.5"><Droplets className="w-4 h-4" />{weather.current.humidity}%</p>
                <p className="flex items-center justify-end gap-1.5"><Wind className="w-4 h-4" />{weather.current.windSpeed} km/h</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <button
                onClick={() => setEditingCity(true)}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <MapPin className="w-3 h-3" />
                {city || "Current location"}
              </button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={cn("w-3 h-3", isFetching && "animate-spin")} />
              </Button>
            </div>

            <div className="grid grid-cols-5 gap-1 pt-2 border-t border-border/50">
              {weather.forecast.map((day, i) => (
                <div key={day.date} className="text-center p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                  <p className="text-xs text-muted-foreground">
                    {i === 0 ? "Today" : new Date(day.date).toLocaleDateString("en", { weekday: "short" })}
                  </p>
                  <div className="my-2 flex justify-center text-xl">{day.icon}</div>
                  <p className="text-xs font-medium tabular-nums">{day.high}°</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{day.low}°</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function WeatherSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
      <div className="flex justify-between pt-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-6" />
      </div>
      <div className="grid grid-cols-5 gap-1 pt-2 border-t border-border/50">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="text-center p-2 space-y-2">
            <Skeleton className="h-3 w-full mx-auto" />
            <Skeleton className="h-6 w-6 rounded-full mx-auto" />
            <Skeleton className="h-3 w-8 mx-auto" />
            <Skeleton className="h-3 w-6 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
