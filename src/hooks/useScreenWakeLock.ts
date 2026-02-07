import { useEffect, useRef } from "react";

/**
 * Keeps the screen awake when focus timer is active.
 * Works on mobile PWA and desktop.
 */
export function useScreenWakeLock(active: boolean): void {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;

    const requestLock = async () => {
      try {
        lockRef.current = await (navigator as Navigator & { wakeLock?: { request: (type?: string) => Promise<WakeLockSentinel> } }).wakeLock?.request("screen");
      } catch (err) {
        console.warn("Screen Wake Lock failed:", err);
      }
    };

    void requestLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && active && !lockRef.current) {
        void requestLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      lockRef.current?.release().catch(() => {});
      lockRef.current = null;
    };
  }, [active]);
}
