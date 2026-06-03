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

export async function createUsuario(
  nome: string,
  email: string,
  senha: string,
  admin: boolean,
  operador: boolean = false
): Promise<{ id?: string; error?: string }> {
  const { data, error } = await supabase.rpc('criar_usuario', {
    p_nome: nome,
    p_email: email,
    p_senha: senha,
    p_admin: admin,
  });
  if (error) throw error;
  const result = data as { id?: string; error?: string };
  if (result.id && operador) {
    await supabase
      .from('concremapprep_usuarios')
      .update({ operador: true })
      .eq('id', result.id);
  }
  return result;
}

export async function updateSenha(id: string, novaSenha: string): Promise<void> {
  const { error } = await supabase.rpc('alterar_senha', {
    p_id: id,
    p_senha: novaSenha,
  });
  if (error) throw error;
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
