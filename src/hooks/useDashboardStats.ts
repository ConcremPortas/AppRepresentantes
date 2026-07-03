import { useQuery } from '@tanstack/react-query';
import { fetchDashboardStats, type PeriodoFiltro } from '@/services/dashboard';
import { useAuth } from '@/hooks/useAuth';

interface Params {
  periodo?: PeriodoFiltro;
  ano?: number;
  mes?: number;            // 1-12 (quando periodo = 'mes')
  trimestre?: number;      // 1-4 (quando periodo = 'trimestre')
  representante?: string;  // 'todos' ou vazio = sem filtro
}

export function useDashboardStats({ periodo = 'mes', ano, mes, trimestre, representante }: Params = {}) {
  const { user } = useAuth();
  const isAdmin  = user?.usuario?.admin ?? false;
  const repCodes = (user?.repCodes ?? []).map(r => r.representante_erp);

  const rep = representante && representante !== 'todos' ? representante : undefined;

  return useQuery({
    queryKey: ['dashboard-stats', repCodes.join(','), isAdmin, periodo, ano, mes, trimestre, rep ?? 'todos'],
    queryFn:  () => fetchDashboardStats(repCodes, isAdmin, { periodo, ano, mes, trimestre, representante: rep }),
    staleTime: 5 * 60 * 1000,   // 5 min
    enabled:  isAdmin || repCodes.length > 0,
  });
}
