import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchCarteira, fetchClientePedidos } from '@/services/carteira';

export function useCarteira(representante?: string) {
  const { user } = useAuth();
  const admin    = user?.usuario?.admin ?? false;
  const repCodes = (user?.repCodes ?? []).map(r => r.representante_erp);

  const rep = representante && representante !== 'todos' ? representante : undefined;

  return useQuery({
    queryKey: ['carteira', { repCodes, admin, rep }],
    queryFn:  () => fetchCarteira({ repCodes, admin, representante: rep }),
    enabled:  !!user,
    staleTime: 1000 * 60 * 10, // 10 min — dados de carteira mudam pouco
  });
}

/** Pedidos individuais de um cliente (para o painel de inteligência da Carteira). */
export function useClientePedidos(cnpj?: string | null) {
  const { user } = useAuth();
  const admin    = user?.usuario?.admin ?? false;
  const repCodes = (user?.repCodes ?? []).map(r => r.representante_erp);

  return useQuery({
    queryKey: ['cliente-pedidos', cnpj, { repCodes, admin }],
    queryFn:  () => fetchClientePedidos({ cnpj: cnpj!, repCodes, admin }),
    enabled:  !!user && !!cnpj,
    staleTime: 1000 * 60 * 10,
  });
}
