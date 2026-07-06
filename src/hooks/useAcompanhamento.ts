import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchAcompanhamento } from '@/services/acompanhamento';
import { useDataScope } from '@/hooks/useDataScope';

export function useAcompanhamento() {
  const { user } = useAuth();
  const { admin, repCodes, grupos, scopeKey } = useDataScope();

  return useQuery({
    queryKey: ['acompanhamento', { scopeKey }],
    queryFn:  () => fetchAcompanhamento(repCodes, admin, grupos),
    enabled:  !!user,
    staleTime: 1000 * 60 * 3,
  });
}
