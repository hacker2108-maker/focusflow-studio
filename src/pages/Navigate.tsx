import { useEffect } from "react";
import { useActivityStore } from "@/store/activityStore";
import { InAppNavigation } from "@/components/activity/InAppNavigation";
import { toast } from "sonner";

export default function Navigate() {
  const { currentPosition, updatePosition } = useActivityStore();

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updatePosition(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.error("Could not get your location. Please enable location services.");
        },
        { enableHighAccuracy: true }
      );
    }
  }, [updatePosition]);

  return (
    <div className="fixed inset-0 top-[max(env(safe-area-inset-top),44px)] bottom-[max(4rem,env(safe-area-inset-bottom))] md:bottom-0 left-0 md:left-64 right-0 z-30 bg-white">
      <InAppNavigation currentPosition={currentPosition} fullScreen />
    </div>
  );
}
