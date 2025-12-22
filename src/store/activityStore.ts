import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/integrations/supabase/client";

export interface Activity {
  id: string;
  type: "run" | "walk" | "cycle" | "drive";
  date: string;
  startTime?: number;
  endTime?: number;
  durationMinutes: number;
  distanceKm: number;
  avgSpeedKmh: number;
  route: { lat: number; lng: number }[];
  steps?: number;
  caloriesBurned?: number;
}

interface ActivityState {
  activities: Activity[];
  currentActivity: Activity | null;
  isTracking: boolean;
  watchId: number | null;
  currentPosition: { lat: number; lng: number } | null;
  routePoints: { lat: number; lng: number }[];
  distanceKm: number;
  startTime: number | null;
  isLoading: boolean;

  // Actions
  startTracking: (type: Activity["type"]) => void;
  stopTracking: () => Promise<void>;
  updatePosition: (lat: number, lng: number) => void;
  addActivity: (activity: Omit<Activity, "id">) => void;
  deleteActivity: (id: string) => Promise<void>;
  fetchActivities: () => Promise<void>;
  saveActivity: (activity: Activity) => Promise<void>;
}

const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const estimateSteps = (distanceKm: number, type: Activity["type"]): number => {
  const strideLength = type === "run" ? 1.2 : 0.75;
  return Math.round((distanceKm * 1000) / strideLength);
};

const estimateCalories = (
  distanceKm: number,
  durationMinutes: number,
  type: Activity["type"]
): number => {
  const metValues = { run: 9.8, walk: 3.8, cycle: 7.5, drive: 1.5 };
  const met = metValues[type];
  return Math.round((met * 70 * durationMinutes) / 60);
};

export const useActivityStore = create<ActivityState>()(
  persist(
    (set, get) => ({
      activities: [],
      currentActivity: null,
      isTracking: false,
      watchId: null,
      currentPosition: null,
      routePoints: [],
      distanceKm: 0,
      startTime: null,
      isLoading: false,

      fetchActivities: async () => {
        set({ isLoading: true });
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            set({ isLoading: false });
            return;
          }

          const { data, error } = await supabase
            .from("activities")
            .select("*")
            .order("created_at", { ascending: false });

          if (error) {
            console.error("Error fetching activities:", error);
            set({ isLoading: false });
            return;
          }

          const activities: Activity[] = (data || []).map((row) => ({
            id: row.id,
            type: row.type as Activity["type"],
            date: row.date,
            durationMinutes: Number(row.duration_minutes),
            distanceKm: Number(row.distance_km),
            avgSpeedKmh: Number(row.avg_speed_kmh || 0),
            route: (row.route_points as { lat: number; lng: number }[]) || [],
            steps: row.steps || 0,
            caloriesBurned: row.calories_burned || 0,
          }));

          set({ activities, isLoading: false });
        } catch (error) {
          console.error("Error fetching activities:", error);
          set({ isLoading: false });
        }
      },

      saveActivity: async (activity: Activity) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { error } = await supabase.from("activities").insert({
            id: activity.id,
            user_id: user.id,
            type: activity.type,
            date: activity.date,
            duration_minutes: activity.durationMinutes,
            distance_km: activity.distanceKm,
            avg_speed_kmh: activity.avgSpeedKmh,
            route_points: activity.route,
            steps: activity.steps || 0,
            calories_burned: activity.caloriesBurned || 0,
          });

          if (error) {
            console.error("Error saving activity:", error);
          }
        } catch (error) {
          console.error("Error saving activity:", error);
        }
      },

      startTracking: (type) => {
        set({
          isTracking: true,
          routePoints: [],
          distanceKm: 0,
          startTime: Date.now(),
          currentActivity: {
            id: crypto.randomUUID(),
            type,
            date: new Date().toISOString().split("T")[0],
            startTime: Date.now(),
            durationMinutes: 0,
            distanceKm: 0,
            avgSpeedKmh: 0,
            route: [],
          },
        });
      },

      stopTracking: async () => {
        const state = get();
        if (state.currentActivity && state.startTime) {
          const endTime = Date.now();
          const durationMinutes = (endTime - state.startTime) / 60000;
          const avgSpeedKmh =
            durationMinutes > 0 ? (state.distanceKm / durationMinutes) * 60 : 0;

          const completedActivity: Activity = {
            ...state.currentActivity,
            endTime,
            durationMinutes,
            distanceKm: state.distanceKm,
            avgSpeedKmh,
            route: state.routePoints,
            steps: estimateSteps(state.distanceKm, state.currentActivity.type),
            caloriesBurned: estimateCalories(
              state.distanceKm,
              durationMinutes,
              state.currentActivity.type
            ),
          };

          // Save to database
          await get().saveActivity(completedActivity);

          set((s) => ({
            activities: [completedActivity, ...s.activities],
            isTracking: false,
            currentActivity: null,
            routePoints: [],
            distanceKm: 0,
            startTime: null,
            watchId: null,
          }));
        }
      },

      updatePosition: (lat, lng) => {
        const state = get();
        const newPoint = { lat, lng };

        if (state.routePoints.length > 0) {
          const lastPoint = state.routePoints[state.routePoints.length - 1];
          const addedDistance = calculateDistance(
            lastPoint.lat,
            lastPoint.lng,
            lat,
            lng
          );
          set((s) => ({
            currentPosition: newPoint,
            routePoints: [...s.routePoints, newPoint],
            distanceKm: s.distanceKm + addedDistance,
          }));
        } else {
          set({
            currentPosition: newPoint,
            routePoints: [newPoint],
          });
        }
      },

      addActivity: (activity) => {
        const newActivity = {
          ...activity,
          id: crypto.randomUUID(),
        };
        set((s) => ({ activities: [newActivity, ...s.activities] }));
      },

      deleteActivity: async (id) => {
        try {
          const { error } = await supabase
            .from("activities")
            .delete()
            .eq("id", id);

          if (error) {
            console.error("Error deleting activity:", error);
          }

          set((s) => ({
            activities: s.activities.filter((a) => a.id !== id),
          }));
        } catch (error) {
          console.error("Error deleting activity:", error);
        }
      },
    }),
    {
      name: "activity-storage",
      partialize: (state) => ({ activities: state.activities }),
    }
  )
);
