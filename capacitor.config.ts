import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ledgerx.app',
  appName: 'LedgerX',
  webDir: 'dist',
  // Disable the bundled server so the app always loads from the compiled webDir
  bundledWebRuntime: false,
  android: {
    // Allow cleartext HTTP traffic only in debug builds; production enforces HTTPS
    allowMixedContent: false,
    // Capture console.log output in Android Studio Logcat during development
    captureInput: true,
    // Use the system WebView rather than bundling Chromium (reduces APK size)
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      // Keep the splash visible until the app explicitly calls SplashScreen.hide()
      launchAutoHide: false,
      backgroundColor: '#0f172a',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#488AFF',
    },
  },
};

export default config;
