import { useAuth } from '@/hooks/useAuth';
import { getUserDataScope } from '@/services/scope';

// Escopo de dados do usuário logado, pronto para os params dos services:
//   admin=true  → visão global (admin / diretor geral)
//   grupos!=null→ diretor (filtra por grupo_cliente)
//   repCodes    → representante (filtra por representante)
export function useDataScope() {
  const { user } = useAuth();
  const scope = getUserDataScope(user);
  const admin = scope.type === 'global';
  const repCodes = scope.type === 'representative' ? scope.repCodes : [];
  const grupos = scope.type === 'director' ? scope.groups : null;
  // chave estável para o queryKey do React Query (invalida cache ao trocar escopo)
  const scopeKey = scope.type === 'director' ? `d:${scope.groups.join(',')}`
    : scope.type === 'representative' ? `r:${repCodes.join(',')}` : 'global';
  return { admin, repCodes, grupos, scopeKey };
}
