import { supabase } from '@/lib/supabase/client';
import type { TituloCliente } from '@/types';

export async function fetchTitulos(representante_id: string): Promise<TituloCliente[]> {
  const { data, error } = await supabase
    .from('titulos')
    .select('*, cliente:clientes(*)')
    .eq('representante_id', representante_id)
    .order('data_vencimento');
  if (error) throw error;
  return (data ?? []) as unknown as TituloCliente[];
}
