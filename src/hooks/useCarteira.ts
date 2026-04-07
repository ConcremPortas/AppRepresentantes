import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchCarteira } from '@/services/carteira';

export function useCarteira() {
  const { user } = useAuth();
  const admin    = user?.usuario?.admin ?? false;
  const repCodes = (user?.repCodes ?? []).map(r => r.representante_erp);

  return useQuery({
    queryKey: ['carteira', { repCodes, admin }],
    queryFn:  () => fetchCarteira({ repCodes, admin }),
    enabled:  !!user,
    staleTime: 1000 * 60 * 10, // 10 min — dados de carteira mudam pouco
  });
}
