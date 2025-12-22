import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/integrations/supabase/client";

export interface Activity {
  id: string;
  type: "run" | "walk" | "cycle" | "drive";
  date: string;
  startTime: number;
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

  // Actions
  startTracking: (type: Activity["type"]) => void;
  stopTracking: () => void;
  updatePosition: (lat: number, lng: number) => void;
  addActivity: (activity: Omit<Activity, "id">) => void;
  deleteActivity: (id: string) => void;
  syncWithSupabase: (userId: string) => Promise<void>;
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
  // Average stride length varies by activity
  const strideLength = type === "run" ? 1.2 : 0.75; // meters
  return Math.round((distanceKm * 1000) / strideLength);
};

const estimateCalories = (
  distanceKm: number,
  durationMinutes: number,
  type: Activity["type"]
): number => {
  // MET values for different activities
  const metValues = { run: 9.8, walk: 3.8, cycle: 7.5, drive: 1.5 };
  const met = metValues[type];
  // Assuming 70kg average weight
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

      stopTracking: () => {
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

      deleteActivity: (id) => {
        set((s) => ({
          activities: s.activities.filter((a) => a.id !== id),
        }));
      },

      syncWithSupabase: async (userId) => {
        // For now, activities are stored locally
        // This could be extended to sync with Supabase
        console.log("Activity sync for user:", userId);
      },
    }),
    {
      name: "activity-storage",
      partialize: (state) => ({ activities: state.activities }),
    }
  )
);
