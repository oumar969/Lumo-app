import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthService } from '../services/AuthService';
import { UserService } from '../services/UserService';
import { PresenceService } from '../services/PresenceService';

const AuthContext = createContext(null);

const HEARTBEAT_INTERVAL_MS = 30000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Tell the backend "I'm online" while logged in — drives presence indicators.
  useEffect(() => {
    if (!user) return;

    async function beat() {
      try {
        const token = await user.getIdToken();
        await PresenceService.heartbeat(token);
      } catch {
        // best-effort — a missed beat just means we look offline a bit longer
      }
    }

    beat();
    const intervalId = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [user]);

  // Always returns a fresh token — Firebase auto-refreshes before expiry
  const getToken = useCallback(async () => {
    if (!user) return null;
    return user.getIdToken();
  }, [user]);

  async function register(email, password) {
    const result = await AuthService.register(email, password);
    const token = await result.user.getIdToken();
    // Best-effort — don't block login if backend is down
    try { await UserService.saveUser(token); } catch {}
    return result;
  }

  async function login(email, password) {
    const result = await AuthService.login(email, password);
    const token = await result.user.getIdToken();
    try { await UserService.saveUser(token); } catch {}
    return result;
  }

  async function logout() {
    await AuthService.logout();
  }

  return (
    <AuthContext.Provider value={{ user, loading, getToken, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
