import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchPedidosComAnexos, fetchFinanceiro } from '@/services/financeiro';
import { useDataScope } from '@/hooks/useDataScope';

export function useFinanceiroAnexos() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['financeiro-anexos', user?.id],
    queryFn: () => fetchPedidosComAnexos(),
    enabled: !!user?.id,
  });
}

/** Central Financeira: pedidos com anexos + faturados sem documentação. */
export function useFinanceiro() {
  const { user } = useAuth();
  const { admin, repCodes, grupos, scopeKey } = useDataScope();
  return useQuery({
    queryKey: ['financeiro-central', { scopeKey }],
    queryFn: () => fetchFinanceiro({ repCodes, admin, grupos }),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
}
