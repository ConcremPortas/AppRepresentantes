import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { User, Representante, Usuario, RepresentanteERP } from '@/types';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  isAuthenticated: boolean;
  login: (credentials: { email: string; password: string }) => Promise<{ error: string | null }>;
  logout: () => void;
  updateRepresentante: (updates: Partial<Representante>) => void;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const SESSION_KEY = 'concrem_session';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

const MOCK_USER: User = {
  id: 'rep-001',
  email: 'joao.silva@concrem.com.br',
  representante: {
    id: 'rep-001',
    nome: 'João Silva',
    email: 'joao.silva@concrem.com.br',
    telefone: '(11) 99999-0001',
    regiao: 'São Paulo - Capital',
    comissao_percentual: 3.5,
    meta_mensal: 500000,
    ativo: true,
    created_at: '2023-01-15T00:00:00Z',
  },
};

// ─── Helpers de sessão ────────────────────────────────────────────────────────

interface StoredSession {
  id: string;
  nome: string;
  email: string;
  admin: boolean;
  operador: boolean;
  repCodes: RepresentanteERP[];
}

function saveSession(s: StoredSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function sessionToUser(s: StoredSession): User {
  const usuario: Usuario = {
    id: s.id,
    nome: s.nome,
    email: s.email,
    admin: s.admin,
    operador: s.operador ?? false,
    ativo: true,
    created_at: '',
  };

  const representante: Representante = {
    id: s.id,
    nome: s.nome,
    email: s.email,
    telefone: '',
    regiao: '',
    comissao_percentual: s.repCodes[0]?.comissao_percentual ?? 0,
    meta_mensal: 0,
    ativo: true,
    created_at: '',
  };

  return { id: s.id, email: s.email, usuario, representante, repCodes: s.repCodes };
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(() => {
    if (USE_MOCK) return { user: MOCK_USER, loading: false, error: null };
    const stored = loadSession();
    return { user: stored ? sessionToUser(stored) : null, loading: false, error: null };
  });

  useEffect(() => {
    if (USE_MOCK) return;
    const stored = loadSession();
    if (stored) {
      setAuthState({ user: sessionToUser(stored), loading: false, error: null });
    }
  }, []);

  const login = useCallback(async ({ email, password }: { email: string; password: string }) => {
    if (USE_MOCK) {
      setAuthState({ user: MOCK_USER, loading: false, error: null });
      return { error: null };
    }

    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    const { data, error } = await supabase.rpc('login', {
      p_email: email,
      p_senha: password,
    });

    if (error) {
      setAuthState(prev => ({ ...prev, loading: false, error: error.message }));
      return { error: error.message };
    }

    if (data?.error) {
      setAuthState(prev => ({ ...prev, loading: false, error: data.error }));
      return { error: data.error as string };
    }

    const session: StoredSession = {
      id:       data.id,
      nome:     data.nome,
      email:    data.email,
      admin:    data.admin,
      operador: data.operador ?? false,
      repCodes: data.rep_codes ?? [],
    };

    saveSession(session);
    setAuthState({ user: sessionToUser(session), loading: false, error: null });
    return { error: null };
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setAuthState({ user: null, loading: false, error: null });
  }, []);

  const updateRepresentante = useCallback((updates: Partial<Representante>) => {
    setAuthState(prev => {
      if (!prev.user) return prev;
      return {
        ...prev,
        user: {
          ...prev.user,
          representante: prev.user.representante
            ? { ...prev.user.representante, ...updates }
            : undefined,
        },
      };
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      ...authState,
      isAuthenticated: !!authState.user,
      login,
      logout,
      updateRepresentante,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
