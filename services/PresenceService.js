const BASE_URL = 'https://lumo-api-zeta.vercel.app/api';

export const PresenceService = {
  async heartbeat(token) {
    const res = await fetch(`${BASE_URL}/presence`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Heartbeat failed');
    return res.json();
  },

  // Returns [{ user_id, last_seen }] for every member of the space.
  async getSpacePresence(spaceId, token) {
    const res = await fetch(
      `${BASE_URL}/presence?space_id=${encodeURIComponent(spaceId)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return [];
    return res.json();
  },
};
