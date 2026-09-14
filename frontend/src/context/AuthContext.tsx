import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client';

interface User {
  id: number;
  email: string;
  name: string;
}

interface RegisterResult {
  message: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isSlowConnection: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  register: (name: string, email: string, password: string) => Promise<RegisterResult>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Flips true if the initial session check is taking a while - lets the UI
  // show "waking up the server..." instead of a bare, unexplained spinner
  // during a slow Render cold start (rather than looking frozen).
  const [isSlowConnection, setIsSlowConnection] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    const fetchCurrentUser = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      const slowTimer = setTimeout(() => {
        if (!cancelled) setIsSlowConnection(true);
      }, 4000);

      try {
        const res = await apiClient.get<User>('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) setUser(res.data);
      } catch (err: any) {
        // A timeout on the FIRST attempt is likely just the cold-start wake-up
        // request itself timing out - the instance is probably awake now, so
        // retry once before giving up. A second failure is treated as a
        // genuinely invalid/expired session.
        if (err.code === 'ECONNABORTED') {
          try {
            const retryRes = await apiClient.get<User>('/auth/me', {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!cancelled) setUser(retryRes.data);
          } catch (retryErr) {
            console.error('Failed to authenticate session (after retry)', retryErr);
            if (!cancelled) logout();
          }
        } else {
          console.error('Failed to authenticate session', err);
          if (!cancelled) logout();
        }
      } finally {
        clearTimeout(slowTimer);
        if (!cancelled) {
          setIsLoading(false);
          setIsSlowConnection(false);
        }
      }
    };

    fetchCurrentUser();
    return () => { cancelled = true; };
  }, [token]);

  const login = (newToken: string, userData: User) => {
    localStorage.setItem('access_token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
    setUser(null);
  };

  const updateUser = (userData: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...userData } : null));
  };

  const register = async (name: string, email: string, password: string): Promise<RegisterResult> => {
    const res = await apiClient.post<RegisterResult>('/auth/register', { name, email, password });
    return res.data;
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isSlowConnection, login, logout, updateUser, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};