import { supabase } from '@/lib/supabase/client';
import type { ClientGroup } from '@/types';

// Grupos de cliente (tabela client_groups) — para o multi-select do cadastro de
// usuários e para a gestão de grupos. Requer a migração aplicada no banco.
export async function fetchClientGroups(): Promise<ClientGroup[]> {
  const { data, error } = await supabase
    .from('client_groups')
    .select('id, name, is_active')
    .order('name');
  if (error) throw error;
  return (data ?? []) as ClientGroup[];
}

// Nomes dos grupos vinculados a um usuário diretor (user_client_groups → client_groups).
// Resiliente: retorna [] se a tabela ainda não existir (migração não aplicada).
export async function fetchUserGroupNames(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_client_groups')
    .select('client_groups(name)')
    .eq('user_id', userId);
  if (error) return [];
  return (data ?? [])
    .map((r: { client_groups: { name: string } | { name: string }[] | null }) => {
      const cg = r.client_groups;
      return Array.isArray(cg) ? cg[0]?.name : cg?.name;
    })
    .filter((n): n is string => !!n);
}

// Vincula/atualiza os grupos de um diretor (usado na gestão de usuários).
export async function setUserGroups(userId: string, groupIds: string[]): Promise<void> {
  await supabase.from('user_client_groups').delete().eq('user_id', userId);
  if (groupIds.length > 0) {
    const rows = groupIds.map(client_group_id => ({ user_id: userId, client_group_id }));
    const { error } = await supabase.from('user_client_groups').insert(rows);
    if (error) throw error;
  }
}
