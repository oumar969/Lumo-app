// Giphy's public beta key — free for development/testing, no account needed.
const GIPHY_API_KEY = 'dc6zaTOxFJmzC';
const BASE_URL = 'https://api.giphy.com/v1/gifs/search';

export const GifService = {
  // Returns a list of { id, previewUri, uri, width, height }. previewUri is
  // a small/looping preview for the picker grid; uri is the full-quality GIF
  // to place on the canvas (kept as a remote URL — never downloaded as base64
  // — so synced canvas snapshots stay tiny).
  async search(query, limit = 12) {
    const params = new URLSearchParams({
      api_key: GIPHY_API_KEY,
      q: query,
      limit: String(limit),
      rating: 'g',
    });

    const res = await fetch(`${BASE_URL}?${params.toString()}`);
    if (!res.ok) throw new Error('Kunne ikke hente GIFs');

    const data = await res.json();
    const results = Array.isArray(data?.data) ? data.data : [];
    return results
      .map((r) => {
        const full = r.images?.original;
        const preview = r.images?.fixed_height || full;
        if (!full?.url || !preview?.url) return null;
        return {
          id: r.id,
          previewUri: preview.url,
          uri: full.url,
          width: Number(full.width) || 200,
          height: Number(full.height) || 200,
        };
      })
      .filter(Boolean);
  },
};
