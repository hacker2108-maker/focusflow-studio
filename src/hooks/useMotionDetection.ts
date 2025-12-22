import { useState, useEffect, useCallback, useRef } from "react";

interface MotionData {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

interface MotionDetectionResult {
  isSupported: boolean;
  isTracking: boolean;
  repCount: number;
  lastMotion: MotionData | null;
  intensity: number;
  startTracking: () => Promise<boolean>;
  stopTracking: () => void;
  resetCount: () => void;
}

export function useMotionDetection(): MotionDetectionResult {
  const [isSupported, setIsSupported] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [repCount, setRepCount] = useState(0);
  const [lastMotion, setLastMotion] = useState<MotionData | null>(null);
  const [intensity, setIntensity] = useState(0);

  const motionHistory = useRef<MotionData[]>([]);
  const lastPeakTime = useRef<number>(0);
  const peakThreshold = useRef<number>(15);
  const minTimeBetweenReps = 400; // ms

  // Check if device motion API is supported
  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      ("DeviceMotionEvent" in window || "ondevicemotion" in window);
    setIsSupported(supported);
  }, []);

  // Detect reps based on acceleration patterns
  const detectRep = useCallback((data: MotionData) => {
    motionHistory.current.push(data);

    // Keep only last 50 samples
    if (motionHistory.current.length > 50) {
      motionHistory.current.shift();
    }

    // Calculate magnitude of acceleration
    const magnitude = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
    setIntensity(Math.min(100, (magnitude / 30) * 100));

    // Detect peak (rep)
    const now = Date.now();
    const timeSinceLastPeak = now - lastPeakTime.current;

    if (magnitude > peakThreshold.current && timeSinceLastPeak > minTimeBetweenReps) {
      lastPeakTime.current = now;
      setRepCount((prev) => prev + 1);

      // Adjust threshold based on detected pattern
      const recentMagnitudes = motionHistory.current.slice(-10).map((m) =>
        Math.sqrt(m.x ** 2 + m.y ** 2 + m.z ** 2)
      );
      const avgMagnitude =
        recentMagnitudes.reduce((a, b) => a + b, 0) / recentMagnitudes.length;
      peakThreshold.current = Math.max(12, avgMagnitude * 1.5);
    }
  }, []);

  const handleMotion = useCallback(
    (event: DeviceMotionEvent) => {
      const { accelerationIncludingGravity } = event;
      if (!accelerationIncludingGravity) return;

      const data: MotionData = {
        x: accelerationIncludingGravity.x || 0,
        y: accelerationIncludingGravity.y || 0,
        z: accelerationIncludingGravity.z || 0,
        timestamp: Date.now(),
      };

      setLastMotion(data);
      detectRep(data);
    },
    [detectRep]
  );

  const startTracking = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    // Request permission on iOS 13+
    if (
      typeof (DeviceMotionEvent as any).requestPermission === "function"
    ) {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission !== "granted") {
          return false;
        }
      } catch (error) {
        console.error("Motion permission error:", error);
        return false;
      }
    }

    window.addEventListener("devicemotion", handleMotion);
    setIsTracking(true);
    setRepCount(0);
    motionHistory.current = [];
    lastPeakTime.current = 0;
    peakThreshold.current = 15;
    return true;
  }, [isSupported, handleMotion]);

  const stopTracking = useCallback(() => {
    window.removeEventListener("devicemotion", handleMotion);
    setIsTracking(false);
    setIntensity(0);
  }, [handleMotion]);

  const resetCount = useCallback(() => {
    setRepCount(0);
    motionHistory.current = [];
    lastPeakTime.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener("devicemotion", handleMotion);
    };
  }, [handleMotion]);

  return {
    isSupported,
    isTracking,
    repCount,
    lastMotion,
    intensity,
    startTracking,
    stopTracking,
    resetCount,
  };
}
