import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSpaces } from '../context/SpaceContext';
import { useAuth } from '../context/AuthContext';
import { CanvasService } from '../services/CanvasService';
import { LiveCanvasService } from '../services/LiveCanvasService';
import DrawingCanvas from './DrawingCanvas';

export default function CanvasView() {
  const { activeSpace }   = useSpaces();
  const { user, getToken } = useAuth();
  const canvasRef         = useRef(null);

  const [serverPaths,  setServerPaths]  = useState([]);
  const [canvasId,     setCanvasId]     = useState(null);
  const [loadingCanvas, setLoadingCanvas] = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [toast,        setToast]        = useState(null); // { msg, error }

  // Load the canvas once, then subscribe to Firebase Realtime Database for
  // instant pushes whenever anyone else saves — no more 5s polling.
  useEffect(() => {
    if (!activeSpace) return;

    let cancelled = false;
    setCanvasId(null);

    async function fetchInitial() {
      setLoadingCanvas(true);
      try {
        const token = await getToken();
        const { paths, canvasId: cid } = await CanvasService.getCanvas(activeSpace.id, token);
        if (!cancelled) {
          setServerPaths(paths);
          if (cid) setCanvasId(cid);
        }
      } catch {
        // silent — don't wipe the canvas on a transient network error
      } finally {
        if (!cancelled) setLoadingCanvas(false);
      }
    }

    fetchInitial();

    const unsubscribe = LiveCanvasService.subscribe(activeSpace.id, ({ paths, updatedBy }) => {
      if (cancelled) return;
      if (updatedBy === user?.uid) return; // our own save — already applied optimistically
      setServerPaths(paths);
    });

    return () => {
      cancelled = true;
      unsubscribe();
      setServerPaths([]);
      setCanvasId(null);
    };
  }, [activeSpace?.id, getToken, user?.uid]);

  async function handleSave(allPaths) {
    if (!canvasId) {
      showToast({ msg: 'Canvas ikke klar endnu — prøv igen', error: true });
      return;
    }
    setSaving(true);
    showToast(null);
    try {
      const token = await getToken();
      await CanvasService.saveCanvas(canvasId, allPaths, token);
      // Optimistic update for us, instant push for everyone else
      setServerPaths(allPaths);
      canvasRef.current?.clearLocalPaths();
      try {
        await LiveCanvasService.pushSnapshot(activeSpace.id, allPaths, user?.uid);
      } catch {
        // best-effort — the canvas is already saved; live broadcast is a bonus
      }
      showToast({ msg: 'Canvas gemt ✓', error: false });
    } catch {
      showToast({ msg: 'Kunne ikke gemme. Prøv igen.', error: true });
    } finally {
      setSaving(false);
    }
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
        ref={canvasRef}
        spaceName={activeSpace.name}
        serverPaths={serverPaths}
        userId={user?.uid}
        saving={saving}
        onSave={handleSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  empty: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
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
