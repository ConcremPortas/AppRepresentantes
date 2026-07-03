import { supabase } from '@/lib/supabase/client';
import type { Usuario, RepresentanteERP } from '@/types';

export interface UsuarioComReps extends Usuario {
  reps: RepresentanteERP[];
}

export async function fetchUsuarios(): Promise<UsuarioComReps[]> {
  const [{ data: usuarios, error: usrErr }, { data: vinculos, error: vErr }, { data: reps, error: rErr }] =
    await Promise.all([
      supabase
        .from('concremapprep_usuarios')
        .select('id, nome, email, admin, operador, ativo, created_at')
        .order('nome'),
      supabase
        .from('concremapprep_usuario_representantes')
        .select('usuario_id, representante_id'),
      supabase
        .from('concremapprep_representantes')
        .select('*'),
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
  fields: Partial<Pick<Usuario, 'nome' | 'admin' | 'operador' | 'ativo'>>
): Promise<void> {
  const { error } = await supabase
    .from('concremapprep_usuarios')
    .update(fields)
    .eq('id', id);
  if (error) throw error;
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
