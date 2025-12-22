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
    const { messages, context, action } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Get current time in user's timezone (or default to UTC)
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

Be helpful, concise, and encouraging. Provide specific insights based on their data when relevant. If they ask about weather, give helpful information. If they ask about their schedule or habits, reference their actual data.`;

    console.log("AI request with context:", context);
    console.log("Current time:", currentTime, "Current date:", currentDate);

    // Use Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: systemPrompt }]
            },
            ...messages.map((msg: { role: string; content: string }) => ({
              role: msg.role === "assistant" ? "model" : "user",
              parts: [{ text: msg.content }]
            }))
          ],
          generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gemini streaming returns NDJSON, convert to SSE format for frontend compatibility
    const reader = response.body?.getReader();
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        if (!reader) {
          controller.close();
          return;
        }
        
        const decoder = new TextDecoder();
        let buffer = "";
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            // Parse Gemini streaming response
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            
            for (const line of lines) {
              if (line.trim() === "" || line.startsWith("[") || line.startsWith("]") || line === ",") continue;
              
              try {
                // Remove leading comma if present
                const cleanLine = line.startsWith(",") ? line.substring(1) : line;
                if (!cleanLine.trim()) continue;
                
                const parsed = JSON.parse(cleanLine);
                const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                
                if (text) {
                  // Convert to OpenAI-style SSE format for frontend compatibility
                  const sseData = {
                    choices: [{
                      delta: { content: text }
                    }]
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(sseData)}\n\n`));
                }
              } catch (e) {
                // Partial JSON, continue
              }
            }
          }
          
          // Process remaining buffer
          if (buffer.trim()) {
            try {
              const cleanBuffer = buffer.startsWith(",") ? buffer.substring(1) : buffer;
              const parsed = JSON.parse(cleanBuffer);
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                const sseData = {
                  choices: [{
                    delta: { content: text }
                  }]
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(sseData)}\n\n`));
              }
            } catch (e) {
              // Ignore
            }
          }
          
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
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
