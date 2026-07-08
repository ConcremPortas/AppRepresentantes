import { useQuery } from '@tanstack/react-query';
import { fetchRepPerformance, fetchGroupPerformance } from '@/services/performance';
import { periodoRange, type DashboardFiltros } from '@/services/dashboard';
import { useDataScope } from '@/hooks/useDataScope';

// period opcional: quando informado, receita/pedidos/ticket respeitam o período
// (a recência de clientes — ativos/atrasados/dormentes — permanece "atual").
export function useRepPerformance(period?: DashboardFiltros) {
  const { admin, grupos, scopeKey } = useDataScope();
  const range = period ? periodoRange(period) : null;
  const rk = range ? `${range.ini}_${range.fim}` : 'all';
  return useQuery({
    queryKey: ['rep-performance', scopeKey, rk],
    queryFn: () => fetchRepPerformance(grupos, admin, range),
    enabled: admin || grupos != null,
    staleTime: 1000 * 60 * 5,
  });
}

export function useGroupPerformance(period?: DashboardFiltros) {
  const { admin, grupos, scopeKey } = useDataScope();
  const range = period ? periodoRange(period) : null;
  const rk = range ? `${range.ini}_${range.fim}` : 'all';
  return useQuery({
    queryKey: ['group-performance', scopeKey, rk],
    queryFn: () => fetchGroupPerformance(grupos, admin, range),
    enabled: admin || grupos != null,
    staleTime: 1000 * 60 * 5,
  });
}
