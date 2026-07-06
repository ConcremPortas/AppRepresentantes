import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchOrcamentos, fetchOrcamentosAdmin, fetchOrcamentosOperador } from '@/services/orcamentos';
import { fetchCnpjsDosGrupos } from '@/services/clientGroups';
import { perfilDoUsuario } from '@/constants/perfis';
import { useDataScope } from '@/hooks/useDataScope';

export function useOrcamentos() {
  const { user } = useAuth();
  const { grupos, scopeKey } = useDataScope();
  const perfil = perfilDoUsuario(user?.usuario);
  const uid    = user?.usuario?.id;

  return useQuery({
    queryKey: ['orcamentos', { uid, scopeKey }],
    queryFn: async () => {
      // Global (admin / diretor geral): todos
      if (perfil === 'admin' || perfil === 'diretor_geral') return fetchOrcamentosAdmin();
      if (perfil === 'operador') return fetchOrcamentosOperador();
      // Diretor: todos os orçamentos, filtrados pelos clientes (CNPJ) dos grupos
      if (perfil === 'diretor') {
        const [orcs, cnpjs] = await Promise.all([
          fetchOrcamentosAdmin(),
          fetchCnpjsDosGrupos(grupos ?? []),
        ]);
        return orcs.filter(o => cnpjs.has(String(o.cliente_cnpj ?? '').replace(/\D/g, '')));
      }
      // Representante: só os seus
      return fetchOrcamentos(uid!);
    },
    enabled:  !!uid,
    staleTime: 1000 * 60 * 2,
  });
}
