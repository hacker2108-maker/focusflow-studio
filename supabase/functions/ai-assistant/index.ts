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
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get current time
    const now = new Date();
    const currentTime = now.toLocaleTimeString("en-US", { 
      hour: "2-digit", 
      minute: "2-digit",
      hour12: true 
    });
    const currentDate = now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    // Build system prompt with app context and time awareness
    const systemPrompt = `You are an intelligent AI assistant for FocusHabit, a productivity app that helps users track habits, manage focus sessions, journal, and organize their calendar.

CURRENT DATE AND TIME:
- Current Date: ${currentDate}
- Current Time: ${currentTime}
- Timestamp: ${now.toISOString()}

You have access to the user's data and can help them with:
- Telling the current time and date
- Weather information and forecasts
- Their calendar events and schedule
- Creating new calendar events/schedules when asked
- Creating new habits when asked
- Their habit tracking progress and streaks
- Focus session history and productivity insights
- Journal entries and mood patterns
- Personalized productivity recommendations

Current user context:
${JSON.stringify(context, null, 2)}

IMPORTANT CAPABILITIES:
1. When the user asks what time it is, tell them: ${currentTime}
2. When asked to create a schedule/event, respond with a JSON block in this format:
   \`\`\`json
   {"action": "create_event", "event": {"title": "Event Title", "date": "YYYY-MM-DD", "startTime": "HH:MM", "endTime": "HH:MM", "description": "optional description"}}
   \`\`\`
3. When asked to create a habit, respond with a JSON block in this format:
   \`\`\`json
   {"action": "create_habit", "habit": {"name": "Habit Name", "description": "optional description", "scheduleType": "daily", "goalType": "check"}}
   \`\`\`
   - scheduleType can be: "daily", "weekdays", "customDays", or "timesPerWeek"
   - goalType can be: "check" (just mark done) or "count" (track a number, like glasses of water)
   - For count habits, include "goalTarget": number (e.g., 8 for 8 glasses of water)
   - For customDays, include "daysOfWeek": [0-6] where 0=Sunday, 1=Monday, etc.
   - For timesPerWeek, include "timesPerWeek": number (1-7)
4. Always be aware of the current time when discussing schedules

Be helpful, concise, and encouraging. Provide specific insights based on their data when relevant.`;

    console.log("AI request with context:", context);
    console.log("Current time:", currentTime, "Current date:", currentDate);

    // Use Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stream the response directly
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI assistant error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
