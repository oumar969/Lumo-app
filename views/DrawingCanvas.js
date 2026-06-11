import { useEffect, useRef, useState } from 'react';
import {
  View, PanResponder, StyleSheet,
  TouchableOpacity, Text, ActivityIndicator, ScrollView,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import CanvasSticker from './CanvasSticker';
import StickerSheet from './StickerSheet';

const MIN_DIST_SQ  = 4;
const CURSOR_THROTTLE_MS = 80;

const COLORS = [
  { key: 'white',  hex: '#ffffff' },
  { key: 'purple', hex: '#a78bfa' },
  { key: 'pink',   hex: '#f472b6' },
  { key: 'cyan',   hex: '#22d3ee' },
  { key: 'green',  hex: '#4ade80' },
  { key: 'yellow', hex: '#fbbf24' },
  { key: 'orange', hex: '#fb923c' },
  { key: 'red',    hex: '#f87171' },
  { key: 'blue',   hex: '#60a5fa' },
  { key: 'gray',   hex: '#94a3b8' },
];

const MIN_BRUSH_SIZE = 2;
const MAX_BRUSH_SIZE = 30;
const DEFAULT_BRUSH_SIZE = 4;

const ERASER_COLOR = '#0a0a0f';
const ERASER_WIDTH = 28;

const CURSOR_COLORS = ['#f472b6', '#22d3ee', '#fbbf24', '#34d399', '#60a5fa', '#c084fc'];

function colorForUid(uid = '') {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = (hash * 31 + uid.charCodeAt(i)) | 0;
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

function pointsToD(pts) {
  return pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
}

function lastIndexWhere(arr, pred) {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (pred(arr[i])) return i;
  }
  return -1;
}

function newStickerId() {
  return `stk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function BrushSizeSlider({ value, min, max, onChange }) {
  const trackWidthRef = useRef(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const updateFromX = (x) => {
    const width = trackWidthRef.current;
    if (width <= 0) return;
    const ratio = Math.max(0, Math.min(1, x / width));
    const next = Math.round(min + ratio * (max - min));
    onChangeRef.current?.(next);
  };

  const pr = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: ({ nativeEvent: { locationX } }) => updateFromX(locationX),
      onPanResponderMove: ({ nativeEvent: { locationX } }) => updateFromX(locationX),
    })
  ).current;

  const ratio = max > min ? (value - min) / (max - min) : 0;
  const thumbX = ratio * trackWidth;

  return (
    <View
      style={styles.sliderTrackWrap}
      {...pr.panHandlers}
      onLayout={({ nativeEvent: { layout: { width } } }) => {
        trackWidthRef.current = width;
        setTrackWidth(width);
      }}
    >
      <View style={styles.sliderTrack}>
        <View style={[styles.sliderFill, { width: thumbX }]} />
      </View>
      <View style={[styles.sliderThumb, { left: thumbX - 10 }]} />
    </View>
  );
}

export default function DrawingCanvas({
  spaceName, serverPaths = [], serverStickers = [], userId, cursors = {}, onCanvasChange, onCursorMove,
}) {
  const currentRef       = useRef([]);
  const colorRef         = useRef('#ffffff');
  const strokeWidthRef   = useRef(DEFAULT_BRUSH_SIZE);
  const isEraserRef      = useRef(false);
  const serverPathsRef   = useRef(serverPaths);
  const serverStickersRef = useRef(serverStickers);
  const lastCursorRef    = useRef(0);

  const onCanvasChangeRef = useRef(onCanvasChange);
  const onCursorMoveRef   = useRef(onCursorMove);
  useEffect(() => { onCanvasChangeRef.current = onCanvasChange; }, [onCanvasChange]);
  useEffect(() => { onCursorMoveRef.current   = onCursorMove;   }, [onCursorMove]);
  useEffect(() => { serverPathsRef.current    = serverPaths;    }, [serverPaths]);
  useEffect(() => { serverStickersRef.current = serverStickers; }, [serverStickers]);

  const [activeColor,  setActiveColor]  = useState('#ffffff');
  const [brushSize,    setBrushSize]    = useState(DEFAULT_BRUSH_SIZE);
  const [isEraser,     setIsEraser]     = useState(false);
  const [canvasSize,   setCanvasSize]   = useState({ width: 0, height: 0 });
  const [tick,         setTick]         = useState(0);
  const [busy,         setBusy]         = useState(false);
  const [stickerSheetVisible, setStickerSheetVisible] = useState(false);
  const [selectedStickerId,   setSelectedStickerId]   = useState(null);

  const bump = () => setTick((t) => t + 1);

  // Drop the selection if the sticker was removed (e.g. by another user).
  useEffect(() => {
    if (selectedStickerId && !serverStickers.some((s) => s.id === selectedStickerId)) {
      setSelectedStickerId(null);
    }
  }, [serverStickers, selectedStickerId]);

  function broadcastCursor(x, y) {
    const now = Date.now();
    if (now - lastCursorRef.current < CURSOR_THROTTLE_MS) return;
    lastCursorRef.current = now;
    onCursorMoveRef.current?.(x, y);
  }

  const pr = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,

      onPanResponderGrant: ({ nativeEvent: { locationX: x, locationY: y } }) => {
        setSelectedStickerId(null);
        currentRef.current = [{ x, y }];
        broadcastCursor(x, y);
        bump();
      },

      onPanResponderMove: ({ nativeEvent: { locationX: x, locationY: y } }) => {
        const pts  = currentRef.current;
        const last = pts[pts.length - 1];
        if (last) {
          const dx = x - last.x, dy = y - last.y;
          if (dx * dx + dy * dy < MIN_DIST_SQ) {
            broadcastCursor(x, y);
            return;
          }
        }
        currentRef.current.push({ x, y });
        broadcastCursor(x, y);
        bump();
      },

      onPanResponderRelease: () => {
        const pts = currentRef.current;
        currentRef.current = [];
        if (pts.length > 1) {
          const color = isEraserRef.current ? ERASER_COLOR : colorRef.current;
          const width = isEraserRef.current ? ERASER_WIDTH : strokeWidthRef.current;
          const stroke = {
            d: pointsToD(pts),
            color,
            width,
            authorId: userId,
          };
          const updated = [...serverPathsRef.current, stroke];
          serverPathsRef.current = updated;
          onCanvasChangeRef.current?.(updated, serverStickersRef.current);
        }
        bump();
      },
    })
  ).current;

  function handleColorSelect(hex) {
    colorRef.current    = hex;
    isEraserRef.current = false;
    setActiveColor(hex);
    setIsEraser(false);
  }

  function handleBrushSizeChange(size) {
    const clamped = Math.max(MIN_BRUSH_SIZE, Math.min(MAX_BRUSH_SIZE, size));
    strokeWidthRef.current = clamped;
    setBrushSize(clamped);
  }

  function handleEraserToggle() {
    const next = !isEraserRef.current;
    isEraserRef.current = next;
    setIsEraser(next);
  }

  async function handleUndo() {
    if (busy || !userId) return;
    const idx = lastIndexWhere(serverPaths, (p) => p.authorId === userId);
    if (idx === -1) return;

    const updated = serverPaths.filter((_, i) => i !== idx);
    serverPathsRef.current = updated;
    setBusy(true);
    try {
      await onCanvasChangeRef.current?.(updated, serverStickersRef.current);
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    if (busy || !userId) return;
    const remaining = serverPaths.filter((p) => p.authorId !== userId);
    if (remaining.length === serverPaths.length) return;

    serverPathsRef.current = remaining;
    setBusy(true);
    try {
      await onCanvasChangeRef.current?.(remaining, serverStickersRef.current);
    } finally {
      setBusy(false);
    }
  }

  function addSticker(sticker) {
    const updated = [...serverStickersRef.current, sticker];
    serverStickersRef.current = updated;
    setSelectedStickerId(sticker.id);
    onCanvasChangeRef.current?.(serverPathsRef.current, updated);
  }

  function handleAddEmoji(emoji) {
    addSticker({
      id: newStickerId(),
      type: 'emoji',
      emoji,
      x: canvasSize.width / 2 || 100,
      y: canvasSize.height / 2 || 100,
      authorId: userId,
    });
  }

  function handleAddImage({ uri, width, height }) {
    addSticker({
      id: newStickerId(),
      type: 'image',
      uri,
      width,
      height,
      x: canvasSize.width / 2 || 100,
      y: canvasSize.height / 2 || 100,
      authorId: userId,
    });
  }

  function handleAddGif({ uri, width, height }) {
    addSticker({
      id: newStickerId(),
      type: 'gif',
      uri,
      width,
      height,
      x: canvasSize.width / 2 || 100,
      y: canvasSize.height / 2 || 100,
      authorId: userId,
    });
  }

  function handleStickerMove(id, x, y) {
    const updated = serverStickersRef.current.map((s) => (s.id === id ? { ...s, x, y } : s));
    serverStickersRef.current = updated;
    onCanvasChangeRef.current?.(serverPathsRef.current, updated);
  }

  function handleStickerResize(id, width, height) {
    const updated = serverStickersRef.current.map((s) => {
      if (s.id !== id) return s;
      return s.type === 'emoji' ? { ...s, size: width } : { ...s, width, height };
    });
    serverStickersRef.current = updated;
    onCanvasChangeRef.current?.(serverPathsRef.current, updated);
  }

  function handleStickerDelete(id) {
    const updated = serverStickersRef.current.filter((s) => s.id !== id);
    serverStickersRef.current = updated;
    setSelectedStickerId(null);
    onCanvasChangeRef.current?.(serverPathsRef.current, updated);
  }

  const currentD = currentRef.current.length > 1 ? pointsToD(currentRef.current) : null;
  const currentStrokeWidth = isEraser ? ERASER_WIDTH : brushSize;
  const currentStrokeColor = isEraser ? ERASER_COLOR : activeColor;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>{spaceName}</Text>
      </View>

      {/* Drawing surface */}
      <View
        style={styles.canvas}
        {...pr.panHandlers}
        onLayout={({ nativeEvent: { layout: { width, height } } }) =>
          setCanvasSize({ width, height })
        }
      >
        <Svg width={canvasSize.width} height={canvasSize.height}>
          {serverPaths.map(({ d, color, width }, i) => (
            <Path
              key={`s${i}`}
              d={d}
              stroke={color}
              strokeWidth={width ?? 3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {currentD && (
            <Path
              d={currentD}
              stroke={currentStrokeColor}
              strokeWidth={currentStrokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </Svg>

        {serverStickers.map((sticker) => (
          <CanvasSticker
            key={sticker.id}
            sticker={sticker}
            selected={sticker.id === selectedStickerId}
            canvasSize={canvasSize}
            onSelect={setSelectedStickerId}
            onMove={handleStickerMove}
            onResize={handleStickerResize}
            onDelete={handleStickerDelete}
          />
        ))}

        {Object.entries(cursors).map(([uid, c]) => {
          const hex = colorForUid(uid);
          return (
            <View
              key={uid}
              pointerEvents="none"
              style={[styles.cursorWrap, { transform: [{ translateX: c.x }, { translateY: c.y }] }]}
            >
              <View style={[styles.cursorDot, { backgroundColor: hex }]} />
              <Text style={[styles.cursorLabel, { color: hex }]} numberOfLines={1}>{c.name}</Text>
            </View>
          );
        })}
      </View>

      {/* Toolbar */}
      <View style={styles.toolbar}>

        {/* Color swatches */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.colorRow}
        >
          {COLORS.map(({ key, hex }) => (
            <TouchableOpacity
              key={key}
              onPress={() => handleColorSelect(hex)}
              style={[
                styles.swatch,
                { backgroundColor: hex },
                !isEraser && activeColor === hex && styles.swatchActive,
              ]}
            />
          ))}
        </ScrollView>

        {/* Brush size + eraser row */}
        <View style={styles.toolRow}>
          <View style={styles.brushSizeRow}>
            <Text style={styles.brushSizeLabel}>Pensel</Text>
            <BrushSizeSlider
              value={brushSize}
              min={MIN_BRUSH_SIZE}
              max={MAX_BRUSH_SIZE}
              onChange={handleBrushSizeChange}
            />
            <View style={styles.brushPreviewWrap}>
              <View style={[
                styles.brushPreviewDot,
                {
                  width: brushSize,
                  height: brushSize,
                  borderRadius: brushSize / 2,
                  backgroundColor: isEraser ? ERASER_COLOR : activeColor,
                },
              ]} />
            </View>
          </View>

          <TouchableOpacity
            onPress={handleEraserToggle}
            style={[styles.eraserBtn, isEraser && styles.eraserBtnActive]}
          >
            <Text style={[styles.eraserText, isEraser && styles.eraserTextActive]}>⌫ Viskelæder</Text>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, busy && styles.actionBtnDisabled]}
            onPress={handleUndo}
            disabled={busy}
          >
            {busy
              ? <ActivityIndicator color="#aaa" size="small" />
              : <Text style={styles.actionBtnText}>↩ Fortryd</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDanger, busy && styles.actionBtnDisabled]}
            onPress={handleClear}
            disabled={busy}
          >
            {busy
              ? <ActivityIndicator color="#aaa" size="small" />
              : <Text style={styles.actionBtnText}>Ryd egne</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setStickerSheetVisible(true)}
          >
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>

      </View>

      <StickerSheet
        visible={stickerSheetVisible}
        onAddEmoji={handleAddEmoji}
        onAddImage={handleAddImage}
        onAddGif={handleAddGif}
        onClose={() => setStickerSheetVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2e',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  canvas: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  cursorWrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'flex-start',
  },
  cursorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#0a0a0f',
  },
  cursorLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    backgroundColor: 'rgba(10,10,15,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    maxWidth: 120,
  },
  toolbar: {
    borderTopWidth: 1,
    borderTopColor: '#1e1e2e',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 10,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 9,
    paddingHorizontal: 2,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchActive: {
    borderColor: '#fff',
    transform: [{ scale: 1.2 }],
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brushSizeRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brushSizeLabel: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
  },
  sliderTrackWrap: {
    flex: 1,
    height: 32,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1e1e2e',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 2,
    backgroundColor: '#a78bfa',
  },
  sliderThumb: {
    position: 'absolute',
    top: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#a78bfa',
    borderWidth: 2,
    borderColor: '#0a0a0f',
  },
  brushPreviewWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#1a1a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brushPreviewDot: {
    backgroundColor: '#666',
  },
  eraserBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1a1a2a',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  eraserBtnActive: {
    borderColor: '#f87171',
    backgroundColor: 'rgba(248,113,113,0.1)',
  },
  eraserText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
  },
  eraserTextActive: {
    color: '#f87171',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#1e1e2e',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnDanger: {
    backgroundColor: '#2a1a1a',
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  actionBtnText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },
  addBtn: {
    width: 44,
    backgroundColor: '#a78bfa',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 22,
  },
});
