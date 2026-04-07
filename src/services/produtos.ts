import { supabase } from '@/lib/supabase/client';
import type { Produto } from '@/types';

export async function fetchProdutos(): Promise<Produto[]> {
  const { data, error } = await supabase
    .from('concremprodutos_produtos')
    .select(
      'id,codigo,descricao,unidade,tipo_produto,movimento,enchimento,linha,perfil,revestimento,cor,altura_cm,largura_cm,espessura_cm,batente_cm,protect_plus,veneziana,visor,situacao'
    )
    .order('codigo');

  if (error) throw error;
  return (data ?? []) as Produto[];
}
