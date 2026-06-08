import { ref, set, onValue } from 'firebase/database';
import { rtdb } from '../config/firebase';

function liveRef(spaceId) {
  return ref(rtdb, `canvasLive/${spaceId}`);
}

export const LiveCanvasService = {
  // Broadcasts the freshly-saved snapshot to everyone else viewing this space.
  async pushSnapshot(spaceId, paths, uid) {
    await set(liveRef(spaceId), {
      snapshot: JSON.stringify(paths),
      updatedBy: uid,
      updatedAt: Date.now(),
    });
  },

  // Subscribes to live snapshot updates for a space. Fires immediately with
  // the current value, then again every time someone saves. Returns an
  // unsubscribe function.
  subscribe(spaceId, callback) {
    const unsubscribe = onValue(liveRef(spaceId), (snapshot) => {
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
    return unsubscribe;
  },
};
