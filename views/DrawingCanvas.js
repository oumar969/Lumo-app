import { useEffect, useRef, useState } from 'react';
import {
  View, PanResponder, StyleSheet,
  TouchableOpacity, Text, ActivityIndicator,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

const STROKE_WIDTH = 3;
const MIN_DIST_SQ  = 9; // skip points < 3 px apart to reduce render thrash
const CURSOR_THROTTLE_MS = 80; // cap how often we broadcast our pointer position

const COLORS = [
  { key: 'white',  hex: '#ffffff' },
  { key: 'purple', hex: '#a78bfa' },
  { key: 'pink',   hex: '#f472b6' },
  { key: 'yellow', hex: '#fbbf24' },
  { key: 'cyan',   hex: '#22d3ee' },
];

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

// serverPaths — every stroke anyone has drawn (read-only here; the canonical
//               list lives in CanvasView and is pushed back down as it changes)
// userId      — current user's id, stamped onto strokes you draw so your own
//               strokes can be undone/cleared
// cursors     — { [uid]: { x, y, name } } live pointer positions of others
// onPathsChange(newPaths) — called the instant a stroke finishes, or when
//               undo/clear needs to remove one of your strokes. CanvasView
//               applies it optimistically and persists + broadcasts it.
// onCursorMove(x, y)      — called (throttled) while you move your pointer
//               over the canvas, so others can see where you're drawing
export default function DrawingCanvas({
  spaceName, serverPaths = [], userId, cursors = {}, onPathsChange, onCursorMove,
}) {
  const currentRef     = useRef([]); // in-progress stroke points
  const colorRef       = useRef('#ffffff');
  const serverPathsRef = useRef(serverPaths);
  const lastCursorRef  = useRef(0);

  const onPathsChangeRef = useRef(onPathsChange);
  const onCursorMoveRef  = useRef(onCursorMove);
  useEffect(() => { onPathsChangeRef.current = onPathsChange; }, [onPathsChange]);
  useEffect(() => { onCursorMoveRef.current = onCursorMove; }, [onCursorMove]);
  useEffect(() => { serverPathsRef.current = serverPaths; }, [serverPaths]);

  const [activeColor, setActiveColor] = useState('#ffffff');
  const [canvasSize,  setCanvasSize]  = useState({ width: 0, height: 0 });
  const [tick,        setTick]        = useState(0);
  const [busy,        setBusy]        = useState(false);

  const bump = () => setTick((t) => t + 1);

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
          const stroke = { d: pointsToD(pts), color: colorRef.current, authorId: userId };
          // Update the ref synchronously so back-to-back strokes stack
          // correctly instead of racing on a stale serverPaths snapshot.
          const updated = [...serverPathsRef.current, stroke];
          serverPathsRef.current = updated;
          onPathsChangeRef.current?.(updated);
        }
        bump();
      },
    })
  ).current;

  function handleColorSelect(hex) {
    colorRef.current = hex;
    setActiveColor(hex);
  }

  // Undo the most recent stroke YOU drew — every stroke is already persisted,
  // so this removes it from the canonical list and saves the result.
  async function handleUndo() {
    if (busy || !userId) return;
    const idx = lastIndexWhere(serverPaths, (p) => p.authorId === userId);
    if (idx === -1) return; // nothing of yours to undo

    const updated = serverPaths.filter((_, i) => i !== idx);
    serverPathsRef.current = updated;
    setBusy(true);
    try {
      await onPathsChangeRef.current?.(updated);
    } finally {
      setBusy(false);
    }
  }

  // Clears every stroke YOU drew. Other people's strokes are untouched.
  async function handleClear() {
    if (busy || !userId) return;
    const remaining = serverPaths.filter((p) => p.authorId !== userId);
    if (remaining.length === serverPaths.length) return;

    serverPathsRef.current = remaining;
    setBusy(true);
    try {
      await onPathsChangeRef.current?.(remaining);
    } finally {
      setBusy(false);
    }
  }

  const currentD = currentRef.current.length > 1
    ? pointsToD(currentRef.current)
    : null;

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle} numberOfLines={1}>{spaceName}</Text>
        </View>
      </View>

      {/* ── Drawing surface ── */}
      <View
        style={styles.canvas}
        {...pr.panHandlers}
        onLayout={({ nativeEvent: { layout: { width, height } } }) =>
          setCanvasSize({ width, height })
        }
      >
        <Svg width={canvasSize.width} height={canvasSize.height}>
          {/* Everyone's saved strokes */}
          {serverPaths.map(({ d, color }, i) => (
            <Path key={`s${i}`} d={d} stroke={color} strokeWidth={STROKE_WIDTH}
              fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {/* Current in-progress stroke */}
          {currentD && (
            <Path d={currentD} stroke={activeColor} strokeWidth={STROKE_WIDTH}
              fill="none" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </Svg>

        {/* Other people's live cursors */}
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

      {/* ── Toolbar ── */}
      <View style={styles.toolbar}>
        <View style={styles.colorRow}>
          {COLORS.map(({ key, hex }) => (
            <TouchableOpacity
              key={key}
              onPress={() => handleColorSelect(hex)}
              style={[
                styles.swatch,
                { backgroundColor: hex },
                activeColor === hex && styles.swatchActive,
              ]}
            />
          ))}
        </View>
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
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2e',
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchActive: {
    borderColor: '#fff',
    transform: [{ scale: 1.2 }],
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
});
