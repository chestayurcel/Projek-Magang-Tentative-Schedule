import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

interface User {
  id: number;
  nipp: string;
  name: string;
  email: string;
  role: string;
  account_status: string;
  unit_id: number | null;
  unit?: { id: number; unit_name: string } | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Inisialisasi: Cek apakah ada sesi tersimpan di localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('kai_token');
    const savedUser = localStorage.getItem('kai_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (identifier: string, password: string): Promise<{ error?: string }> => {
    try {
      const res = await api.post('/auth/login', { identifier, password });
      const { token: newToken, user: userData } = res.data;

      // Simpan ke localStorage
      localStorage.setItem('kai_token', newToken);
      localStorage.setItem('kai_user', JSON.stringify(userData));

      // Update state
      setToken(newToken);
      setUser(userData);

      return {};
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Terjadi kesalahan saat menghubungi server.';
      return { error: errorMsg };
    }
  };

  const logout = () => {
    localStorage.removeItem('kai_token');
    localStorage.removeItem('kai_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!token,
      isLoading,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus digunakan di dalam <AuthProvider>');
  }
  return context;
}
