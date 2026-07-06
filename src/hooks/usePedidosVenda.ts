import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchPedidosVenda, fetchPedidosCompleto, fetchRepresentantesUnicos, fetchSituacoesEntrega, type FetchPedidosParams } from '@/services/pedidosVenda';
import { useDataScope } from '@/hooks/useDataScope';

export function usePedidosVenda(params: Omit<FetchPedidosParams, 'repCodes' | 'admin' | 'grupos'> = {}) {
  const { user } = useAuth();
  const { admin, repCodes, grupos, scopeKey } = useDataScope();

  return useQuery({
    queryKey: ['pedidos-venda', { ...params, scopeKey }],
    queryFn: () => fetchPedidosVenda({ ...params, repCodes, admin, grupos }),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
}

/** Conjunto filtrado completo (até CENTRAL_CAP) para a Central de Pedidos. */
export function usePedidosCompleto(params: Omit<FetchPedidosParams, 'repCodes' | 'admin' | 'grupos' | 'page'> = {}) {
  const { user } = useAuth();
  const { admin, repCodes, grupos, scopeKey } = useDataScope();

  return useQuery({
    queryKey: ['pedidos-completo', { ...params, scopeKey }],
    queryFn: () => fetchPedidosCompleto({ ...params, repCodes, admin, grupos }),
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
