import { useQuery } from '@tanstack/react-query';
import { fetchDashboardStats } from '@/services/dashboard';
import { useAuth } from '@/hooks/useAuth';

export function useDashboardStats() {
  const { user } = useAuth();
  const isAdmin  = user?.usuario?.admin ?? false;
  const repCodes = (user?.repCodes ?? []).map(r => r.representante_erp);

  return useQuery({
    queryKey: ['dashboard-stats', repCodes.join(','), isAdmin],
    queryFn:  () => fetchDashboardStats(repCodes, isAdmin),
    staleTime: 5 * 60 * 1000,   // 5 min
    enabled:  isAdmin || repCodes.length > 0,
  });
}
