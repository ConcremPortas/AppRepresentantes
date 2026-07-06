import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchCarteira, fetchClientePedidos } from '@/services/carteira';
import { useDataScope } from '@/hooks/useDataScope';

export function useCarteira(representante?: string) {
  const { user } = useAuth();
  const { admin, repCodes, grupos, scopeKey } = useDataScope();

  const rep = representante && representante !== 'todos' ? representante : undefined;

  return useQuery({
    queryKey: ['carteira', { scopeKey, rep }],
    queryFn:  () => fetchCarteira({ repCodes, admin, grupos, representante: rep }),
    enabled:  !!user,
    staleTime: 1000 * 60 * 10, // 10 min — dados de carteira mudam pouco
  });
}

/** Pedidos individuais de um cliente (para o painel de inteligência da Carteira). */
export function useClientePedidos(cnpj?: string | null) {
  const { user } = useAuth();
  const { admin, repCodes, grupos, scopeKey } = useDataScope();

  return useQuery({
    queryKey: ['cliente-pedidos', cnpj, { scopeKey }],
    queryFn:  () => fetchClientePedidos({ cnpj: cnpj!, repCodes, admin, grupos }),
    enabled:  !!user && !!cnpj,
    staleTime: 1000 * 60 * 10,
  });
}
