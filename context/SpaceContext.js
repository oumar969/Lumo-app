import { createContext, useContext, useState, useCallback } from 'react';
import { SpaceService } from '../services/SpaceService';
import { Space } from '../models/Space';
import { useAuth } from './AuthContext';

const SpaceContext = createContext(null);

export function SpaceProvider({ children }) {
  const { getToken } = useAuth();
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeSpace, setActiveSpace] = useState(null);

  const fetchSpaces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const data = await SpaceService.getSpaces(token);
      setSpaces((Array.isArray(data) ? data : []).map((s) => new Space(s)));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const createSpace = useCallback(async (name, coverImage = null) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const data = await SpaceService.createSpace(name, token, coverImage);
      const space = new Space(data);
      setSpaces((prev) => [space, ...prev]);
      return space;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const joinSpace = useCallback(async (invite_code) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const data = await SpaceService.joinSpace(invite_code, token);
      const space = new Space(data);
      setSpaces((prev) => [space, ...prev]);
      return space;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  return (
    <SpaceContext.Provider value={{
      spaces, loading, error,
      activeSpace, setActiveSpace,
      fetchSpaces, createSpace, joinSpace,
    }}>
      {children}
    </SpaceContext.Provider>
  );
}

export const useSpaces = () => useContext(SpaceContext);
