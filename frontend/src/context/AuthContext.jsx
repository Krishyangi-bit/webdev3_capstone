import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/authService';
import { onSessionExpired, setAccessToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | authenticated | guest

  // Restore the session from the HttpOnly refresh cookie on first load.
  useEffect(() => {
    let active = true;
    authService
      .restoreSession()
      .then((restored) => {
        if (!active) return;
        setUser(restored);
        setStatus('authenticated');
      })
      .catch(() => active && setStatus('guest'));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    onSessionExpired(() => {
      setAccessToken(null);
      setUser(null);
      setStatus('guest');
    });
  }, []);

  const login = useCallback(async (credentials) => {
    const signedIn = await authService.login(credentials);
    setUser(signedIn);
    setStatus('authenticated');
    return signedIn;
  }, []);

  const register = useCallback(async (form) => {
    const created = await authService.register(form);
    setUser(created);
    setStatus('authenticated');
    return created;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setStatus('guest');
    }
  }, []);

  const value = useMemo(
    () => ({ user, status, login, register, logout, setUser }),
    [user, status, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
