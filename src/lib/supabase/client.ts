import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

// ─── Persistência de sessão configurável ("permanecer conectado") ──────────────
// A sessão é gerenciada pelo Supabase Auth (GoTrue). Onde ela é guardada decide
// se o login sobrevive ao fechamento do app:
//   • marcado   → localStorage  → persiste após fechar o app.
//   • desmarcado→ sessionStorage→ apagado ao fechar a aba/janela (sessão encerra).
// A leitura procura nos dois lugares, então um reload (F5) na mesma janela mantém
// o usuário logado; só o fechamento da janela encerra quando não é "permanecer".
const REMEMBER_KEY = 'concrem_remember';

function persistInLocal(): boolean {
  try { return localStorage.getItem(REMEMBER_KEY) === '1'; } catch { return false; }
}

/** Define, ANTES do login, se a sessão deve persistir após fechar o app. */
export function setSessionPersistence(remember: boolean): void {
  try {
    if (remember) localStorage.setItem(REMEMBER_KEY, '1');
    else localStorage.removeItem(REMEMBER_KEY);
  } catch { /* storage indisponível */ }
}

/** Preferência atual (para inicializar o checkbox no login). */
export function getSessionPersistence(): boolean {
  return persistInLocal();
}

// Storage híbrido: lê de onde estiver; grava no destino conforme a preferência.
const hybridStorage = {
  getItem: (key: string): string | null => {
    try { return sessionStorage.getItem(key) ?? localStorage.getItem(key); }
    catch { return null; }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (persistInLocal()) {
        localStorage.setItem(key, value);
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, value);
        localStorage.removeItem(key);
      }
    } catch { /* quota / indisponível */ }
  },
  removeItem: (key: string): void => {
    try { localStorage.removeItem(key); sessionStorage.removeItem(key); }
    catch { /* indisponível */ }
  },
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: hybridStorage,
  },
});
