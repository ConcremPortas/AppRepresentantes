import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchOrcamentos, fetchOrcamentosAdmin, fetchOrcamentosOperador } from '@/services/orcamentos';

export function useOrcamentos() {
  const { user } = useAuth();
  const admin    = user?.usuario?.admin    ?? false;
  const operador = user?.usuario?.operador ?? false;
  const uid      = user?.usuario?.id;

  return useQuery({
    queryKey: ['orcamentos', { uid, admin, operador }],
    queryFn:  () => {
      if (admin)    return fetchOrcamentosAdmin();
      if (operador) return fetchOrcamentosOperador();
      return fetchOrcamentos(uid!);
    },
    enabled:  !!uid,
    staleTime: 1000 * 60 * 2,
  });
}
