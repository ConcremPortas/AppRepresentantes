import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchAcompanhamento } from '@/services/acompanhamento';

export function useAcompanhamento() {
  const { user } = useAuth();
  const admin    = user?.usuario?.admin ?? false;
  const repCodes = (user?.repCodes ?? []).map(r => r.representante_erp);

  return useQuery({
    queryKey: ['acompanhamento', { admin, repCodes }],
    queryFn:  () => fetchAcompanhamento(repCodes, admin),
    enabled:  !!user,
    staleTime: 1000 * 60 * 3,
  });
}
