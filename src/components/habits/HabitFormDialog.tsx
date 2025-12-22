import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Dumbbell, Book, Droplets, Moon, Sun, Coffee, Heart, Brain, 
  Footprints, Apple, Pill, Music, Pencil, Code, Languages,
  Flame, Sparkles, Check
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { HABIT_COLORS, DAY_NAMES, type Habit } from "@/types";
import { cn } from "@/lib/utils";

interface HabitFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingHabit: Habit | null;
  onSave: (data: HabitFormData) => void;
}

export interface HabitFormData {
  name: string;
  description?: string;
  color: string;
  icon?: string;
  schedule: {
    type: "daily" | "weekdays" | "customDays" | "timesPerWeek";
    daysOfWeek?: number[];
    timesPerWeek?: number;
  };
  goalType: "check" | "count";
  goalTarget?: number;
}

const HABIT_TEMPLATES = [
  { name: "Exercise", icon: "dumbbell", color: HABIT_COLORS[3], schedule: "daily" },
  { name: "Read", icon: "book", color: HABIT_COLORS[4], schedule: "daily" },
  { name: "Drink Water", icon: "droplets", color: HABIT_COLORS[6], schedule: "daily" },
  { name: "Meditate", icon: "brain", color: HABIT_COLORS[4], schedule: "daily" },
  { name: "Sleep Early", icon: "moon", color: HABIT_COLORS[3], schedule: "daily" },
  { name: "Morning Routine", icon: "sun", color: HABIT_COLORS[0], schedule: "daily" },
] as const;

const ICONS = [
  { id: "dumbbell", icon: Dumbbell, label: "Exercise" },
  { id: "book", icon: Book, label: "Reading" },
  { id: "droplets", icon: Droplets, label: "Water" },
  { id: "moon", icon: Moon, label: "Sleep" },
  { id: "sun", icon: Sun, label: "Morning" },
  { id: "coffee", icon: Coffee, label: "Coffee" },
  { id: "heart", icon: Heart, label: "Health" },
  { id: "brain", icon: Brain, label: "Mind" },
  { id: "footprints", icon: Footprints, label: "Steps" },
  { id: "apple", icon: Apple, label: "Nutrition" },
  { id: "pill", icon: Pill, label: "Medicine" },
  { id: "music", icon: Music, label: "Music" },
  { id: "pencil", icon: Pencil, label: "Writing" },
  { id: "code", icon: Code, label: "Coding" },
  { id: "languages", icon: Languages, label: "Language" },
] as const;

const COLOR_NAMES: Record<string, string> = {
  "#F59E0B": "Amber",
  "#EF4444": "Red",
  "#10B981": "Emerald",
  "#3B82F6": "Blue",
  "#8B5CF6": "Violet",
  "#EC4899": "Pink",
  "#06B6D4": "Cyan",
  "#84CC16": "Lime",
};

const SCHEDULE_OPTIONS = [
  { value: "daily", label: "Every day", desc: "Build a daily routine" },
  { value: "weekdays", label: "Weekdays", desc: "Mon–Fri only" },
  { value: "customDays", label: "Custom days", desc: "Pick specific days" },
  { value: "timesPerWeek", label: "Flexible", desc: "X times per week" },
] as const;

export function HabitFormDialog({ open, onOpenChange, editingHabit, onSave }: HabitFormDialogProps) {
  const [step, setStep] = useState<"template" | "details" | "schedule">(editingHabit ? "details" : "template");
  
  // Form state
  const [name, setName] = useState(editingHabit?.name || "");
  const [description, setDescription] = useState(editingHabit?.description || "");
  const [scheduleType, setScheduleType] = useState<"daily" | "weekdays" | "customDays" | "timesPerWeek">(
    editingHabit?.schedule.type || "daily"
  );
  const [customDays, setCustomDays] = useState<number[]>(editingHabit?.schedule.daysOfWeek || [1, 2, 3, 4, 5]);
  const [timesPerWeek, setTimesPerWeek] = useState(editingHabit?.schedule.timesPerWeek || 3);
  const [color, setColor] = useState<string>(editingHabit?.color || HABIT_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [goalType, setGoalType] = useState<"check" | "count">(editingHabit?.goalType || "check");
  const [goalTarget, setGoalTarget] = useState(editingHabit?.goalTarget || 1);

  const resetForm = () => {
    setStep("template");
    setName("");
    setDescription("");
    setScheduleType("daily");
    setCustomDays([1, 2, 3, 4, 5]);
    setTimesPerWeek(3);
    setColor(HABIT_COLORS[0]);
    setSelectedIcon(null);
    setGoalType("check");
    setGoalTarget(1);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

  const selectTemplate = (template: typeof HABIT_TEMPLATES[number]) => {
    setName(template.name);
    setColor(template.color);
    setSelectedIcon(template.icon);
    setScheduleType(template.schedule as any);
    setStep("details");
  };

  const handleSave = () => {
    if (!name.trim()) return;
    
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      icon: selectedIcon || undefined,
      schedule: {
        type: scheduleType,
        daysOfWeek: scheduleType === "customDays" ? customDays : undefined,
        timesPerWeek: scheduleType === "timesPerWeek" ? timesPerWeek : undefined,
      },
      goalType,
      goalTarget: goalType === "count" ? goalTarget : undefined,
    });
    
    resetForm();
    onOpenChange(false);
  };

  const toggleCustomDay = (day: number) => {
    setCustomDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const getIconComponent = (iconId: string | null) => {
    const found = ICONS.find(i => i.id === iconId);
    return found?.icon || Flame;
  };

  const IconComponent = getIconComponent(selectedIcon);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="glass-strong max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl">
            {editingHabit ? "Edit Habit" : step === "template" ? "New Habit" : step === "details" ? "Habit Details" : "Schedule"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          <AnimatePresence mode="wait">
            {/* Step 1: Template Selection */}
            {step === "template" && !editingHabit && (
              <motion.div
                key="template"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div>
                  <p className="text-sm text-muted-foreground mb-4">Quick start with a template or create from scratch</p>
                  <div className="grid grid-cols-2 gap-3">
                    {HABIT_TEMPLATES.map((template) => {
                      const TIcon = getIconComponent(template.icon);
                      return (
                        <motion.button
                          key={template.name}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => selectTemplate(template)}
                          className="p-4 rounded-xl border border-border/50 bg-secondary/30 hover:bg-secondary/50 transition-colors text-left group"
                        >
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                            style={{ backgroundColor: template.color + "20" }}
                          >
                            <TIcon className="w-5 h-5" style={{ color: template.color }} />
                          </div>
                          <p className="font-medium">{template.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 capitalize">{template.schedule}</p>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full h-12"
                  onClick={() => setStep("details")}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create from scratch
                </Button>
              </motion.div>
            )}

            {/* Step 2: Details */}
            {step === "details" && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: editingHabit ? 0 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Preview Card */}
                <Card className="p-4 border-2 border-dashed border-border/50">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center transition-all"
                      style={{ backgroundColor: color + "20" }}
                    >
                      <IconComponent className="w-6 h-6" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{name || "Habit Name"}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {description || "Add a description..."}
                      </p>
                    </div>
                    <div 
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: color + "20", color }}
                    >
                      {scheduleType === "daily" ? "Daily" : 
                       scheduleType === "weekdays" ? "Weekdays" : 
                       scheduleType === "timesPerWeek" ? `${timesPerWeek}×/week` :
                       `${customDays.length} days`}
                    </div>
                  </div>
                </Card>

                {/* Name */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Name</Label>
                  <Input 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="e.g., Exercise, Read, Meditate" 
                    className="h-12 text-base"
                    autoFocus
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Description (optional)</Label>
                  <Textarea 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    placeholder="Why is this habit important to you?" 
                    className="min-h-[80px] resize-none"
                  />
                </div>

                {/* Icon Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Icon</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {ICONS.map(({ id, icon: Icon }) => (
                      <motion.button
                        key={id}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={() => setSelectedIcon(id)}
                        className={cn(
                          "aspect-square rounded-xl flex items-center justify-center transition-all",
                          selectedIcon === id 
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background" 
                            : "bg-secondary/50 hover:bg-secondary"
                        )}
                        style={selectedIcon === id ? { backgroundColor: color + "20" } : {}}
                      >
                        <Icon 
                          className="w-5 h-5" 
                          style={selectedIcon === id ? { color } : { color: "hsl(var(--muted-foreground))" }}
                        />
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Color Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Color</Label>
                  <div className="flex gap-2">
                    {HABIT_COLORS.map(c => (
                      <motion.button
                        key={c}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={() => setColor(c)}
                        className={cn(
                          "w-10 h-10 rounded-xl transition-all flex items-center justify-center",
                          color === c && "ring-2 ring-offset-2 ring-offset-background ring-primary"
                        )}
                        style={{ backgroundColor: c }}
                      >
                        {color === c && <Check className="w-4 h-4 text-white" />}
                      </motion.button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{COLOR_NAMES[color]}</p>
                </div>

                {/* Goal Type */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Goal Type</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setGoalType("check")}
                      className={cn(
                        "p-4 rounded-xl border text-left transition-all",
                        goalType === "check" 
                          ? "border-primary bg-primary/5" 
                          : "border-border/50 hover:border-border"
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center mb-2">
                        <Check className="w-4 h-4 text-success" />
                      </div>
                      <p className="font-medium text-sm">Check off</p>
                      <p className="text-xs text-muted-foreground">Done or not done</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGoalType("count")}
                      className={cn(
                        "p-4 rounded-xl border text-left transition-all",
                        goalType === "count" 
                          ? "border-primary bg-primary/5" 
                          : "border-border/50 hover:border-border"
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center mb-2 font-bold text-sm text-primary">
                        #
                      </div>
                      <p className="font-medium text-sm">Count</p>
                      <p className="text-xs text-muted-foreground">Track a number</p>
                    </button>
                  </div>
                </div>

                {goalType === "count" && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-2"
                  >
                    <Label className="text-sm font-medium">Daily Target</Label>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setGoalTarget(Math.max(1, goalTarget - 1))}
                      >
                        -
                      </Button>
                      <Input 
                        type="number" 
                        min={1} 
                        value={goalTarget} 
                        onChange={e => setGoalTarget(parseInt(e.target.value) || 1)} 
                        className="w-20 text-center"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setGoalTarget(goalTarget + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Step 3: Schedule */}
            {step === "schedule" && (
              <motion.div
                key="schedule"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-3">
                  {SCHEDULE_OPTIONS.map((option) => (
                    <motion.button
                      key={option.value}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => setScheduleType(option.value)}
                      className={cn(
                        "w-full p-4 rounded-xl border text-left transition-all",
                        scheduleType === option.value 
                          ? "border-primary bg-primary/5" 
                          : "border-border/50 hover:border-border"
                      )}
                    >
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm text-muted-foreground">{option.desc}</p>
                    </motion.button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {scheduleType === "customDays" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      <Label className="text-sm font-medium">Select days</Label>
                      <div className="grid grid-cols-7 gap-2">
                        {DAY_NAMES.map((day, i) => (
                          <motion.button
                            key={day}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={() => toggleCustomDay(i)}
                            className={cn(
                              "aspect-square rounded-xl text-sm font-medium transition-all flex items-center justify-center",
                              customDays.includes(i) 
                                ? "text-primary-foreground shadow-glow" 
                                : "bg-secondary text-muted-foreground hover:text-foreground"
                            )}
                            style={customDays.includes(i) ? { backgroundColor: color } : {}}
                          >
                            {day}
                          </motion.button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        {customDays.length} day{customDays.length !== 1 ? "s" : ""} selected
                      </p>
                    </motion.div>
                  )}

                  {scheduleType === "timesPerWeek" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      <Label className="text-sm font-medium">How many times per week?</Label>
                      <div className="grid grid-cols-7 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                          <motion.button
                            key={n}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={() => setTimesPerWeek(n)}
                            className={cn(
                              "aspect-square rounded-xl text-sm font-bold transition-all flex items-center justify-center",
                              timesPerWeek === n 
                                ? "text-primary-foreground shadow-glow" 
                                : "bg-secondary text-muted-foreground hover:text-foreground"
                            )}
                            style={timesPerWeek === n ? { backgroundColor: color } : {}}
                          >
                            {n}
                          </motion.button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        {timesPerWeek} time{timesPerWeek !== 1 ? "s" : ""} per week, any days you choose
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-border/50 flex gap-3">
          {step !== "template" && !editingHabit && (
            <Button 
              variant="ghost" 
              onClick={() => setStep(step === "schedule" ? "details" : "template")}
            >
              Back
            </Button>
          )}
          <div className="flex-1" />
          {step === "details" && (
            <Button 
              onClick={() => setStep("schedule")}
              disabled={!name.trim()}
              className="gradient-primary text-primary-foreground"
            >
              Next: Schedule
            </Button>
          )}
          {step === "schedule" && (
            <Button 
              onClick={handleSave}
              disabled={!name.trim()}
              className="gradient-primary text-primary-foreground shadow-glow"
            >
              {editingHabit ? "Save Changes" : "Create Habit"}
            </Button>
          )}
          {editingHabit && step === "details" && (
            <Button 
              onClick={() => setStep("schedule")}
              disabled={!name.trim()}
              className="gradient-primary text-primary-foreground"
            >
              Next: Schedule
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
