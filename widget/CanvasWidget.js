import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function CanvasWidget({ spaceName, pathCount, lastUpdated }) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        backgroundColor: '#12121a',
        borderRadius: 16,
        padding: 16,
      }}
    >
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <FlexWidget
          style={{
            width: 4,
            height: 36,
            backgroundColor: '#a78bfa',
            borderRadius: 2,
            marginRight: 12,
          }}
        />
        <FlexWidget
          style={{
            flexDirection: 'column',
          }}
        >
          <TextWidget
            text="✦ LUMO"
            style={{
              fontSize: 9,
              color: '#a78bfa',
              fontWeight: 'bold',
            }}
          />
          <TextWidget
            text={spaceName || 'Intet aktivt space'}
            style={{
              fontSize: 17,
              color: '#ffffff',
              fontWeight: 'bold',
            }}
            maxLines={1}
          />
        </FlexWidget>
      </FlexWidget>

      <TextWidget
        text={
          pathCount != null
            ? `${pathCount} streg${pathCount === 1 ? '' : 'er'} tegnet`
            : 'Ingen tegning endnu'
        }
        style={{
          fontSize: 12,
          color: '#9ca3af',
          marginBottom: 4,
        }}
      />
      {lastUpdated ? (
        <TextWidget
          text={`Sidst opdateret ${lastUpdated}`}
          style={{
            fontSize: 11,
            color: '#555566',
          }}
        />
      ) : null}
    </FlexWidget>
  );
}
