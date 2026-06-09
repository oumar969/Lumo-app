import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';
import App from './App';

// Register the Android home-screen widget task handler.
// This runs in a background headless context when the OS requests a widget update.
if (Platform.OS === 'android') {
  (async () => {
    try {
      const { registerWidgetTaskHandler } = await import('react-native-android-widget');
      const { widgetTaskHandler } = await import('./widget/widgetTaskHandler');
      registerWidgetTaskHandler(widgetTaskHandler);
    } catch {
      // Package not installed (Expo Go / web) — skip silently
    }
  })();
}

registerRootComponent(App);
