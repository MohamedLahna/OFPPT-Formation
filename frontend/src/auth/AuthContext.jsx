import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('ofppt_token')));
  const token = localStorage.getItem('ofppt_token');
  const refresh = async () => {
    if (!localStorage.getItem('ofppt_token')) { setLoading(false); return null; }
    try { const { data } = await api.get('/me'); setUser(data.user); return data.user; }
    catch {
      localStorage.removeItem('ofppt_token');
      setUser(null);
      return null;
    }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);
const login = async (payload) => {
    try {
      const { data } = await api.post('/login', payload);
      localStorage.setItem('ofppt_token', data.token);
      setUser(data.user);
      return data;
    } catch (error) {
      console.error("Erreur Backend exacte :", error.response || error);
      throw error;
    }
  };
  const logout = async () => { try { await api.post('/logout'); } catch {} localStorage.removeItem('ofppt_token'); setUser(null); };
  const value = useMemo(() => ({ user, setUser, loading, token, login, logout, refresh }), [user, loading, token]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
