import { supabase } from '@/lib/supabase/client';
import type { Cliente } from '@/types';

export async function fetchClientes(representante_id: string): Promise<Cliente[]> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('representante_id', representante_id)
    .order('razao_social');
  if (error) throw error;
  return (data ?? []) as Cliente[];
}
