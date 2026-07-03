// ─────────────────────────────────────────────────────────────────────────────
// Estado persistente do centro de alertas (por usuário, em localStorage):
// preferências por tipo, canais (som/vibração/banner/tela bloqueada),
// silenciamento temporário, lidas, excluídas e "já notificados".
// Store com pub-sub para sincronizar sino, aba Alertas e a própria tela
// via useSyncExternalStore.
// ─────────────────────────────────────────────────────────────────────────────
import { ALERT_TIPOS, type AlertTipo } from './registry';

export interface Canais {
  som: boolean;
  vibracao: boolean;
  banner: boolean;
  telaBloqueada: boolean;
}

export interface AlertState {
  prefs: Record<AlertTipo, boolean>;
  canais: Canais;
  muteAte: number | null;            // timestamp (ms) até quando silenciar
  lidas: Record<string, number>;     // alertId → quando foi lida
  excluidas: Record<string, number>; // alertId → quando foi excluída (swipe)
  vistos: Record<string, number>;    // alertId → já disparou som/banner
}

const RETENCAO_MS = 90 * 86_400_000; // poda entradas com mais de 90 dias

function defaultState(): AlertState {
  return {
    prefs: Object.fromEntries(ALERT_TIPOS.map(t => [t, true])) as Record<AlertTipo, boolean>,
    canais: { som: true, vibracao: true, banner: true, telaBloqueada: true },
    muteAte: null,
    lidas: {},
    excluidas: {},
    vistos: {},
  };
}

let userId = '';
let state: AlertState = defaultState();
const listeners = new Set<() => void>();

function storageKey() {
  return `concrem_alertas_${userId || 'anon'}`;
}

function prune(map: Record<string, number>): Record<string, number> {
  const limite = Date.now() - RETENCAO_MS;
  return Object.fromEntries(Object.entries(map).filter(([, ts]) => ts > limite));
}

function load(): AlertState {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<AlertState>;
    const base = defaultState();
    return {
      prefs:  { ...base.prefs, ...(parsed.prefs ?? {}) },
      canais: { ...base.canais, ...(parsed.canais ?? {}) },
      muteAte: parsed.muteAte ?? null,
      lidas:     prune(parsed.lidas ?? {}),
      excluidas: prune(parsed.excluidas ?? {}),
      vistos:    prune(parsed.vistos ?? {}),
    };
  } catch {
    return defaultState();
  }
}

function persist() {
  try { localStorage.setItem(storageKey(), JSON.stringify(state)); } catch { /* quota */ }
}

function emit() {
  persist();
  for (const l of listeners) l();
}

// ─── API do store ────────────────────────────────────────────────────────────
export const alertStore = {
  /** Troca o usuário ativo (chamar quando a sessão carrega). */
  setUser(id: string) {
    if (id === userId) return;
    userId = id;
    state = load();
    for (const l of listeners) l();
  },

  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  getSnapshot(): AlertState {
    return state;
  },

  marcarLida(id: string) {
    if (state.lidas[id]) return;
    state = { ...state, lidas: { ...state.lidas, [id]: Date.now() } };
    emit();
  },

  marcarTodasLidas(ids: string[]) {
    const agora = Date.now();
    const lidas = { ...state.lidas };
    for (const id of ids) lidas[id] = agora;
    state = { ...state, lidas };
    emit();
  },

  excluir(id: string) {
    state = {
      ...state,
      excluidas: { ...state.excluidas, [id]: Date.now() },
      lidas: { ...state.lidas, [id]: Date.now() },
    };
    emit();
  },

  setPref(tipo: AlertTipo, on: boolean) {
    state = { ...state, prefs: { ...state.prefs, [tipo]: on } };
    emit();
  },

  setCanal(canal: keyof Canais, on: boolean) {
    state = { ...state, canais: { ...state.canais, [canal]: on } };
    emit();
  },

  /** Silencia sons/banners por N minutos (null = reativar). As notificações continuam chegando. */
  silenciar(minutos: number | null) {
    state = { ...state, muteAte: minutos ? Date.now() + minutos * 60_000 : null };
    emit();
  },

  isMuted(): boolean {
    return state.muteAte !== null && Date.now() < state.muteAte;
  },

  /** Marca alertas como "já notificados" (som/banner só dispara uma vez por alerta). */
  registrarVistos(ids: string[]) {
    if (ids.length === 0) return;
    const agora = Date.now();
    const vistos = { ...state.vistos };
    for (const id of ids) vistos[id] = agora;
    state = { ...state, vistos };
    emit();
  },
};
