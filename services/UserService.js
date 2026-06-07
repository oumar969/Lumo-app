const BASE_URL = 'https://lumo-api-zeta.vercel.app/api';

export const UserService = {
  async saveUser(token) {
    const res = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error('Kunne ikke gemme bruger');
    return res.json();
  },

  async getMe(token) {
    const res = await fetch(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Kunne ikke hente profil');
    return res.json();
  },

  async updateProfile({ display_name, avatar_url }, token) {
    const body = {};
    if (display_name !== undefined) body.display_name = display_name;
    if (avatar_url !== undefined) body.avatar_url = avatar_url;

    const res = await fetch(`${BASE_URL}/users`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Kunne ikke opdatere profil');
    return res.json();
  },
};
