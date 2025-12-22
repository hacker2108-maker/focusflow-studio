import { Capacitor } from "@capacitor/core";

type HapticStyle = "light" | "medium" | "heavy" | "success" | "warning" | "error";

export function useHaptics() {
  const isNative = Capacitor.isNativePlatform();

  const vibrate = (style: HapticStyle = "light") => {
    // Use Web Vibration API as fallback
    if ("vibrate" in navigator) {
      const patterns: Record<HapticStyle, number | number[]> = {
        light: 10,
        medium: 25,
        heavy: 50,
        success: [10, 50, 10],
        warning: [25, 50, 25],
        error: [50, 100, 50],
      };
      navigator.vibrate(patterns[style]);
    }
  };

  const impact = (style: "light" | "medium" | "heavy" = "light") => {
    vibrate(style);
  };

  const notification = (type: "success" | "warning" | "error" = "success") => {
    vibrate(type);
  };

  const selection = () => {
    vibrate("light");
  };

  return {
    impact,
    notification,
    selection,
    isNative,
  };
}
