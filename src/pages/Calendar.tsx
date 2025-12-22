import { useState, useMemo, useEffect } from "react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addDays, addWeeks, addYears } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronLeft, ChevronRight, Clock, Trash2, Edit3, Bell, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useCalendarStore, CalendarEvent, EVENT_COLORS } from "@/store/calendarStore";
import { scheduleNotification, cancelNotification, requestNotificationPermission } from "@/lib/notifications";

const REMINDER_OPTIONS = [
  { value: 0, label: "At time of event" },
  { value: 5, label: "5 minutes before" },
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 1440, label: "1 day before" },
];

const RECURRENCE_OPTIONS = [
  { value: "none", label: "No repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export default function Calendar() {
  const { events, addEvent, updateEvent, deleteEvent, getEventsByDate } = useCalendarStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [view, setView] = useState<"month" | "week">("month");
  const [isEditing, setIsEditing] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [color, setColor] = useState<string>(EVENT_COLORS[0]);
  const [reminder, setReminder] = useState<number | undefined>(undefined);
  const [recurrenceType, setRecurrenceType] = useState<string>("none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  
  useEffect(() => {
    checkNotificationPermission();
  }, []);
  
  const checkNotificationPermission = async () => {
    if ("Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  };
  
  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotificationsEnabled(granted);
  };
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  
  const weekStart = startOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Generate recurring events for display
  const getEventsWithRecurring = useMemo(() => {
    const allEvents: CalendarEvent[] = [];
    const displayStart = calendarStart;
    const displayEnd = addMonths(calendarEnd, 1);
    
    events.forEach(event => {
      allEvents.push(event);
      
      // Generate recurring instances
      if (event.isRecurring && event.recurrenceType) {
        let currentEventDate = parseISO(event.date);
        const endDate = event.recurrenceEndDate ? parseISO(event.recurrenceEndDate) : displayEnd;
        
        for (let i = 0; i < 100; i++) { // Limit iterations
          switch (event.recurrenceType) {
            case "daily":
              currentEventDate = addDays(currentEventDate, 1);
              break;
            case "weekly":
              currentEventDate = addWeeks(currentEventDate, 1);
              break;
            case "monthly":
              currentEventDate = addMonths(currentEventDate, 1);
              break;
            case "yearly":
              currentEventDate = addYears(currentEventDate, 1);
              break;
          }
          
          if (currentEventDate > endDate || currentEventDate > displayEnd) break;
          
          allEvents.push({
            ...event,
            id: `${event.id}-${format(currentEventDate, "yyyy-MM-dd")}`,
            date: format(currentEventDate, "yyyy-MM-dd"),
            parentEventId: event.id,
          });
        }
      }
    });
    
    return allEvents;
  }, [events, calendarStart, calendarEnd]);
  
  const getEventsForDay = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return getEventsWithRecurring.filter(e => e.date === dateStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };
  
  const selectedDateEvents = useMemo(() => {
    return getEventsWithRecurring.filter(e => e.date === selectedDate)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [getEventsWithRecurring, selectedDate]);
  
  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handlePrevWeek = () => setCurrentDate(addDays(currentDate, -7));
  const handleNextWeek = () => setCurrentDate(addDays(currentDate, 7));
  
  const handleDayClick = (day: Date) => {
    setSelectedDate(format(day, "yyyy-MM-dd"));
  };
  
  const handleNewEvent = () => {
    setTitle("");
    setDescription("");
    setStartTime("09:00");
    setEndTime("10:00");
    setColor(EVENT_COLORS[0]);
    setReminder(undefined);
    setRecurrenceType("none");
    setRecurrenceEndDate("");
    setEditingEvent(null);
    setIsEditing(true);
  };
  
  const handleEditEvent = (event: CalendarEvent) => {
    // Find the original event if this is a recurring instance
    const originalEvent = event.parentEventId 
      ? events.find(e => e.id === event.parentEventId) || event
      : event;
      
    setTitle(originalEvent.title);
    setDescription(originalEvent.description || "");
    setStartTime(originalEvent.startTime);
    setEndTime(originalEvent.endTime);
    setColor(originalEvent.color);
    setReminder(originalEvent.reminder);
    setRecurrenceType(originalEvent.recurrenceType || "none");
    setRecurrenceEndDate(originalEvent.recurrenceEndDate || "");
    setEditingEvent(originalEvent);
    setIsEditing(true);
  };
  
  const handleSave = async () => {
    if (!title.trim()) return;
    
    const isRecurring = recurrenceType !== "none";
    
    const eventData = {
      title,
      description,
      date: selectedDate,
      startTime,
      endTime,
      color,
      reminder,
      isRecurring,
      recurrenceType: isRecurring ? recurrenceType : undefined,
      recurrenceEndDate: isRecurring && recurrenceEndDate ? recurrenceEndDate : undefined,
    };
    
    if (editingEvent) {
      if (editingEvent.notificationId) {
        await cancelNotification(editingEvent.notificationId);
      }
      updateEvent(editingEvent.id, eventData);
      
      if (reminder !== undefined && notificationsEnabled) {
        const notificationId = Date.now();
        const eventDateTime = new Date(`${selectedDate}T${startTime}`);
        eventDateTime.setMinutes(eventDateTime.getMinutes() - reminder);
        
        await scheduleNotification(
          notificationId,
          title,
          `Starting ${reminder === 0 ? "now" : `in ${reminder} minutes`}`,
          eventDateTime
        );
        updateEvent(editingEvent.id, { notificationId });
      }
    } else {
      const newEvent = addEvent(eventData);
      
      if (reminder !== undefined && notificationsEnabled) {
        const notificationId = Date.now();
        const eventDateTime = new Date(`${selectedDate}T${startTime}`);
        eventDateTime.setMinutes(eventDateTime.getMinutes() - reminder);
        
        await scheduleNotification(
          notificationId,
          title,
          `Starting ${reminder === 0 ? "now" : `in ${reminder} minutes`}`,
          eventDateTime
        );
        updateEvent(newEvent.id, { notificationId });
      }
    }
    
    setIsEditing(false);
    setEditingEvent(null);
  };
  
  const handleDeleteEvent = async (event: CalendarEvent) => {
    const eventToDelete = event.parentEventId 
      ? events.find(e => e.id === event.parentEventId)
      : event;
      
    if (eventToDelete) {
      if (eventToDelete.notificationId) {
        await cancelNotification(eventToDelete.notificationId);
      }
      deleteEvent(eventToDelete.id);
    }
  };
  
  const renderMonthView = () => (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-xs text-muted-foreground font-medium py-2">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day) => {
          const isSelected = format(day, "yyyy-MM-dd") === selectedDate;
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const dayEvents = getEventsForDay(day);
          
          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDayClick(day)}
              className={cn(
                "min-h-[60px] sm:min-h-[80px] p-1 rounded-lg flex flex-col items-start text-left transition-all relative",
                isSelected && "bg-primary/10 ring-2 ring-primary",
                !isSelected && isToday && "bg-primary/5",
                !isSelected && !isToday && "hover:bg-secondary",
                !isCurrentMonth && "opacity-40"
              )}
            >
              <span className={cn(
                "text-xs sm:text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full",
                isToday && "bg-primary text-primary-foreground"
              )}>
                {format(day, "d")}
              </span>
              <div className="flex-1 w-full overflow-hidden mt-1 space-y-0.5">
                {dayEvents.slice(0, 2).map((event) => (
                  <div
                    key={event.id}
                    className="text-[10px] sm:text-xs truncate px-1 py-0.5 rounded flex items-center gap-1"
                    style={{ backgroundColor: event.color + "30", color: event.color }}
                  >
                    {event.isRecurring && <Repeat className="w-2 h-2 flex-shrink-0" />}
                    <span className="truncate">{event.title}</span>
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-[10px] text-muted-foreground px-1">
                    +{dayEvents.length - 2} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
  
  const renderWeekView = () => (
    <div className="space-y-2 overflow-x-auto scrollbar-hide -mx-2 px-2">
      <div className="grid grid-cols-7 gap-0.5 min-w-[320px]">
        {weekDays.map((day) => {
          const isSelected = format(day, "yyyy-MM-dd") === selectedDate;
          const isToday = isSameDay(day, new Date());
          const dayEvents = getEventsForDay(day);
          
          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDayClick(day)}
              className={cn(
                "p-1 sm:p-2 rounded-lg flex flex-col items-center transition-all min-h-[100px] sm:min-h-[120px]",
                isSelected && "bg-primary/10 ring-2 ring-primary",
                !isSelected && isToday && "bg-primary/5",
                !isSelected && !isToday && "hover:bg-secondary"
              )}
            >
              <span className="text-[10px] sm:text-xs text-muted-foreground">{format(day, "EEE")}</span>
              <span className={cn(
                "text-sm sm:text-lg font-semibold w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full mt-0.5 sm:mt-1",
                isToday && "bg-primary text-primary-foreground"
              )}>
                {format(day, "d")}
              </span>
              <div className="flex-1 w-full mt-1 sm:mt-2 space-y-0.5 sm:space-y-1 overflow-hidden">
                {dayEvents.slice(0, 2).map((event) => (
                  <div
                    key={event.id}
                    className="text-[8px] sm:text-[10px] truncate px-0.5 sm:px-1.5 py-0.5 rounded flex items-center gap-0.5"
                    style={{ backgroundColor: event.color + "30", color: event.color }}
                  >
                    {event.isRecurring && <Repeat className="w-2 h-2 flex-shrink-0 hidden sm:block" />}
                    <span className="truncate">{event.title}</span>
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-[8px] text-muted-foreground text-center">
                    +{dayEvents.length - 2}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
  
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
          <p className="text-sm text-muted-foreground">Plan your days</p>
        </div>
        <div className="flex items-center gap-2">
          {!notificationsEnabled && (
            <Button variant="outline" size="sm" onClick={handleEnableNotifications}>
              <Bell className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Enable</span>
            </Button>
          )}
          <Button onClick={handleNewEvent} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Event</span>
          </Button>
        </div>
      </div>
      
      {/* Calendar Navigation */}
      <Card className="p-3 sm:p-4 glass">
        <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
          <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={view === "month" ? handlePrevMonth : handlePrevWeek}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="font-semibold text-sm sm:text-lg text-center truncate flex-1">
              {format(currentDate, view === "month" ? "MMMM yyyy" : "'Week of' MMM d")}
            </h2>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={view === "month" ? handleNextMonth : handleNextWeek}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-0.5 shrink-0">
            <Button
              variant={view === "month" ? "default" : "ghost"}
              size="sm"
              className="text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-8"
              onClick={() => setView("month")}
            >
              Month
            </Button>
            <Button
              variant={view === "week" ? "default" : "ghost"}
              size="sm"
              className="text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-8"
              onClick={() => setView("week")}
            >
              Week
            </Button>
          </div>
        </div>
        
        {view === "month" ? renderMonthView() : renderWeekView()}
      </Card>
      
      {/* Selected Date Events */}
      <Card className="p-4 glass">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{format(parseISO(selectedDate), "EEEE, MMMM d")}</h3>
          <Button variant="ghost" size="sm" onClick={handleNewEvent}>
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
        
        <AnimatePresence mode="popLayout">
          {selectedDateEvents.length > 0 ? (
            <div className="space-y-2">
              {selectedDateEvents.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50"
                >
                  <div
                    className="w-1 h-full min-h-[40px] rounded-full flex-shrink-0"
                    style={{ backgroundColor: event.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{event.title}</p>
                      {event.isRecurring && (
                        <Repeat className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Clock className="w-3 h-3" />
                      <span>{event.startTime} - {event.endTime}</span>
                      {event.reminder !== undefined && (
                        <>
                          <Bell className="w-3 h-3 ml-2" />
                          <span className="text-xs">
                            {REMINDER_OPTIONS.find((r) => r.value === event.reminder)?.label}
                          </span>
                        </>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditEvent(event)}>
                      <Edit3 className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteEvent(event)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-muted-foreground"
            >
              <p>No events scheduled</p>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
      
      {/* Event Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "New Event"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Event title"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Start Time</label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">End Time</label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Color</label>
              <div className="flex gap-2 flex-wrap">
                {EVENT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-transform",
                      color === c && "ring-2 ring-offset-2 ring-foreground scale-110"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Repeat</label>
              <Select
                value={recurrenceType}
                onValueChange={setRecurrenceType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No repeat" />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {recurrenceType !== "none" && (
              <div>
                <label className="text-sm font-medium mb-2 block">Repeat Until (optional)</label>
                <Input
                  type="date"
                  value={recurrenceEndDate}
                  onChange={(e) => setRecurrenceEndDate(e.target.value)}
                />
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium mb-2 block">Reminder</label>
              <Select
                value={reminder?.toString() || "none"}
                onValueChange={(v) => setReminder(v === "none" ? undefined : parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No reminder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No reminder</SelectItem>
                  {REMINDER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!notificationsEnabled && reminder !== undefined && (
                <p className="text-xs text-warning mt-1">
                  Enable notifications to receive reminders
                </p>
              )}
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details..."
                rows={3}
              />
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={!title.trim()}>
                Save Event
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
