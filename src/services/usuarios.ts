import { supabase } from '@/lib/supabase/client';
import { setUserGroups } from '@/services/clientGroups';
import type { Usuario, RepresentanteERP, Perfil } from '@/types';

export interface UsuarioComReps extends Usuario {
  reps: RepresentanteERP[];
  grupoIds: string[];   // ids dos grupos vinculados (perfil Diretor)
}

export async function fetchUsuarios(): Promise<UsuarioComReps[]> {
  const [{ data: usuarios, error: usrErr }, { data: vinculos, error: vErr }, { data: reps, error: rErr }, { data: gruposLink }] =
    await Promise.all([
      supabase
        .from('concremapprep_usuarios')
        .select('id, nome, email, admin, operador, perfil, ativo, created_at')
        .order('nome'),
      supabase
        .from('concremapprep_usuario_representantes')
        .select('usuario_id, representante_id'),
      supabase
        .from('concremapprep_representantes')
        .select('*'),
      // pode retornar erro se a migração de grupos ainda não estiver aplicada → tratado como vazio
      supabase
        .from('user_client_groups')
        .select('user_id, client_group_id'),
    ]);

  if (usrErr) throw usrErr;
  if (vErr)   throw vErr;
  if (rErr)   throw rErr;

  const repMap: Record<string, RepresentanteERP> = Object.fromEntries(
    (reps ?? []).map(r => [r.id, r as RepresentanteERP])
  );

  return (usuarios ?? []).map(u => ({
    ...(u as Usuario),
    reps: (vinculos ?? [])
      .filter(v => v.usuario_id === u.id)
      .map(v => repMap[v.representante_id])
      .filter(Boolean) as RepresentanteERP[],
    grupoIds: (gruposLink ?? [])
      .filter((g: { user_id: string; client_group_id: string }) => g.user_id === u.id)
      .map((g: { client_group_id: string }) => g.client_group_id),
  }));
}

// Extrai a mensagem de erro do corpo JSON de uma Edge Function (não-2xx).
async function edgeErrorMessage(error: unknown, fallback: string): Promise<string> {
  const ctx = (error as { context?: Response })?.context;
  try {
    const body = await ctx?.json?.();
    if (body?.error) return body.error as string;
  } catch { /* corpo não-JSON */ }
  return (error as Error)?.message ?? fallback;
}

// Criação de usuário agora cria também o registro em auth.users — feito por uma
// Edge Function com service_role (criar usuário no Auth não é possível no front).
export async function createUsuario(
  nome: string,
  email: string,
  senha: string,
  admin: boolean,
  operador: boolean = false
): Promise<{ id?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke('admin-criar-usuario', {
    body: { nome, email, senha, admin, operador },
  });
  if (error) {
    return { error: await edgeErrorMessage(error, 'Falha ao criar usuário') };
  }
  return data as { id?: string; error?: string };
}

// Reset de senha pelo admin (esta tela é admin-only). A Edge Function reseta a
// senha de qualquer usuário pelo id — inclusive a do próprio admin —, então não
// é preciso distinguir "própria senha" aqui. Evitamos chamar supabase.auth.getUser()
// (chamada de rede que segura o lock de auth do gotrue-js e travava o fluxo).
export async function updateSenha(id: string, novaSenha: string): Promise<void> {
  const { error } = await supabase.functions.invoke('admin-reset-senha', {
    body: { id, senha: novaSenha },
  });
  if (error) throw new Error(await edgeErrorMessage(error, 'Falha ao redefinir senha'));
}

export async function updateUsuario(
  id: string,
  fields: Partial<Pick<Usuario, 'nome' | 'admin' | 'operador' | 'ativo' | 'perfil'>>
): Promise<void> {
  const { error } = await supabase
    .from('concremapprep_usuarios')
    .update(fields)
    .eq('id', id);
  if (error) throw error;
}

// Cria o usuário (auth + perfil pela Edge Function) e ajusta perfil/grupos —
// a Edge Function não conhece Diretor, então gravamos a coluna perfil aqui.
export async function createUsuarioCompleto(
  nome: string, email: string, senha: string, perfil: Perfil, grupoIds: string[],
): Promise<{ id?: string; error?: string }> {
  const admin = perfil === 'admin';
  const operador = perfil === 'operador';
  const res = await createUsuario(nome, email, senha, admin, operador);
  if (res.error || !res.id) return res;
  await updateUsuario(res.id, { perfil, admin, operador });
  if (perfil === 'diretor') await setUserGroups(res.id, grupoIds);
  return res;
}

// Salva acesso (perfil + grupos) de um usuário existente.
export async function saveUsuarioAcesso(
  id: string, nome: string, perfil: Perfil, grupoIds: string[],
): Promise<void> {
  await updateUsuario(id, { nome, perfil, admin: perfil === 'admin', operador: perfil === 'operador' });
  await setUserGroups(id, perfil === 'diretor' ? grupoIds : []);
}

export async function linkRepresentante(usuarioId: string, representanteId: string): Promise<void> {
  const { error } = await supabase
    .from('concremapprep_usuario_representantes')
    .insert({ usuario_id: usuarioId, representante_id: representanteId });
  if (error) throw error;
}

export async function unlinkRepresentante(usuarioId: string, representanteId: string): Promise<void> {
  const { error } = await supabase
    .from('concremapprep_usuario_representantes')
    .delete()
    .eq('usuario_id', usuarioId)
    .eq('representante_id', representanteId);
  if (error) throw error;
}
