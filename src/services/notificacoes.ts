import { supabase } from '@/lib/supabase/client';
import type { Notificacao } from '@/types';

export async function fetchNotificacoes(usuario_id: string): Promise<Notificacao[]> {
  const { data, error } = await supabase
    .from('concremapprep_notificacoes')
    .select('*')
    .eq('usuario_id', usuario_id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Notificacao[];
}

export async function marcarNotificacaoLida(id: string): Promise<void> {
  const { error } = await supabase
    .from('concremapprep_notificacoes')
    .update({ lida: true })
    .eq('id', id);
  if (error) throw error;
}
