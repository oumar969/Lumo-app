import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const ERROR_MESSAGES = {
  'auth/email-already-in-use': 'E-mail adressen er allerede i brug.',
  'auth/invalid-email': 'Ugyldig e-mail adresse.',
  'auth/weak-password': 'Adgangskoden skal være mindst 6 tegn.',
  'auth/user-not-found': 'Ingen konto fundet med denne e-mail.',
  'auth/wrong-password': 'Forkert adgangskode.',
  'auth/invalid-credential': 'Forkert e-mail eller adgangskode.',
  'auth/operation-not-allowed': 'E-mail/adgangskode login er ikke aktiveret. Aktivér det i Firebase Console → Authentication → Sign-in providers.',
  'auth/too-many-requests': 'For mange forsøg. Prøv igen om lidt.',
  'auth/network-request-failed': 'Netværksfejl. Tjek din forbindelse.',
};

function translateError(code) {
  return ERROR_MESSAGES[code] ?? 'Noget gik galt. Prøv igen.';
}

export function useAuthController() {
  const { login, register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleLogin(email, password) {
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
      return true;
    } catch (e) {
      setError(translateError(e.code));
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(email, password) {
    setLoading(true);
    setError(null);
    try {
      await register(email.trim(), password);
      return true;
    } catch (e) {
      setError(translateError(e.code));
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { loading, error, setError, handleLogin, handleRegister };
}
