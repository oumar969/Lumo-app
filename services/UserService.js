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
};
