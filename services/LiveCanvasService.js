import { ref, set, remove, onValue, onDisconnect } from 'firebase/database';
import { rtdb } from '../config/firebase';

function snapshotRef(spaceId) {
  return ref(rtdb, `canvasLive/${spaceId}`);
}

function cursorRef(spaceId, uid) {
  return ref(rtdb, `canvasCursors/${spaceId}/${uid}`);
}

function cursorsRef(spaceId) {
  return ref(rtdb, `canvasCursors/${spaceId}`);
}

export const LiveCanvasService = {
  // Broadcasts the current drawing to everyone else viewing this space.
  // senderId is a per-session id (NOT the account uid) — two devices on the
  // same account must still see each other's strokes, so "is this my own
  // broadcast" can't be decided from the account id alone.
  async pushSnapshot(spaceId, paths, senderId) {
    await set(snapshotRef(spaceId), {
      snapshot: JSON.stringify(paths),
      updatedBy: senderId,
      updatedAt: Date.now(),
    });
  },

  // Subscribes to live snapshot updates for a space. Fires immediately with
  // the current value, then again every time someone draws. Returns an
  // unsubscribe function.
  subscribeSnapshot(spaceId, callback) {
    return onValue(snapshotRef(spaceId), (snapshot) => {
      const value = snapshot.val();
      if (!value?.snapshot) return;
      let paths;
      try {
        paths = JSON.parse(value.snapshot);
      } catch {
        return;
      }
      if (!Array.isArray(paths)) return;
      callback({ paths, updatedBy: value.updatedBy });
    });
  },

  // Registers cleanup so a cursor disappears for everyone if the connection
  // drops (closed tab, lost network) instead of lingering forever. Call once
  // per space session, before pushing any positions. Keyed by uid — the RTDB
  // security rules only grant write access at auth.uid's own path, so this
  // can't be a per-session id (see pushCursor for how same-account devices
  // still get told apart).
  prepareCursor(spaceId, uid) {
    onDisconnect(cursorRef(spaceId, uid)).remove();
  },

  // Broadcasts where you're currently pointing on the canvas. The path is
  // keyed by uid (required by the security rules: auth.uid === $uid), but we
  // also stamp the per-session id into the payload — that's what lets two
  // devices on the same account tell "my cursor" from "my other device's
  // cursor" in subscribeCursors below, even though they share an RTDB path.
  async pushCursor(spaceId, uid, sessionId, name, x, y) {
    await set(cursorRef(spaceId, uid), { x, y, name, sessionId, updatedAt: Date.now() });
  },

  // Explicitly removes your cursor (e.g. leaving the canvas/space).
  async clearCursor(spaceId, uid) {
    const r = cursorRef(spaceId, uid);
    onDisconnect(r).cancel();
    await remove(r);
  },

  // Subscribes to everyone else's live cursor positions in a space.
  // ownSessionId excludes our own pointer by comparing the per-session id
  // stamped in the payload — NOT the uid key — so a second device signed
  // into the same account still shows up as a distinct live cursor.
  // Returns an unsubscribe function.
  subscribeCursors(spaceId, ownSessionId, callback) {
    return onValue(cursorsRef(spaceId), (snapshot) => {
      const value = snapshot.val() || {};
      const others = {};
      for (const [uid, c] of Object.entries(value)) {
        if (!c || typeof c.x !== 'number' || typeof c.y !== 'number') continue;
        if (c.sessionId === ownSessionId) continue;
        others[uid] = { x: c.x, y: c.y, name: c.name || '?' };
      }
      callback(others);
    });
  },
};
