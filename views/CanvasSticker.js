import { useEffect, useRef, useReducer } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, PanResponder } from 'react-native';

export const EMOJI_BOX = 84;

// A single placed sticker (emoji, image or GIF). Renders absolutely
// positioned over the drawing surface and is draggable via its own
// PanResponder — the responder system gives nested views first refusal on a
// touch, so dragging a sticker never starts a new pen stroke underneath it.
export default function CanvasSticker({ sticker, selected, canvasSize, onSelect, onMove, onDelete }) {
  const posRef       = useRef({ x: sticker.x, y: sticker.y });
  const startRef     = useRef({ x: sticker.x, y: sticker.y });
  const canvasSizeRef = useRef(canvasSize);
  const [, bump] = useReducer((c) => c + 1, 0);

  const onSelectRef = useRef(onSelect);
  const onMoveRef   = useRef(onMove);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { onMoveRef.current   = onMove;   }, [onMove]);
  useEffect(() => { canvasSizeRef.current = canvasSize; }, [canvasSize]);

  // Pick up external position changes (e.g. a remote move) once we're not
  // mid-drag ourselves.
  useEffect(() => {
    posRef.current = { x: sticker.x, y: sticker.y };
    bump();
  }, [sticker.x, sticker.y]);

  const pr = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      // Without this, the canvas's drawing PanResponder can steal the
      // gesture mid-drag once the pointer leaves the sticker's original
      // bounds — turning the rest of the drag into a pen stroke.
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        startRef.current = { ...posRef.current };
        onSelectRef.current?.(sticker.id);
      },
      onPanResponderMove: (_, gesture) => {
        const { width, height } = canvasSizeRef.current || {};
        let x = startRef.current.x + gesture.dx;
        let y = startRef.current.y + gesture.dy;
        if (width)  x = Math.min(Math.max(x, 0), width);
        if (height) y = Math.min(Math.max(y, 0), height);
        posRef.current = { x, y };
        bump();
      },
      onPanResponderRelease: () => {
        onMoveRef.current?.(sticker.id, posRef.current.x, posRef.current.y);
      },
      onPanResponderTerminate: () => {
        onMoveRef.current?.(sticker.id, posRef.current.x, posRef.current.y);
      },
    })
  ).current;

  const { x, y } = posRef.current;
  const width  = sticker.type === 'emoji' ? EMOJI_BOX : (sticker.width  || 120);
  const height = sticker.type === 'emoji' ? EMOJI_BOX : (sticker.height || 120);

  return (
    <View
      {...pr.panHandlers}
      style={[
        styles.wrap,
        {
          width,
          height,
          transform: [{ translateX: x - width / 2 }, { translateY: y - height / 2 }],
        },
        selected && styles.selected,
      ]}
    >
      {sticker.type === 'emoji' ? (
        <Text style={styles.emoji}>{sticker.emoji}</Text>
      ) : (
        <Image source={{ uri: sticker.uri }} style={styles.image} resizeMode="contain" />
      )}

      {selected && (
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => onDelete(sticker.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.deleteText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    borderWidth: 2,
    borderColor: '#a78bfa',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  emoji: {
    fontSize: 56,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  deleteBtn: {
    position: 'absolute',
    top: -12,
    right: -12,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f87171',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0a0a0f',
  },
  deleteText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
});
