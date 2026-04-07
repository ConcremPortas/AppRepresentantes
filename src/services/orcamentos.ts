import { supabase } from '@/lib/supabase/client';
import type { Orcamento, OrcamentoItem } from '@/types';

// ─── Fetch lista ──────────────────────────────────────
export async function fetchOrcamentos(usuarioId: string): Promise<Orcamento[]> {
  const { data, error } = await supabase
    .from('concremapprep_orcamentos')
    .select('*')
    .eq('usuario_id', usuarioId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Orcamento[];
}

export async function fetchOrcamentosAdmin(): Promise<Orcamento[]> {
  const { data, error } = await supabase
    .from('concremapprep_orcamentos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Orcamento[];
}

// ─── Fetch itens de um orçamento ─────────────────────
export async function fetchOrcamentoItens(orcamentoId: string): Promise<OrcamentoItem[]> {
  const { data, error } = await supabase
    .from('concremapprep_orcamento_itens')
    .select('*')
    .eq('orcamento_id', orcamentoId)
    .order('created_at');

  if (error) throw error;
  return (data ?? []) as OrcamentoItem[];
}

// ─── Criar orçamento ──────────────────────────────────
export interface CreateOrcamentoPayload {
  usuario_id: string;
  representante_erp?: string;
  cliente_cnpj: string;
  cliente_nome: string;
  cliente_fantasia?: string;
  obra_referencia?: string;
  condicao_pagamento?: string;
  validade?: string;
  endereco_entrega?: string;
  frete_tipo?: string;
  frete_valor?: number;
  observacoes?: string;
}

export interface CreateItemPayload {
  produto_id?: string;
  produto_codigo: string;
  produto_descricao: string;
  unidade?: string;
  quantidade: number;
  preco_unitario?: number;
  is_adicional?: boolean;
}

export async function createOrcamento(
  payload: CreateOrcamentoPayload,
  itens: CreateItemPayload[]
): Promise<Orcamento> {
  // Gera número
  const { data: numData, error: numErr } = await supabase
    .rpc('gerar_numero_orcamento');
  if (numErr) throw numErr;

  const numero = numData as string;

  // Cria orçamento
  const { data: orc, error: orcErr } = await supabase
    .from('concremapprep_orcamentos')
    .insert({ ...payload, numero, status: 'rascunho' })
    .select()
    .single();

  if (orcErr) throw orcErr;

  // Insere itens
  if (itens.length > 0) {
    const rows = itens.map(item => ({
      orcamento_id:      orc.id,
      produto_id:        item.produto_id ?? null,
      produto_codigo:    item.produto_codigo,
      produto_descricao: item.produto_descricao,
      unidade:           item.unidade ?? 'UN',
      quantidade:        item.quantidade,
      preco_unitario:    item.preco_unitario ?? null,
      is_adicional:      item.is_adicional ?? false,
    }));

    const { error: itensErr } = await supabase
      .from('concremapprep_orcamento_itens')
      .insert(rows);

    if (itensErr) throw itensErr;
  }

  return orc as Orcamento;
}

// ─── Buscar orçamento por ID ──────────────────────────
export async function fetchOrcamentoById(id: string): Promise<Orcamento & { itens: OrcamentoItem[] }> {
  const [{ data: orc, error: orcErr }, { data: itens, error: itensErr }] = await Promise.all([
    supabase.from('concremapprep_orcamentos').select('*').eq('id', id).single(),
    supabase.from('concremapprep_orcamento_itens').select('*').eq('orcamento_id', id).order('created_at'),
  ]);
  if (orcErr)   throw orcErr;
  if (itensErr) throw itensErr;
  return { ...(orc as Orcamento), itens: (itens ?? []) as OrcamentoItem[] };
}

// ─── Atualizar rascunho ───────────────────────────────
export type UpdateOrcamentoPayload = Omit<CreateOrcamentoPayload, 'usuario_id'>;

export async function updateOrcamento(
  id: string,
  payload: UpdateOrcamentoPayload,
  itens: CreateItemPayload[]
): Promise<void> {
  // Atualiza campos do orçamento
  const { error: orcErr } = await supabase
    .from('concremapprep_orcamentos')
    .update({ ...payload })
    .eq('id', id)
    .eq('status', 'rascunho'); // só rascunho pode ser editado
  if (orcErr) throw orcErr;

  // Substitui todos os itens: delete + insert
  const { error: delErr } = await supabase
    .from('concremapprep_orcamento_itens')
    .delete()
    .eq('orcamento_id', id);
  if (delErr) throw delErr;

  if (itens.length > 0) {
    const rows = itens.map(item => ({
      orcamento_id:      id,
      produto_id:        item.produto_id ?? null,
      produto_codigo:    item.produto_codigo,
      produto_descricao: item.produto_descricao,
      unidade:           item.unidade ?? 'UN',
      quantidade:        item.quantidade,
      preco_unitario:    item.preco_unitario ?? null,
      is_adicional:      item.is_adicional ?? false,
    }));
    const { error: insErr } = await supabase
      .from('concremapprep_orcamento_itens')
      .insert(rows);
    if (insErr) throw insErr;
  }
}

// ─── Enviar para análise ──────────────────────────────
export async function enviarOrcamento(id: string): Promise<void> {
  const { error } = await supabase
    .from('concremapprep_orcamentos')
    .update({ status: 'enviado' })
    .eq('id', id);
  if (error) throw error;
}

// ─── Operador: buscar todos os orçamentos não-rascunho ───
export async function fetchOrcamentosOperador(): Promise<Orcamento[]> {
  const { data, error } = await supabase
    .from('concremapprep_orcamentos')
    .select('*')
    .neq('status', 'rascunho')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Orcamento[];
}

// ─── Operador: marcar em análise ──────────────────────
export async function marcarEmAnalise(id: string): Promise<void> {
  const { error } = await supabase
    .from('concremapprep_orcamentos')
    .update({ status: 'em_analise' })
    .eq('id', id)
    .eq('status', 'enviado');
  if (error) throw error;
}

// ─── Operador: aprovar ────────────────────────────────
export async function aprovarOrcamento(id: string, observacoes?: string): Promise<void> {
  const { error } = await supabase
    .from('concremapprep_orcamentos')
    .update({ status: 'aprovado', observacoes: observacoes ?? null })
    .eq('id', id);
  if (error) throw error;
}

// ─── Operador: rejeitar ───────────────────────────────
export async function rejeitarOrcamento(id: string, motivo: string): Promise<void> {
  const { error } = await supabase
    .from('concremapprep_orcamentos')
    .update({ status: 'rejeitado', observacoes: motivo })
    .eq('id', id);
  if (error) throw error;
}

// ─── Excluir rascunho ─────────────────────────────────
export async function excluirOrcamento(id: string): Promise<void> {
  const { error } = await supabase
    .from('concremapprep_orcamentos')
    .delete()
    .eq('id', id)
    .eq('status', 'rascunho');
  if (error) throw error;
}
