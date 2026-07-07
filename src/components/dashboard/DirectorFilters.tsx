import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { normalizaGrupo } from '@/services/scope';

// ─── Etapas do pipeline (compartilhado por FilterBar + PipelineGargalos) ───
export const PIPELINE_STAGES: { key: string; label: string; color: string }[] = [
  { key: 'aprovado',   label: 'Aprovado',   color: '#3b82f6' },
  { key: 'liberado',   label: 'Liberado',   color: '#8b5cf6' },
  { key: 'mapeamento', label: 'Mapeamento', color: '#a855f7' },
  { key: 'ferragem',   label: 'Ferragem',   color: '#f97316' },
  { key: 'comercial',  label: 'Comercial',  color: '#6366f1' },
  { key: 'producao',   label: 'Produção',   color: '#f59e0b' },
  { key: 'faturado',   label: 'Faturado',   color: '#14b8a6' },
  { key: 'entrega',    label: 'Entrega',    color: '#0ea5e9' },
  { key: 'finalizado', label: 'Finalizado', color: '#22c55e' },
];

// ─── Estado dos filtros ────────────────────────────────────
export interface DirectorFilters {
  grupo: string;
  rep: string;
  uf: string;
  status: string;
}
const DEFAULT: DirectorFilters = { grupo: '', rep: '', uf: '', status: '' };

interface Ctx {
  filters: DirectorFilters;
  set: (patch: Partial<DirectorFilters>) => void;
  clear: () => void;
  active: number;
}
const FiltersContext = createContext<Ctx | null>(null);

export function DirectorFiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<DirectorFilters>(DEFAULT);
  const value = useMemo<Ctx>(() => ({
    filters,
    set: (patch) => setFilters(f => ({ ...f, ...patch })),
    clear: () => setFilters(DEFAULT),
    active: Object.values(filters).filter(Boolean).length,
  }), [filters]);
  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useDirectorFilters(): Ctx {
  return useContext(FiltersContext) ?? { filters: DEFAULT, set: () => {}, clear: () => {}, active: 0 };
}

// ─── Aplicação dos filtros a um conjunto de pedidos ────────
interface Filtravel {
  grupo_cliente?: string | null;
  representante?: string | null;
  cliente_uf?: string | null;
  status?: string;
}
export function applyPedidoFilters<T extends Filtravel>(
  rows: T[],
  f: DirectorFilters,
  opts?: { ignoreStatus?: boolean },
): T[] {
  const anyActive = f.grupo || f.rep || f.uf || (!opts?.ignoreStatus && f.status);
  if (!anyActive) return rows;
  return rows.filter(p => {
    if (f.grupo && normalizaGrupo(p.grupo_cliente) !== f.grupo) return false;
    if (f.rep && (p.representante ?? '') !== f.rep) return false;
    if (f.uf && (p.cliente_uf ?? '') !== f.uf) return false;
    if (!opts?.ignoreStatus && f.status && p.status !== f.status) return false;
    return true;
  });
}
