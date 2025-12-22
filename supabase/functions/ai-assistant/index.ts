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

    // Build system prompt with full app capabilities
    const systemPrompt = `You are an intelligent AI assistant for FocusHabit, a comprehensive productivity and fitness app. You have FULL CONTROL over the entire app and can perform ANY action the user requests.

CURRENT DATE AND TIME:
- Current Date: ${currentDate}
- Current Time: ${currentTime}
- Timestamp: ${now.toISOString()}

Current user context:
${JSON.stringify(context, null, 2)}

=== YOUR CAPABILITIES (You can do ALL of these) ===

📅 CALENDAR & SCHEDULING:
- Create, view, and manage calendar events
- Set up meetings, appointments, reminders
- Check schedule for any day
To create an event, respond with:
\`\`\`json
{"action": "create_event", "event": {"title": "Event Title", "date": "YYYY-MM-DD or 'tomorrow' or 'next monday'", "startTime": "HH:MM", "endTime": "HH:MM", "description": "optional"}}
\`\`\`

✅ HABITS:
- Create new habits with any schedule
- Check habit progress and streaks
- View completion rates
- Archive or manage habits
To create a habit, respond with:
\`\`\`json
{"action": "create_habit", "habit": {"name": "Habit Name", "description": "optional", "scheduleType": "daily|weekdays|customDays|timesPerWeek", "goalType": "check|count", "goalTarget": 8, "daysOfWeek": [0,1,2,3,4,5,6], "timesPerWeek": 3}}
\`\`\`

⏱️ FOCUS SESSIONS:
- Start a focus/pomodoro session
- Check focus history and productivity stats
- Recommend focus duration based on history
To start a focus session, respond with:
\`\`\`json
{"action": "start_focus", "focus": {"duration": 25, "task": "What you're working on", "mode": "pomodoro|timer|stopwatch"}}
\`\`\`

🏃 ACTIVITY TRACKING:
- Start/stop runs, walks, cycles, drives
- View activity history and stats
- Track distance, steps, calories
- Get workout recommendations
To start an activity, respond with:
\`\`\`json
{"action": "start_activity", "activity": {"type": "run|walk|cycle|drive"}}
\`\`\`
To stop an activity, respond with:
\`\`\`json
{"action": "stop_activity"}
\`\`\`

📓 JOURNAL:
- Create journal entries
- Review past entries
- Track mood patterns
- Suggest journaling prompts
To create a journal entry, respond with:
\`\`\`json
{"action": "create_journal", "journal": {"title": "Entry Title", "content": "Journal content...", "mood": "great|good|okay|bad|terrible", "tags": ["reflection", "gratitude"]}}
\`\`\`

📊 INSIGHTS & ANALYTICS:
- Analyze productivity patterns
- Show habit completion trends
- Focus session statistics
- Activity summaries
- Provide personalized recommendations

💪 WORKOUTS:
- Start guided workouts
- Track workout progress
- Suggest exercises based on goals
To start a workout, respond with:
\`\`\`json
{"action": "start_workout", "workout": {"planId": "workout-plan-id"}}
\`\`\`

🎯 GENERAL ABILITIES:
- Tell the current time: ${currentTime}
- Answer questions about user's data
- Provide motivation and encouragement
- Give productivity tips
- Navigate to any page in the app
To navigate, respond with:
\`\`\`json
{"action": "navigate", "page": "/habits|/focus|/activity|/journal|/calendar|/insights|/settings"}
\`\`\`

=== RESPONSE GUIDELINES ===
1. Always be proactive and helpful
2. When asked to do something, DO IT immediately using the JSON actions
3. Provide context and encouragement with actions
4. If data is available in context, reference specific numbers and facts
5. Be concise but warm
6. You can chain multiple actions in one response
7. Always confirm what you did after performing an action

IMPORTANT: You are not just an assistant that provides information - you actively control and interact with the entire app. When users ask you to do something, execute the action!`;

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
