import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import {
  View, PanResponder, StyleSheet,
  TouchableOpacity, Text, ActivityIndicator,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

const STROKE_WIDTH = 3;
const MIN_DIST_SQ  = 9; // skip points < 3 px apart to reduce render thrash

const COLORS = [
  { key: 'white',  hex: '#ffffff' },
  { key: 'purple', hex: '#a78bfa' },
  { key: 'pink',   hex: '#f472b6' },
  { key: 'yellow', hex: '#fbbf24' },
  { key: 'cyan',   hex: '#22d3ee' },
];

function pointsToD(pts) {
  return pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
}

// serverPaths  — paths loaded from + synced with the backend (read-only here)
// onSave(allPaths) — called with [...serverPaths, ...localPaths] on Gem press
// clearLocalPaths() — exposed via ref so CanvasView can reset after a
//                     successful save without duplicating strokes on next poll
const DrawingCanvas = forwardRef(function DrawingCanvas(
  { spaceName, serverPaths = [], onSave, saving, syncing },
  ref
) {
  const localRef   = useRef([]); // completed local strokes
  const currentRef = useRef([]); // in-progress stroke points
  const colorRef   = useRef('#ffffff');

  const [activeColor, setActiveColor] = useState('#ffffff');
  const [canvasSize,  setCanvasSize]  = useState({ width: 0, height: 0 });
  const [tick,        setTick]        = useState(0);

  const bump = () => setTick((t) => t + 1);

  // CanvasView calls this after a successful save so local strokes don't
  // appear twice once the next poll updates serverPaths.
  useImperativeHandle(ref, () => ({
    clearLocalPaths() {
      localRef.current = [];
      bump();
    },
  }));

  const pr = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,

      onPanResponderGrant: ({ nativeEvent: { locationX: x, locationY: y } }) => {
        currentRef.current = [{ x, y }];
        bump();
      },

      onPanResponderMove: ({ nativeEvent: { locationX: x, locationY: y } }) => {
        const pts  = currentRef.current;
        const last = pts[pts.length - 1];
        if (last) {
          const dx = x - last.x, dy = y - last.y;
          if (dx * dx + dy * dy < MIN_DIST_SQ) return;
        }
        currentRef.current.push({ x, y });
        bump();
      },

      onPanResponderRelease: () => {
        const pts = currentRef.current;
        if (pts.length > 1) {
          localRef.current.push({ d: pointsToD(pts), color: colorRef.current });
        }
        currentRef.current = [];
        bump();
      },
    })
  ).current;

  function handleColorSelect(hex) {
    colorRef.current = hex;
    setActiveColor(hex);
  }

  function handleUndo() {
    localRef.current = localRef.current.slice(0, -1);
    bump();
  }

  function handleClear() {
    // Clears only YOUR unsaved local strokes — server strokes remain.
    localRef.current   = [];
    currentRef.current = [];
    bump();
  }

  function handleSave() {
    // Merge server + local so the backend always has the full picture.
    onSave([...serverPaths, ...localRef.current]);
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
          {syncing && (
            <Text style={styles.syncLabel}>Synkroniserer...</Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.saveBtnText}>Gem</Text>
          }
        </TouchableOpacity>
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
          {/* Server paths — drawn by everyone and saved */}
          {serverPaths.map(({ d, color }, i) => (
            <Path key={`s${i}`} d={d} stroke={color} strokeWidth={STROKE_WIDTH}
              fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {/* Local paths — drawn by you, not yet saved */}
          {localRef.current.map(({ d, color }, i) => (
            <Path key={`l${i}`} d={d} stroke={color} strokeWidth={STROKE_WIDTH}
              fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {/* Current in-progress stroke */}
          {currentD && (
            <Path d={currentD} stroke={activeColor} strokeWidth={STROKE_WIDTH}
              fill="none" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </Svg>
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
          <TouchableOpacity style={styles.actionBtn} onPress={handleUndo}>
            <Text style={styles.actionBtnText}>↩ Fortryd</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDanger]}
            onPress={handleClear}
          >
            <Text style={styles.actionBtnText}>Ryd egne</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

export default DrawingCanvas;

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
  syncLabel: {
    color: '#555',
    fontSize: 11,
    marginTop: 2,
  },
  saveBtn: {
    backgroundColor: '#a78bfa',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 64,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  canvas: {
    flex: 1,
    backgroundColor: '#0a0a0f',
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
  actionBtnText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },
});
