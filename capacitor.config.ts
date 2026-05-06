import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // Reverse-domain app ID — used as the Android package name.
  // Change "com.lopezjuanr" to match your actual domain/developer name.
  appId: "com.lopezjuanr.soccersubmanager",
  appName: "Soccer Sub Manager",

  // Vite builds the web app into dist/public (relative to project root).
  webDir: "dist/public",

  // Android-specific configuration
  android: {
    // Allow the WebView to load the app from the local bundle (no network needed)
    allowMixedContent: false,
    // Capture console.log output in Android logcat for debugging
    loggingBehavior: "debug",
    // Use the system WebView (required for Android 5+)
    minWebViewVersion: 60,
  },

  // Plugins configuration
  plugins: {
    // SplashScreen — shown while the WebView loads
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#0d1117",
      showSpinner: false,
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
    },
  },
};

export default config;
