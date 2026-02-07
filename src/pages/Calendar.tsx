import { useState, useMemo, useEffect } from "react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, addDays, addWeeks, addYears } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronLeft, ChevronRight, Clock, Trash2, Edit3, Bell, Repeat, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const ROW_HEIGHT = 48;

export default function Calendar() {
  const { events, addEvent, updateEvent, deleteEvent } = useCalendarStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [view, setView] = useState<"month" | "week" | "day">("week");
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
  const dayViewDate = parseISO(selectedDate);

  const getEventsWithRecurring = useMemo(() => {
    const allEvents: CalendarEvent[] = [];
    const displayEnd = addMonths(calendarEnd, 1);

    events.forEach((event) => {
      allEvents.push(event);
      if (event.isRecurring && event.recurrenceType) {
        let currentEventDate = parseISO(event.date);
        const endDate = event.recurrenceEndDate ? parseISO(event.recurrenceEndDate) : displayEnd;
        for (let i = 0; i < 100; i++) {
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
  }, [events, calendarEnd]);

  const getEventsForDay = (dateStr: string) =>
    getEventsWithRecurring
      .filter((e) => e.date === dateStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const selectedDateEvents = useMemo(
    () => getEventsForDay(selectedDate),
    [getEventsWithRecurring, selectedDate]
  );

  const handlePrev = () => {
    if (view === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(addDays(currentDate, -7));
    else setCurrentDate(addDays(currentDate, -1));
  };

  const handleNext = () => {
    if (view === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(addDays(currentDate, 7));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(format(now, "yyyy-MM-dd"));
  };

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
    const originalEvent = event.parentEventId ? events.find((e) => e.id === event.parentEventId) || event : event;
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
    const eventData = {
      title,
      description,
      date: selectedDate,
      startTime,
      endTime,
      color,
      reminder,
      isRecurring: recurrenceType !== "none",
      recurrenceType: recurrenceType !== "none" ? recurrenceType : undefined,
      recurrenceEndDate: recurrenceType !== "none" && recurrenceEndDate ? recurrenceEndDate : undefined,
    };
    if (editingEvent) {
      if (editingEvent.notificationId) await cancelNotification(editingEvent.notificationId);
      await updateEvent(editingEvent.id, eventData);
      if (reminder !== undefined && notificationsEnabled) {
        const notificationId = Date.now();
        const eventDateTime = new Date(`${selectedDate}T${startTime}`);
        eventDateTime.setMinutes(eventDateTime.getMinutes() - reminder);
        await scheduleNotification(notificationId, title, `Starting ${reminder === 0 ? "now" : `in ${reminder} minutes`}`, eventDateTime);
        await updateEvent(editingEvent.id, { notificationId });
      }
    } else {
      const newEvent = await addEvent(eventData);
      if (newEvent && reminder !== undefined && notificationsEnabled) {
        const notificationId = Date.now();
        const eventDateTime = new Date(`${selectedDate}T${startTime}`);
        eventDateTime.setMinutes(eventDateTime.getMinutes() - reminder);
        await scheduleNotification(notificationId, title, `Starting ${reminder === 0 ? "now" : `in ${reminder} minutes`}`, eventDateTime);
        await updateEvent(newEvent.id, { notificationId });
      }
    }
    setIsEditing(false);
    setEditingEvent(null);
  };

  const handleDeleteEvent = async (event: CalendarEvent) => {
    const eventToDelete = event.parentEventId ? events.find((e) => e.id === event.parentEventId) : event;
    if (eventToDelete) {
      if (eventToDelete.notificationId) await cancelNotification(eventToDelete.notificationId);
      await deleteEvent(eventToDelete.id);
    }
  };

  const getDateRangeLabel = () => {
    if (view === "month") return format(currentDate, "MMMM yyyy");
    if (view === "week") return `${format(weekDays[0], "MMM d")} – ${format(weekDays[6], "MMM d, yyyy")}`;
    return format(dayViewDate, "EEEE, MMMM d");
  };

  const renderMonthView = () => (
    <div className="w-full">
      <div className="grid grid-cols-7 border-b border-border">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="px-2 py-3 text-xs font-medium text-muted-foreground text-center">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {calendarDays.map((day) => {
          const isSelected = format(day, "yyyy-MM-dd") === selectedDate;
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = isSameMonth(day, currentDate);
          const dayEvents = getEventsForDay(format(day, "yyyy-MM-dd"));
          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDayClick(day)}
              className={cn(
                "min-h-[80px] sm:min-h-[100px] p-2 border-b border-r border-border/40 text-left transition-colors hover:bg-muted/30",
                isSelected && "bg-primary/10",
                !isSelected && isToday && "bg-primary/5",
                !isCurrentMonth && "bg-muted/20 opacity-50"
              )}
            >
              <span
                className={cn(
                  "inline-flex w-8 h-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                  isToday && "bg-primary text-primary-foreground",
                  isSelected && !isToday && "bg-primary/20 text-primary"
                )}
              >
                {format(day, "d")}
              </span>
              <div className="mt-1 space-y-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((ev) => (
                  <div
                    key={ev.id}
                    className="text-[10px] truncate px-2 py-0.5 rounded-r border-l-2 hover:opacity-90 transition-opacity"
                    style={{ borderColor: ev.color, backgroundColor: `${ev.color}25` }}
                  >
                    {ev.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-muted-foreground px-2 py-0.5">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderWeekView = () => {
    const days = weekDays;
    return (
      <div className="w-full">
        <div className="grid border-b border-border" style={{ gridTemplateColumns: `56px repeat(7, 1fr)` }}>
          <div className="bg-muted/30" />
          {days.map((day) => (
            <div key={day.toISOString()} className="text-center py-3 border-l border-border/50 min-w-0">
              <p className="text-xs font-medium text-muted-foreground">{format(day, "EEE")}</p>
              <p className={cn("text-sm font-semibold", isSameDay(day, new Date()) && "bg-primary text-primary-foreground rounded-full w-7 h-7 inline-flex items-center justify-center")}>
                {format(day, "d")}
              </p>
            </div>
          ))}
        </div>
        <div className="overflow-auto max-h-[55vh] relative">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="grid border-b border-border/40 relative hover:bg-muted/20 transition-colors"
              style={{ gridTemplateColumns: `56px repeat(7, 1fr)`, minHeight: ROW_HEIGHT }}
            >
              <div className="text-xs text-muted-foreground pt-1 pr-2 text-right">
                {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
              </div>
              {days.map((day) => {
                const dayStr = format(day, "yyyy-MM-dd");
                const hourEvents = getEventsForDay(dayStr).filter((ev) => {
                  const [evHour] = ev.startTime.split(":").map(Number);
                  return evHour === hour;
                });
                return (
                  <div
                    key={day.toISOString()}
                    className="border-l border-border/40 relative p-0.5 cursor-pointer"
                    onClick={() => {
                      setSelectedDate(dayStr);
                      setStartTime(`${String(hour).padStart(2, "0")}:00`);
                      setEndTime(`${String(hour + 1).padStart(2, "0")}:00`);
                      handleNewEvent();
                    }}
                  >
                    {hourEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="rounded py-1 px-2 cursor-pointer hover:opacity-90 transition-all overflow-hidden border-l-2"
                        style={{
                          backgroundColor: `${ev.color}25`,
                          borderColor: ev.color,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditEvent(ev);
                        }}
                      >
                        <p className="text-[10px] font-medium truncate">{ev.title}</p>
                        <p className="text-[9px] text-muted-foreground truncate">{ev.startTime} – {ev.endTime}</p>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDayView = () => (
    <div className="w-full">
      <div className="py-4 px-4 border-b border-border bg-muted/20 text-center">
        <p className="text-sm font-medium text-muted-foreground">{format(dayViewDate, "EEEE")}</p>
        <p className="text-lg font-semibold">{format(dayViewDate, "MMMM d, yyyy")}</p>
      </div>
      <div className="overflow-auto max-h-[55vh]">
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="flex border-b border-border/50 min-h-[60px]"
            onClick={() => {
              const [h, m] = [hour, 0];
              setStartTime(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
              setEndTime(`${String(h + 1).padStart(2, "0")}:00`);
              handleNewEvent();
            }}
          >
            <div className="w-16 flex-shrink-0 text-xs text-muted-foreground pt-1 pr-2 text-right">
              {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
            </div>
            <div className="flex-1 border-l border-border/50 relative">
              {selectedDateEvents
                .filter((e) => {
                  const [h] = e.startTime.split(":").map(Number);
                  return h === hour;
                })
                .map((ev) => (
                  <div
                    key={ev.id}
                    className="absolute inset-1 rounded-lg cursor-pointer hover:opacity-90 overflow-hidden"
                    style={{
                      backgroundColor: `${ev.color}25`,
                      borderLeft: `3px solid ${ev.color}`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditEvent(ev);
                    }}
                  >
                    <p className="font-medium text-sm truncate px-2 py-1">{ev.title}</p>
                    <p className="text-xs text-muted-foreground px-2">{ev.startTime} – {ev.endTime}</p>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Google Calendar-style header - minimal, clean */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <CalendarIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">Schedule your days</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!notificationsEnabled && (
            <Button variant="outline" size="sm" onClick={handleEnableNotifications} className="hover:bg-secondary/80">
              <Bell className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Reminders</span>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleToday} className="hover:bg-secondary/80 rounded-full">
            Today
          </Button>
          <Button onClick={handleNewEvent} size="sm" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full shadow-sm">
            <Plus className="w-4 h-4" />
            Create
          </Button>
        </div>
      </div>

      {/* View controls + date navigation - Google style */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-secondary" onClick={handlePrev}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="font-medium text-base min-w-[200px] sm:min-w-[280px] text-center">
            {getDateRangeLabel()}
          </h2>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-secondary" onClick={handleNext}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex rounded-full border border-border overflow-hidden bg-muted/30 p-0.5">
          {(["month", "week", "day"] as const).map((v) => (
            <Button
              key={v}
              variant={view === v ? "default" : "ghost"}
              size="sm"
              className="rounded-full px-4 capitalize text-sm font-medium"
              onClick={() => setView(v)}
            >
              {v}
            </Button>
          ))}
        </div>
      </div>

      {/* Main calendar area - Google-style grid */}
      <div className="min-h-[400px] rounded-xl border border-border overflow-hidden bg-card shadow-sm">
        {view === "month" && renderMonthView()}
        {view === "week" && renderWeekView()}
        {view === "day" && renderDayView()}
      </div>

      {/* Agenda - selected date events */}
      <Card className="p-4 border border-border rounded-xl shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">{format(parseISO(selectedDate), "EEEE, MMMM d")}</h3>
          <Button variant="ghost" size="sm" onClick={handleNewEvent} className="hover:bg-secondary rounded-full">
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
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer"
                >
                  <div className="w-1 h-full min-h-[36px] rounded-full flex-shrink-0" style={{ backgroundColor: event.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{event.title}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Clock className="w-3 h-3" />
                      <span>{event.startTime} – {event.endTime}</span>
                      {event.isRecurring && <Repeat className="w-3 h-3" />}
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{event.description}</p>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8 text-muted-foreground text-sm">
              No events scheduled. Click Create to add one.
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Event Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "Create Event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add title" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Start</label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">End</label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
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
              <Select value={recurrenceType} onValueChange={setRecurrenceType}>
                <SelectTrigger><SelectValue placeholder="Does not repeat" /></SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {recurrenceType !== "none" && (
              <div>
                <label className="text-sm font-medium mb-2 block">Ends (optional)</label>
                <Input type="date" value={recurrenceEndDate} onChange={(e) => setRecurrenceEndDate(e.target.value)} />
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-2 block">Notification</label>
              <Select value={reminder?.toString() || "none"} onValueChange={(v) => setReminder(v === "none" ? undefined : parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="No notification" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No notification</SelectItem>
                  {REMINDER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!notificationsEnabled && reminder !== undefined && (
                <p className="text-xs text-muted-foreground mt-1">Enable reminders to receive notifications</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add description" rows={3} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button className="flex-1 bg-foreground text-background hover:bg-foreground/90" onClick={handleSave} disabled={!title.trim()}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
