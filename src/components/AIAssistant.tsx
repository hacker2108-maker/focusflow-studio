import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Send, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useHabitStore } from "@/store/habitStore";
import { useFocusStore } from "@/store/focusStore";
import { useCalendarStore } from "@/store/calendarStore";
import { useJournalStore } from "@/store/journalStore";
import { format, subDays } from "date-fns";
import { calculateStreak, calculateCompletionRate } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { habits, logs } = useHabitStore();
  const { sessions } = useFocusStore();
  const { events } = useCalendarStore();
  const { entries: journalEntries } = useJournalStore();
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
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
    
    return {
      today,
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
      recentJournalMoods: recentJournal.map(j => j.mood).filter(Boolean),
    };
  }, [habits, logs, events, sessions, journalEntries]);
  
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
  
  return (
    <>
      {/* FAB Button */}
      <motion.button
        className={cn(
          "fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50",
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
                    <p className="text-xs text-muted-foreground">Ask me anything</p>
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
                      Hi! I'm your productivity assistant. Ask me about:
                    </p>
                    <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                      <li>• "What's on my calendar today?"</li>
                      <li>• "How are my habits going?"</li>
                      <li>• "What's the weather like?"</li>
                      <li>• "Give me productivity tips"</li>
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
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
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
                    placeholder="Ask me anything..."
                    className="flex-1"
                    disabled={isLoading}
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
