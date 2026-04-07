import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchClientes } from '@/services/clientes';
import { mockClientes } from '@/data/mockData';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export function useClientes() {
  const { user } = useAuth();
  const rid = user?.id;
  return useQuery({
    queryKey: ['clientes', rid],
    queryFn: () => USE_MOCK
      ? mockClientes.filter(c => c.representante_id === rid)
      : fetchClientes(rid!),
    enabled: !!rid,
  });
}
