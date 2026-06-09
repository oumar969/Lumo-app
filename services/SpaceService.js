const BASE_URL = 'https://lumo-api-zeta.vercel.app/api';

export const SpaceService = {
  async getSpaces(token) {
    const res = await fetch(`${BASE_URL}/spaces`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Kunne ikke hente spaces');
    return res.json();
  },

  async getSpace(id, token) {
    const res = await fetch(`${BASE_URL}/spaces/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Kunne ikke hente space');
    return res.json();
  },

  async createSpace(name, token, coverImage = null) {
    const body = { name };
    if (coverImage) body.cover_image = coverImage;
    const res = await fetch(`${BASE_URL}/spaces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Kunne ikke oprette space');
    return res.json();
  },

  async joinSpace(invite_code, token) {
    const res = await fetch(`${BASE_URL}/spaces/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ invite_code }),
    });
    if (!res.ok) throw new Error('Ugyldig kode. Prøv igen.');
    return res.json();
  },
};
