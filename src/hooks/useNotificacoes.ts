import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchNotificacoes, marcarNotificacaoLida } from '@/services/notificacoes';
import { mockNotificacoes } from '@/data/mockData';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export function useNotificacoes() {
  const { user } = useAuth();
  const rid = user?.id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['notificacoes', rid],
    queryFn: () => USE_MOCK
      ? mockNotificacoes.filter(n => n.representante_id === rid)
      : fetchNotificacoes(rid!),
    enabled: !!rid,
  });

  const marcarLida = useMutation({
    mutationFn: marcarNotificacaoLida,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificacoes', rid] }),
  });

  return { ...query, marcarLida };
}
