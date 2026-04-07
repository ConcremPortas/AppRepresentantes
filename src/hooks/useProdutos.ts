import { useQuery } from '@tanstack/react-query';
import { fetchProdutos } from '@/services/produtos';

export function useProdutos() {
  return useQuery({
    queryKey: ['produtos'],
    queryFn:  fetchProdutos,
    staleTime: 1000 * 60 * 60, // 1h — catálogo muda raramente
  });
}
