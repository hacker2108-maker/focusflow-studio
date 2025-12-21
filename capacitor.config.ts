import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.1fe5035d4d3a4bef8622e26b61f95948",
  appName: "FocusHabit",
  webDir: "dist",
  server: {
    url: "https://1fe5035d-4d3a-4bef-8622-e26b61f95948.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon",
      iconColor: "#F59E0B",
      sound: "beep.wav",
    },
  },
};

export default config;
