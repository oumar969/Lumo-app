const BASE_URL = 'https://lumo-api-zeta.vercel.app/api';

// Canvas data is stored as JSON in snapshot_url. Older canvases stored a bare
// array of strokes — keep reading those as { paths, stickers: [] }.
function parseCanvasData(snapshot_url) {
  if (!snapshot_url) return { paths: [], stickers: [] };
  try {
    const parsed = JSON.parse(snapshot_url);
    if (Array.isArray(parsed)) return { paths: parsed, stickers: [] };
    if (parsed && typeof parsed === 'object') {
      return {
        paths: Array.isArray(parsed.paths) ? parsed.paths : [],
        stickers: Array.isArray(parsed.stickers) ? parsed.stickers : [],
      };
    }
  } catch {
    // old SVG-data-URL format or garbage — treat as empty
  }
  return { paths: [], stickers: [] };
}

export const CanvasService = {
  // Returns { paths, stickers, canvasId } — canvasId is the canvas document's
  // own ID, needed for subsequent PATCH calls.
  async getCanvas(spaceId, token) {
    const res = await fetch(
      `${BASE_URL}/canvases?space_id=${encodeURIComponent(spaceId)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      res.text().then((t) => console.log('[CanvasService] GET failed', res.status, t));
      return { paths: [], stickers: [], canvasId: null };
    }
    const data = await res.json();
    const record = Array.isArray(data) ? data[0] : data;
    const { paths, stickers } = parseCanvasData(record?.snapshot_url);
    return {
      paths,
      stickers,
      canvasId: record?.canvas_id || record?.id || record?._id || null,
    };
  },

  async saveCanvas(canvasId, { paths, stickers }, token) {
    const payload = JSON.stringify({
      canvas_id: canvasId,
      snapshot_url: JSON.stringify({ paths, stickers }),
    });
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
