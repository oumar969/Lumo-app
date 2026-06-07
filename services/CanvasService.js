const BASE_URL = 'https://lumo-api-zeta.vercel.app/api';

function parsePaths(snapshot_url) {
  if (!snapshot_url) return [];
  try {
    const parsed = JSON.parse(snapshot_url);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return []; // old SVG-data-URL format or garbage — treat as empty
  }
}

export const CanvasService = {
  // Returns { paths, canvasId } — canvasId is the canvas document's own ID,
  // needed for subsequent PATCH calls.
  async getCanvas(spaceId, token) {
    const res = await fetch(
      `${BASE_URL}/canvases?space_id=${encodeURIComponent(spaceId)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      res.text().then((t) => console.log('[CanvasService] GET failed', res.status, t));
      return { paths: [], canvasId: null };
    }
    const data = await res.json();
    const record = Array.isArray(data) ? data[0] : data;
    return {
      paths: parsePaths(record?.snapshot_url),
      canvasId: record?.canvas_id || record?.id || record?._id || null,
    };
  },

  async saveCanvas(canvasId, paths, token) {
    const payload = JSON.stringify({ canvas_id: canvasId, snapshot_url: JSON.stringify(paths) });
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const res = await fetch(`${BASE_URL}/canvases`, { method: 'PATCH', headers, body: payload });
    const body = await res.text();
    if (!res.ok) {
      console.log('[CanvasService] PATCH failed', res.status, body);
      throw new Error('Kunne ikke gemme canvas');
    }
    try { return JSON.parse(body); } catch { return {}; }
  },
};
