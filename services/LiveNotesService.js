import { ref, set, onValue } from 'firebase/database';
import { rtdb } from '../config/firebase';

function liveRef(spaceId) {
  return ref(rtdb, `notesLive/${spaceId}`);
}

export const LiveNotesService = {
  // Broadcasts that the notes list for this space changed (a note was
  // created, edited or deleted) so everyone else viewing the space can
  // refresh instantly. senderId is a per-session id (NOT the account uid) —
  // two devices on the same account must still see each other's changes, so
  // "is this my own broadcast" can't be decided from the account id alone.
  async pushUpdate(spaceId, senderId) {
    await set(liveRef(spaceId), {
      updatedBy: senderId,
      updatedAt: Date.now(),
    });
  },

  // Subscribes to live notes-list updates for a space. Fires every time
  // someone creates, edits or deletes a note. Returns an unsubscribe function.
  subscribeUpdates(spaceId, callback) {
    return onValue(liveRef(spaceId), (snapshot) => {
      const value = snapshot.val();
      if (!value) return;
      callback({ updatedBy: value.updatedBy, updatedAt: value.updatedAt });
    });
  },
};
