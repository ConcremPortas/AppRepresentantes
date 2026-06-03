import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
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
  renewSession: () => void;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const SESSION_KEY = 'concrem_session';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

const MOCK_USER: User = {
  id: 'mock-rep-001',
  email: 'joao.silva@concrem.com.br',
  usuario: {
    id: 'mock-rep-001',
    nome: 'João Silva (Mock)',
    email: 'joao.silva@concrem.com.br',
    admin: false,
    operador: false,
    ativo: true,
    created_at: '',
  },
  representante: {
    id: 'mock-rep-001',
    nome: 'João Silva (Mock)',
    email: 'joao.silva@concrem.com.br',
    telefone: '',
    regiao: '',
    comissao_percentual: 3.5,
    meta_mensal: 0,
    ativo: true,
    created_at: '',
  },
  repCodes: [
    {
      id: 'mock-rep-code-001',
      codigo: 'REP-001',
      nome_erp: 'João Silva (Mock)',
      representante_erp: 'REP-001',
      comissao_percentual: 3.5,
      ativo: true,
      created_at: '',
    },
  ],
};

// ─── Helpers de sessão ────────────────────────────────────────────────────────

interface StoredSession {
  id: string;
  nome: string;
  email: string;
  admin: boolean;
  operador: boolean;
  repCodes: RepresentanteERP[];
  expires_at: number;
}

const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 horas em ms

function saveSession(s: StoredSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    ...s,
    expires_at: Date.now() + SESSION_DURATION,
  }));
}

function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredSession;
    if (stored.expires_at && Date.now() > stored.expires_at) {
      clearSession();
      return null;
    }
    return stored;
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
      id:         data.id,
      nome:       data.nome,
      email:      data.email,
      admin:      data.admin,
      operador:   data.operador ?? false,
      repCodes:   data.rep_codes ?? [],
      expires_at: Date.now() + SESSION_DURATION,
    };

    saveSession(session);
    setAuthState({ user: sessionToUser(session), loading: false, error: null });
    return { error: null };
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setAuthState({ user: null, loading: false, error: null });
  }, []);

  const renewSession = useCallback(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return;
    try {
      const stored = JSON.parse(raw) as StoredSession;
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        ...stored,
        expires_at: Date.now() + SESSION_DURATION,
      }));
    } catch {
      // sessão corrompida — ignora
    }
  }, []);

  // Verifica expiração a cada 60 segundos
  useEffect(() => {
    if (USE_MOCK) return;
    const interval = setInterval(() => {
      const stored = loadSession();
      if (!stored) {
        logout();
      }
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [logout]);

  // Renova sessão por atividade do usuário (throttle de 5 minutos)
  const lastRenewRef = useRef<number>(0);
  useEffect(() => {
    if (USE_MOCK) return;
    const THROTTLE = 5 * 60 * 1000;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastRenewRef.current > THROTTLE) {
        lastRenewRef.current = now;
        renewSession();
      }
    };
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
    };
  }, [renewSession]);

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
      renewSession,
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
