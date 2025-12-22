import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Send, Loader2, Sparkles, CalendarPlus, Target, Mic, MicOff, Volume2, VolumeX, Play, BookOpen, Timer, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useHabitStore } from "@/store/habitStore";
import { useFocusStore } from "@/store/focusStore";
import { useCalendarStore, EVENT_COLORS } from "@/store/calendarStore";
import { useJournalStore } from "@/store/journalStore";
import { useActivityStore } from "@/store/activityStore";
import { format, subDays, addDays } from "date-fns";
import { calculateStreak, calculateCompletionRate } from "@/lib/utils";
import { toast } from "sonner";
import { HABIT_COLORS } from "@/types";
import { useSpeech } from "@/hooks/useSpeech";
import { useNavigate } from "react-router-dom";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ParsedEvent {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description?: string;
}

interface ParsedHabit {
  name: string;
  description?: string;
  scheduleType?: "daily" | "weekdays" | "customDays" | "timesPerWeek";
  daysOfWeek?: number[];
  timesPerWeek?: number;
  goalType?: "check" | "count";
  goalTarget?: number;
}

interface ParsedFocus {
  duration: number;
  task?: string;
  mode?: "pomodoro" | "timer" | "stopwatch";
}

interface ParsedActivity {
  type: "run" | "walk" | "cycle" | "drive";
}

interface ParsedJournal {
  title: string;
  content: string;
  mood?: string;
  tags?: string[];
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  const { habits, logs, addHabit } = useHabitStore();
  const { sessions, timer, startTimer } = useFocusStore();
  const { events, addEvent } = useCalendarStore();
  const { entries: journalEntries, addEntry } = useJournalStore();
  const { activities, isTracking, startTracking, stopTracking, distanceKm } = useActivityStore();

  // Speech hook for voice input/output
  const { 
    isListening, 
    isSpeaking, 
    isSupported, 
    transcript,
    startListening, 
    stopListening, 
    speak,
    stopSpeaking 
  } = useSpeech({
    onResult: (text) => {
      setInput(text);
    },
  });

  // Auto-send when user stops speaking
  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
      // If we have a transcript, send the message
      if (input.trim()) {
        setTimeout(() => sendMessage(), 100);
      }
    } else {
      setInput("");
      startListening();
    }
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Parse natural language dates like "tomorrow", "next monday", etc.
  const parseNaturalDate = (dateStr: string): string => {
    const today = new Date();
    const lowerDate = dateStr.toLowerCase().trim();
    
    if (lowerDate === "today") {
      return format(today, "yyyy-MM-dd");
    }
    if (lowerDate === "tomorrow") {
      return format(addDays(today, 1), "yyyy-MM-dd");
    }
    if (lowerDate.includes("next")) {
      const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      for (let i = 0; i < days.length; i++) {
        if (lowerDate.includes(days[i])) {
          const currentDay = today.getDay();
          let daysToAdd = (i - currentDay + 7) % 7;
          if (daysToAdd === 0) daysToAdd = 7; // next week if same day
          return format(addDays(today, daysToAdd), "yyyy-MM-dd");
        }
      }
    }
    // Try to parse as YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    // Default to today if unparseable
    return format(today, "yyyy-MM-dd");
  };

  // Extract and execute actions from AI response
  const tryExtractAndExecuteActions = useCallback((content: string) => {
    // Look for JSON blocks in the response
    const jsonMatches = content.matchAll(/```json\s*([\s\S]*?)\s*```/g);
    
    for (const jsonMatch of jsonMatches) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        
        // Handle event creation
        if (parsed.action === "create_event" && parsed.event) {
          const eventData = parsed.event as ParsedEvent;
          
          if (!eventData.title || !eventData.date || !eventData.startTime || !eventData.endTime) {
            continue;
          }

          const parsedDate = parseNaturalDate(eventData.date);
          
          addEvent({
            title: eventData.title,
            date: parsedDate,
            startTime: eventData.startTime,
            endTime: eventData.endTime,
            description: eventData.description || "",
            color: EVENT_COLORS[Math.floor(Math.random() * EVENT_COLORS.length)],
          });

          toast.success(`Event "${eventData.title}" created!`, {
            description: `Scheduled for ${format(new Date(parsedDate), "EEEE, MMMM d")} at ${eventData.startTime}`,
            icon: <CalendarPlus className="w-4 h-4" />,
          });
        }
        
        // Handle habit creation
        if (parsed.action === "create_habit" && parsed.habit) {
          const habitData = parsed.habit as ParsedHabit;
          
          if (!habitData.name) {
            continue;
          }

          const schedule = {
            type: habitData.scheduleType || "daily",
            daysOfWeek: habitData.daysOfWeek,
            timesPerWeek: habitData.timesPerWeek,
          };
          
          addHabit({
            name: habitData.name,
            description: habitData.description || "",
            color: HABIT_COLORS[Math.floor(Math.random() * HABIT_COLORS.length)],
            schedule: schedule as any,
            goalType: habitData.goalType || "check",
            goalTarget: habitData.goalTarget,
          });

          toast.success(`Habit "${habitData.name}" created!`, {
            description: `Schedule: ${habitData.scheduleType || "daily"}`,
            icon: <Target className="w-4 h-4" />,
          });
        }

        // Handle focus session start
        if (parsed.action === "start_focus" && parsed.focus) {
          const focusData = parsed.focus as ParsedFocus;
          
          const duration = focusData.duration ? focusData.duration * 60 : undefined;
          const mode = focusData.mode === "stopwatch" ? "deepFocus" : "pomodoro";
          
          startTimer(mode, focusData.task, duration);
          navigate("/focus");

          toast.success("Focus session started!", {
            description: `${focusData.duration || 25} minute session`,
            icon: <Timer className="w-4 h-4" />,
          });
        }

        // Handle activity tracking
        if (parsed.action === "start_activity" && parsed.activity) {
          const activityData = parsed.activity as ParsedActivity;
          
          if (!isTracking) {
            startTracking(activityData.type);
            navigate("/activity");
            
            toast.success(`Started ${activityData.type}ing!`, {
              description: "GPS tracking is now active",
              icon: <MapPin className="w-4 h-4" />,
            });
          }
        }

        if (parsed.action === "stop_activity") {
          if (isTracking) {
            stopTracking();
            
            toast.success("Activity stopped!", {
              description: `Tracked ${distanceKm.toFixed(2)} km`,
              icon: <MapPin className="w-4 h-4" />,
            });
          }
        }

        // Handle journal creation
        if (parsed.action === "create_journal" && parsed.journal) {
          const journalData = parsed.journal as ParsedJournal;
          
          addEntry({
            title: journalData.title,
            content: journalData.content,
            mood: journalData.mood as any,
            tags: journalData.tags || [],
            date: format(new Date(), "yyyy-MM-dd"),
          });

          toast.success("Journal entry created!", {
            description: journalData.title,
            icon: <BookOpen className="w-4 h-4" />,
          });
        }

        // Handle navigation
        if (parsed.action === "navigate" && parsed.page) {
          navigate(parsed.page);
          toast.success("Navigating...", {
            description: `Going to ${parsed.page.replace("/", "").replace("-", " ") || "home"}`,
          });
        }

        // Handle workout start
        if (parsed.action === "start_workout" && parsed.workout) {
          navigate("/activity");
          // The workout tab will be activated
          toast.success("Opening workouts!", {
            icon: <Play className="w-4 h-4" />,
          });
        }

      } catch (e) {
        console.log("Failed to parse AI action JSON:", e);
      }
    }
  }, [addEvent, addHabit, parseNaturalDate, startTimer, startTracking, stopTracking, isTracking, distanceKm, addEntry, navigate]);
  

  const buildContext = useCallback(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    const last7Days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), i), "yyyy-MM-dd"));
    
    // Habit stats
    const activeHabits = habits.filter(h => !h.archived);
    const habitStats = activeHabits.map(h => ({
      name: h.name,
      streak: calculateStreak(h, logs).current,
      completionRate: calculateCompletionRate(h, logs, 7),
    }));
    
    // Today's events
    const todayEvents = events.filter(e => e.date === today);
    
    // Recent focus sessions
    const recentFocus = sessions.filter(s => last7Days.includes(s.date));
    const totalFocusMinutes = recentFocus.reduce((acc, s) => acc + s.durationMinutes, 0);
    
    // Recent journal entries
    const recentJournal = journalEntries.slice(0, 3);

    // Activity stats
    const totalDistance = activities.reduce((sum, a) => sum + a.distanceKm, 0);
    const totalSteps = activities.reduce((sum, a) => sum + (a.steps || 0), 0);
    const totalCalories = activities.reduce((sum, a) => sum + (a.caloriesBurned || 0), 0);
    
    return {
      today,
      currentlyTracking: isTracking,
      currentTrackingDistance: distanceKm,
      focusTimerRunning: timer.isRunning,
      habits: {
        total: activeHabits.length,
        stats: habitStats,
      },
      todayEvents: todayEvents.map(e => ({
        title: e.title,
        time: `${e.startTime} - ${e.endTime}`,
      })),
      focus: {
        totalMinutesLast7Days: totalFocusMinutes,
        sessionsCount: recentFocus.length,
      },
      activity: {
        totalActivities: activities.length,
        totalDistanceKm: totalDistance,
        totalSteps,
        totalCalories,
        recentActivities: activities.slice(0, 3).map(a => ({
          type: a.type,
          date: a.date,
          distanceKm: a.distanceKm,
        })),
      },
      recentJournalMoods: recentJournal.map(j => j.mood).filter(Boolean),
    };
  }, [habits, logs, events, sessions, journalEntries, activities, isTracking, distanceKm, timer.isRunning]);
  
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    
    let assistantContent = "";
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            context: buildContext(),
          }),
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get response");
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) throw new Error("No reader available");
      
      // Add empty assistant message
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);
      
      let buffer = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const newMessages = [...prev];
                const lastIdx = newMessages.length - 1;
                if (newMessages[lastIdx]?.role === "assistant") {
                  newMessages[lastIdx] = { ...newMessages[lastIdx], content: assistantContent };
                }
                return newMessages;
              });
            }
          } catch {
            // Partial JSON, put back
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // After streaming is complete, try to extract and execute actions
      if (assistantContent) {
        tryExtractAndExecuteActions(assistantContent);
        
        // Speak the response if voice is enabled
        if (voiceEnabled) {
          const cleanedContent = cleanDisplayContent(assistantContent);
          if (cleanedContent) {
            speak(cleanedContent);
          }
        }
      }
    } catch (error) {
      console.error("AI error:", error);
      setMessages(prev => [
        ...prev.filter(m => m.content !== ""),
        { role: "assistant", content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Clean display content (remove JSON blocks for cleaner display)
  const cleanDisplayContent = (content: string): string => {
    return content.replace(/```json\s*[\s\S]*?\s*```/g, "").trim();
  };
  
  return (
    <>
      {/* FAB Button */}
      <motion.button
        className={cn(
          "fixed bottom-28 right-4 md:bottom-6 md:right-6 z-40",
          "w-14 h-14 rounded-full gradient-primary shadow-glow",
          "flex items-center justify-center",
          "hover:scale-110 transition-transform"
        )}
        onClick={() => setIsOpen(true)}
        whileTap={{ scale: 0.95 }}
      >
        <Sparkles className="w-6 h-6 text-primary-foreground" />
      </motion.button>
      
      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Chat Window */}
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.9 }}
              className={cn(
                "fixed z-50 glass-strong rounded-2xl shadow-lg overflow-hidden",
                "bottom-4 right-4 left-4 md:left-auto md:w-[400px] md:right-6 md:bottom-6",
                "max-h-[70vh] md:max-h-[600px] flex flex-col"
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">AI Assistant</h3>
                    <p className="text-xs text-muted-foreground">I can control the entire app</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">
                      I can do anything in the app! Try:
                    </p>
                    <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                      <li>• "Start a 25 min focus session"</li>
                      <li>• "Create a habit to drink water"</li>
                      <li>• "Start tracking my run"</li>
                      <li>• "Schedule lunch tomorrow at noon"</li>
                      <li>• "Write a journal entry about today"</li>
                      <li>• "How are my habits going?"</li>
                      <li>• "Take me to the calendar"</li>
                    </ul>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex",
                        msg.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] px-4 py-2 rounded-2xl",
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-secondary rounded-bl-md"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">
                          {msg.role === "assistant" ? cleanDisplayContent(msg.content) : msg.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                {isLoading && messages[messages.length - 1]?.content === "" && (
                  <div className="flex justify-start">
                    <div className="bg-secondary px-4 py-2 rounded-2xl rounded-bl-md">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Input */}
              <div className="p-4 border-t border-border/50">
                {/* Voice controls */}
                {isSupported && (
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={isListening ? "destructive" : "outline"}
                        onClick={handleVoiceToggle}
                        disabled={isLoading || isSpeaking}
                        className="gap-2"
                      >
                        {isListening ? (
                          <>
                            <MicOff className="w-4 h-4" />
                            Stop
                          </>
                        ) : (
                          <>
                            <Mic className="w-4 h-4" />
                            Speak
                          </>
                        )}
                      </Button>
                      {isListening && (
                        <span className="text-xs text-muted-foreground animate-pulse">
                          Listening...
                        </span>
                      )}
                      {isSpeaking && (
                        <span className="text-xs text-primary animate-pulse">
                          Speaking...
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (isSpeaking) {
                          stopSpeaking();
                        }
                        setVoiceEnabled(!voiceEnabled);
                      }}
                      className="gap-2"
                    >
                      {voiceEnabled ? (
                        <>
                          <Volume2 className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          <VolumeX className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>
                )}
                
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className="flex gap-2"
                >
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask me to do anything..."
                    className="flex-1"
                    disabled={isLoading || isListening}
                  />
                  <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
