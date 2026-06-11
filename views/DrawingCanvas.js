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

const SIZES = [
  { key: 'thin',   width: 2,  dot: 6  },
  { key: 'medium', width: 5,  dot: 10 },
  { key: 'thick',  width: 14, dot: 18 },
];

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

export default function DrawingCanvas({
  spaceName, serverPaths = [], serverStickers = [], userId, cursors = {}, onCanvasChange, onCursorMove,
}) {
  const currentRef       = useRef([]);
  const colorRef         = useRef('#ffffff');
  const strokeWidthRef   = useRef(5);
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
  const [activeSize,   setActiveSize]   = useState('medium');
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

  function handleSizeSelect(sizeKey) {
    const s = SIZES.find((s) => s.key === sizeKey);
    strokeWidthRef.current = s.width;
    setActiveSize(sizeKey);
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

  function handleStickerDelete(id) {
    const updated = serverStickersRef.current.filter((s) => s.id !== id);
    serverStickersRef.current = updated;
    setSelectedStickerId(null);
    onCanvasChangeRef.current?.(serverPathsRef.current, updated);
  }

  const currentD = currentRef.current.length > 1 ? pointsToD(currentRef.current) : null;
  const currentStrokeWidth = isEraser ? ERASER_WIDTH : (SIZES.find((s) => s.key === activeSize)?.width ?? 5);
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

        {/* Size + eraser row */}
        <View style={styles.toolRow}>
          <View style={styles.sizeRow}>
            {SIZES.map(({ key, dot }) => (
              <TouchableOpacity
                key={key}
                onPress={() => handleSizeSelect(key)}
                style={[styles.sizeBtn, !isEraser && activeSize === key && styles.sizeBtnActive]}
              >
                <View style={[
                  styles.sizeDot,
                  { width: dot, height: dot, borderRadius: dot / 2 },
                  !isEraser && activeSize === key
                    ? { backgroundColor: activeColor }
                    : { backgroundColor: '#666' },
                ]} />
              </TouchableOpacity>
            ))}
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
    justifyContent: 'space-between',
  },
  sizeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  sizeBtn: {
    width: 40,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1a1a2a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  sizeBtnActive: {
    borderColor: '#a78bfa',
    backgroundColor: 'rgba(167,139,250,0.12)',
  },
  sizeDot: {
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
