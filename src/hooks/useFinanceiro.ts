import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchPedidosComAnexos, fetchFinanceiro } from '@/services/financeiro';

export function useFinanceiroAnexos() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['financeiro-anexos', user?.id],
    queryFn: fetchPedidosComAnexos,
    enabled: !!user?.id,
  });
}

/** Central Financeira: pedidos com anexos + faturados sem documentação. */
export function useFinanceiro() {
  const { user } = useAuth();
  const admin = user?.usuario?.admin ?? false;
  const repCodes = (user?.repCodes ?? []).map(r => r.representante_erp);
  return useQuery({
    queryKey: ['financeiro-central', { repCodes, admin }],
    queryFn: () => fetchFinanceiro({ repCodes, admin }),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
}
