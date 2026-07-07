import { useQuery } from '@tanstack/react-query';
import { fetchRepPerformance, fetchGroupPerformance } from '@/services/performance';
import { useDataScope } from '@/hooks/useDataScope';

export function useRepPerformance(enabled = true) {
  const { admin, grupos, scopeKey } = useDataScope();
  return useQuery({
    queryKey: ['rep-performance', scopeKey],
    queryFn: () => fetchRepPerformance(grupos, admin),
    enabled: enabled && (admin || grupos != null),
    staleTime: 1000 * 60 * 5,
  });
}

export function useGroupPerformance(enabled = true) {
  const { admin, grupos, scopeKey } = useDataScope();
  return useQuery({
    queryKey: ['group-performance', scopeKey],
    queryFn: () => fetchGroupPerformance(grupos, admin),
    enabled: enabled && (admin || grupos != null),
    staleTime: 1000 * 60 * 5,
  });
}
