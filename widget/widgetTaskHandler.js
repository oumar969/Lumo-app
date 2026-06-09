import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CanvasWidget } from './CanvasWidget';

const WIDGET_DATA_KEY = 'lumo_widget_data';

export async function widgetTaskHandler(props) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY).catch(() => null);
      const data = raw ? JSON.parse(raw) : {};
      props.renderWidget(
        <CanvasWidget
          spaceName={data.spaceName}
          pathCount={data.pathCount}
          lastUpdated={data.lastUpdated}
          snapshotUri={data.snapshotUri}
        />,
      );
      break;
    }

    case 'WIDGET_CLICK': {
      // Tapping the widget opens the app — handled by Android automatically
      // via the pendingIntent configured in the plugin
      break;
    }

    default:
      break;
  }
}
