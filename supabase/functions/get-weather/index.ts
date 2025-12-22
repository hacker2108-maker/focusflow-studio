import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lon, city } = await req.json();
    
    let weatherUrl: string;
    
    // Use Open-Meteo free API (no API key required!)
    if (lat && lon) {
      weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
    } else if (city) {
      // First geocode the city
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
      );
      const geoData = await geoResponse.json();
      
      if (!geoData.results || geoData.results.length === 0) {
        return new Response(JSON.stringify({ error: "City not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      const { latitude, longitude, name, country } = geoData.results[0];
      weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
    } else {
      return new Response(JSON.stringify({ error: "Location required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const weatherResponse = await fetch(weatherUrl);
    const weatherData = await weatherResponse.json();

    // Map weather codes to descriptions
    const weatherDescriptions: Record<number, string> = {
      0: "Clear sky",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Foggy",
      48: "Rime fog",
      51: "Light drizzle",
      53: "Moderate drizzle",
      55: "Dense drizzle",
      61: "Slight rain",
      63: "Moderate rain",
      65: "Heavy rain",
      71: "Slight snow",
      73: "Moderate snow",
      75: "Heavy snow",
      77: "Snow grains",
      80: "Slight rain showers",
      81: "Moderate rain showers",
      82: "Violent rain showers",
      85: "Slight snow showers",
      86: "Heavy snow showers",
      95: "Thunderstorm",
      96: "Thunderstorm with hail",
      99: "Thunderstorm with heavy hail",
    };

    const weatherIcons: Record<number, string> = {
      0: "☀️",
      1: "🌤️",
      2: "⛅",
      3: "☁️",
      45: "🌫️",
      48: "🌫️",
      51: "🌧️",
      53: "🌧️",
      55: "🌧️",
      61: "🌧️",
      63: "🌧️",
      65: "🌧️",
      71: "❄️",
      73: "❄️",
      75: "❄️",
      77: "❄️",
      80: "🌦️",
      81: "🌦️",
      82: "⛈️",
      85: "🌨️",
      86: "🌨️",
      95: "⛈️",
      96: "⛈️",
      99: "⛈️",
    };

    const current = weatherData.current;
    const daily = weatherData.daily;

    const result = {
      current: {
        temperature: Math.round(current.temperature_2m),
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
        description: weatherDescriptions[current.weather_code] || "Unknown",
        icon: weatherIcons[current.weather_code] || "🌡️",
      },
      forecast: daily.time.slice(0, 5).map((date: string, i: number) => ({
        date,
        high: Math.round(daily.temperature_2m_max[i]),
        low: Math.round(daily.temperature_2m_min[i]),
        description: weatherDescriptions[daily.weather_code[i]] || "Unknown",
        icon: weatherIcons[daily.weather_code[i]] || "🌡️",
      })),
    };

    console.log("Weather fetched:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Weather error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Failed to fetch weather" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
