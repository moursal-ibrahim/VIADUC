import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('viaduc_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  const persist = useCallback((token, userData) => {
    localStorage.setItem('viaduc_token', token);
    localStorage.setItem('viaduc_user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const login = async (email, password) => {
    const { data } = await authApi.login({ email, password });
    persist(data.token, data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    localStorage.removeItem('viaduc_token');
    localStorage.removeItem('viaduc_user');
    setUser(null);
  };

  useEffect(() => {
    const token = localStorage.getItem('viaduc_token');
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then(({ data }) => {
        setUser(data);
        localStorage.setItem('viaduc_user', JSON.stringify(data));
      })
      .catch(() => {
        localStorage.removeItem('viaduc_token');
        localStorage.removeItem('viaduc_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin: user?.role === 'admin', isSeller: user?.role === 'seller' }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
