const BASE_URL = 'https://lumo-api-zeta.vercel.app/api';

async function readError(res, fallback) {
  const data = await res.json().catch(() => ({}));
  return new Error(data.error || fallback);
}

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

  async getUser(id, token) {
    const res = await fetch(`${BASE_URL}/users/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw await readError(res, 'Kunne ikke hente bruger');
    return res.json();
  },

  async updateProfile({ display_name, username, bio, status, avatar_url }, token) {
    const body = {};
    if (display_name !== undefined) body.display_name = display_name;
    if (username !== undefined) body.username = username;
    if (bio !== undefined) body.bio = bio;
    if (status !== undefined) body.status = status;
    if (avatar_url !== undefined) body.avatar_url = avatar_url;

    const res = await fetch(`${BASE_URL}/users`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await readError(res, 'Kunne ikke opdatere profil');
    return res.json();
  },

  async deleteAccount(token) {
    const res = await fetch(`${BASE_URL}/users`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw await readError(res, 'Kunne ikke slette konto');
    return res.json();
  },
};
