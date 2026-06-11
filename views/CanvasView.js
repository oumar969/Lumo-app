import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSpaces } from '../context/SpaceContext';
import { useAuth } from '../context/AuthContext';
import { CanvasService } from '../services/CanvasService';
import { LiveCanvasService } from '../services/LiveCanvasService';
import { WidgetService } from '../services/WidgetService';
import DrawingCanvas from './DrawingCanvas';

export default function CanvasView() {
  const { activeSpace }    = useSpaces();
  const { user, profile, getToken } = useAuth();

  const [serverPaths,    setServerPaths]    = useState([]);
  const [serverStickers, setServerStickers] = useState([]);
  const [canvasId,     setCanvasId]     = useState(null);
  const [loadingCanvas, setLoadingCanvas] = useState(false);
  const [cursors,      setCursors]      = useState({}); // { [uid]: { x, y, name } }
  const [toast,        setToast]        = useState(null); // { msg, error }

  // Every change (Turso write + live broadcast) is queued through this chain
  // so rapid strokes persist in order instead of racing and overwriting
  // each other's snapshot.
  const persistChainRef = useRef(Promise.resolve());

  // A random per-mount id — NOT the account's uid. Two devices signed into
  // the same account are still two separate live-sync participants, so we
  // can't use uid alone to tell "my own broadcast" apart from "someone
  // else's": that would make each device deafen itself to the other.
  // (Cursor RTDB paths still have to be keyed by uid — the security rules
  // tie write access to auth.uid — so this id rides along *inside* the
  // cursor payload instead, purely for self-filtering.)
  const sessionIdRef = useRef(`${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);

  const displayName = profile?.display_name || user?.email || 'Bruger';

  // Load the canvas once, then subscribe to Firebase Realtime Database for
  // instant pushes whenever anyone draws — no more polling.
  useEffect(() => {
    if (!activeSpace || !user) return;

    let cancelled = false;
    setCanvasId(null);
    setCursors({});
    persistChainRef.current = Promise.resolve();

    async function fetchInitial() {
      setLoadingCanvas(true);
      try {
        const token = await getToken();
        const { paths, stickers, canvasId: cid } = await CanvasService.getCanvas(activeSpace.id, token);
        if (!cancelled) {
          setServerPaths(paths);
          setServerStickers(stickers);
          if (cid) setCanvasId(cid);
        }
      } catch {
        // silent — don't wipe the canvas on a transient network error
      } finally {
        if (!cancelled) setLoadingCanvas(false);
      }
    }

    fetchInitial();

    const sessionId = sessionIdRef.current;

    const unsubscribeSnapshot = LiveCanvasService.subscribeSnapshot(activeSpace.id, ({ paths, stickers, updatedBy }) => {
      if (cancelled) return;
      if (updatedBy === sessionId) return; // our own change — already applied optimistically
      setServerPaths(paths);
      setServerStickers(stickers);
    });

    LiveCanvasService.prepareCursor(activeSpace.id, user.uid);
    const unsubscribeCursors = LiveCanvasService.subscribeCursors(activeSpace.id, sessionId, (others) => {
      if (!cancelled) setCursors(others);
    });

    return () => {
      cancelled = true;
      unsubscribeSnapshot();
      unsubscribeCursors();
      LiveCanvasService.clearCursor(activeSpace.id, user.uid);
      setServerPaths([]);
      setServerStickers([]);
      setCanvasId(null);
      setCursors({});
    };
  }, [activeSpace?.id, user?.uid, getToken]);

  // Called whenever the local canvas changes (new stroke, undo, clear, or a
  // sticker/image/GIF is placed, moved or removed). Applies it instantly for
  // us, then queues durable save + live broadcast.
  function handleCanvasChange(newPaths, newStickers) {
    setServerPaths(newPaths);
    setServerStickers(newStickers);

    const data = { paths: newPaths, stickers: newStickers };
    const run = persistChainRef.current.then(() => persist(data));
    persistChainRef.current = run.catch(() => {});
    return run;
  }

  async function persist(data) {
    // Broadcast first — it's just a fast pub/sub push, no reason to wait on Turso
    LiveCanvasService.pushSnapshot(activeSpace.id, data, sessionIdRef.current).catch(() => {});

    if (!canvasId) return;
    try {
      const token = await getToken();
      await CanvasService.saveCanvas(canvasId, data, token);
      WidgetService.saveAndUpdate(activeSpace.name, data.paths.length).catch(() => {});
    } catch {
      showToast({ msg: 'Kunne ikke gemme tegningen. Prøv igen.', error: true });
    }
  }

  function handleCursorMove(x, y) {
    if (!activeSpace || !user) return;
    LiveCanvasService.pushCursor(activeSpace.id, user.uid, sessionIdRef.current, displayName, x, y).catch(() => {});
  }

  function showToast(t) {
    setToast(t);
    if (t) setTimeout(() => setToast(null), 2800);
  }

  if (!activeSpace) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyGlyph}>✦</Text>
        <Text style={styles.emptyTitle}>Intet space valgt</Text>
        <Text style={styles.emptySubtitle}>
          Åbn et space fra fanen Spaces{'\n'}for at begynde at tegne.
        </Text>
      </View>
    );
  }

  if (loadingCanvas) {
    return (
      <View style={styles.empty}>
        <ActivityIndicator color="#a78bfa" size="large" />
        <Text style={styles.loadingLabel}>Henter canvas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {toast && (
        <View style={[styles.toast, toast.error && styles.toastError]}>
          <Text style={styles.toastText}>{toast.msg}</Text>
        </View>
      )}
      <DrawingCanvas
        spaceName={activeSpace.name}
        serverPaths={serverPaths}
        serverStickers={serverStickers}
        userId={user?.uid}
        cursors={cursors}
        onCanvasChange={handleCanvasChange}
        onCursorMove={handleCursorMove}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    paddingBottom: 100,
  },
  empty: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    paddingBottom: 100,
  },
  emptyGlyph: {
    fontSize: 48,
    color: '#a78bfa',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingLabel: {
    color: '#555',
    fontSize: 14,
    marginTop: 16,
  },
  toast: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    backgroundColor: '#166534',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    zIndex: 99,
  },
  toastError: {
    backgroundColor: '#7f1d1d',
  },
  toastText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
