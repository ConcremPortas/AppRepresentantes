import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchTitulos } from '@/services/titulos';
import { getTitulosByRepresentante } from '@/data/mockData';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export function useTitulos() {
  const { user } = useAuth();
  const rid = user?.id;
  return useQuery({
    queryKey: ['titulos', rid],
    queryFn: () => USE_MOCK
      ? getTitulosByRepresentante(rid!)
      : fetchTitulos(rid!),
    enabled: !!rid,
  });
}
