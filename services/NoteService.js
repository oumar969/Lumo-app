const BASE_URL = 'https://lumo-api-zeta.vercel.app/api';

export const NoteService = {
  async getNotes(spaceId, token) {
    const res = await fetch(`${BASE_URL}/notes?space_id=${encodeURIComponent(spaceId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return res.json();
  },

  async createNote(spaceId, content, token) {
    const res = await fetch(`${BASE_URL}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ space_id: spaceId, content }),
    });
    if (!res.ok) throw new Error('Kunne ikke oprette note');
    return res.json();
  },

  async updateNote(noteId, content, token) {
    const res = await fetch(`${BASE_URL}/notes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ note_id: noteId, content }),
    });
    if (!res.ok) throw new Error('Kunne ikke opdatere note');
    return res.json();
  },

  async deleteNote(noteId, token) {
    const res = await fetch(`${BASE_URL}/notes`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ note_id: noteId }),
    });
    if (!res.ok) throw new Error('Kunne ikke slette note');
    return res.json();
  },
};
