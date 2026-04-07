import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchPedidos } from '@/services/pedidos';
import { mockPedidos } from '@/data/mockData';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export function usePedidos() {
  const { user } = useAuth();
  const rid = user?.id;
  return useQuery({
    queryKey: ['pedidos', rid],
    queryFn: () => USE_MOCK
      ? mockPedidos.filter(p => p.representante_id === rid)
      : fetchPedidos(rid!),
    enabled: !!rid,
  });
}
