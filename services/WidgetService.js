import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WIDGET_DATA_KEY = 'lumo_widget_data';

export const WidgetService = {
  async saveAndUpdate(spaceName, pathCount, snapshotUri = null) {
    const now = new Date();
    const lastUpdated = now.toLocaleTimeString('da-DK', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const data = { spaceName, pathCount, lastUpdated, snapshotUri };
    await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(data));

    if (Platform.OS !== 'android') return;

    try {
      // Dynamically import so the module is only loaded on Android dev builds
      const { requestWidgetUpdate } = await import('react-native-android-widget');
      await requestWidgetUpdate({
        widgetName: 'CanvasWidget',
        renderWidget: () => null,
        widgetNotFound: () => null,
      });
    } catch {
      // Not installed or not a dev build — silently skip
    }
  },
};
