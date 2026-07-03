import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchPedidosVenda, fetchPedidosCompleto, fetchRepresentantesUnicos, fetchSituacoesEntrega, type FetchPedidosParams } from '@/services/pedidosVenda';

export function usePedidosVenda(params: Omit<FetchPedidosParams, 'repCodes' | 'admin'> = {}) {
  const { user } = useAuth();
  const admin   = user?.usuario?.admin ?? false;
  const repCodes = (user?.repCodes ?? []).map(r => r.representante_erp);

  return useQuery({
    queryKey: ['pedidos-venda', { ...params, repCodes, admin }],
    queryFn: () => fetchPedidosVenda({ ...params, repCodes, admin }),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
}

/** Conjunto filtrado completo (até CENTRAL_CAP) para a Central de Pedidos. */
export function usePedidosCompleto(params: Omit<FetchPedidosParams, 'repCodes' | 'admin' | 'page'> = {}) {
  const { user } = useAuth();
  const admin   = user?.usuario?.admin ?? false;
  const repCodes = (user?.repCodes ?? []).map(r => r.representante_erp);

  return useQuery({
    queryKey: ['pedidos-completo', { ...params, repCodes, admin }],
    queryFn: () => fetchPedidosCompleto({ ...params, repCodes, admin }),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
}

export function useRepresentantesUnicos() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['representantes-unicos'],
    queryFn: fetchRepresentantesUnicos,
    enabled: !!user,
    staleTime: 1000 * 60 * 30,
  });
}

export function useSituacoesEntrega() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['situacoes-entrega'],
    queryFn: fetchSituacoesEntrega,
    enabled: !!user,
    staleTime: 1000 * 60 * 60,
  });
}
