import { useQuery } from '@tanstack/react-query';
import { fetchDashboardStats, type PeriodoFiltro } from '@/services/dashboard';
import { useDataScope } from '@/hooks/useDataScope';

interface Params {
  periodo?: PeriodoFiltro;
  ano?: number;
  mes?: number;            // 1-12 (quando periodo = 'mes')
  trimestre?: number;      // 1-4 (quando periodo = 'trimestre')
  representante?: string;  // 'todos' ou vazio = sem filtro
}

export function useDashboardStats({ periodo = 'mes', ano, mes, trimestre, representante }: Params = {}) {
  const { admin, repCodes, grupos, scopeKey } = useDataScope();

  const rep = representante && representante !== 'todos' ? representante : undefined;

  return useQuery({
    queryKey: ['dashboard-stats', scopeKey, periodo, ano, mes, trimestre, rep ?? 'todos'],
    queryFn:  () => fetchDashboardStats(repCodes, admin, { periodo, ano, mes, trimestre, representante: rep }, grupos),
    staleTime: 5 * 60 * 1000,   // 5 min
    enabled:  admin || grupos != null || repCodes.length > 0,
  });
}
