import { supabase } from '@/lib/supabase/client';
import type { Pedido } from '@/types';

export async function fetchPedidos(representante_id: string): Promise<Pedido[]> {
  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      *,
      cliente:clientes(*),
      status_logs:pedido_status_logs(*)
    `)
    .eq('representante_id', representante_id)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Pedido[];
}
