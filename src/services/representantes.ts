import { supabase } from '@/lib/supabase/client';
import type { RepresentanteERP } from '@/types';

export async function fetchRepresentantes(): Promise<RepresentanteERP[]> {
  const { data, error } = await supabase
    .from('concremapprep_representantes')
    .select('*')
    .order('representante_erp');
  if (error) throw error;
  return (data ?? []) as RepresentanteERP[];
}

export async function createRepresentante(
  rep: Pick<RepresentanteERP, 'codigo' | 'nome_erp' | 'representante_erp' | 'comissao_percentual'>
): Promise<RepresentanteERP> {
  const { data, error } = await supabase
    .from('concremapprep_representantes')
    .insert({ ...rep, ativo: true })
    .select()
    .single();
  if (error) throw error;
  return data as RepresentanteERP;
}

export async function updateRepresentante(
  id: string,
  rep: Partial<Pick<RepresentanteERP, 'codigo' | 'nome_erp' | 'representante_erp' | 'comissao_percentual' | 'ativo'>>
): Promise<void> {
  const { error } = await supabase
    .from('concremapprep_representantes')
    .update(rep)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteRepresentante(id: string): Promise<void> {
  const { error } = await supabase
    .from('concremapprep_representantes')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
