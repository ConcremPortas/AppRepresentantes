import { supabase } from '@/lib/supabase/client';
import type { Orcamento, OrcamentoItem, OrcamentoAutor } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// SQL opcional (rodar manualmente no Supabase — SQL Editor):
// Para o embedding `autor:usuario_id(...)` funcionar num único SELECT, é preciso
// existir a FOREIGN KEY abaixo. Enquanto ela não existir, o código detecta e usa
// um fallback (segunda query) automaticamente — criar a FK só simplifica/otimiza.
//
//   ALTER TABLE concremapprep_orcamentos
//     ADD CONSTRAINT concremapprep_orcamentos_usuario_id_fkey
//     FOREIGN KEY (usuario_id) REFERENCES concremapprep_usuarios(id);
// ─────────────────────────────────────────────────────────────────────────────

// Embedding do autor (requer a FK acima) + itens (FK criada junto com a tabela).
// PostgREST cria `autor` (objeto) e `itens` (array) em cada linha.
const SELECT_COM_AUTOR = '*, autor:usuario_id ( id, nome, avatar_url ), itens:concremapprep_orcamento_itens ( * )';

// Erro do PostgREST quando a relação (FK) não existe → dispara o fallback.
function isRelationshipError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return err.code === 'PGRST200' || /relationship|foreign key|could not find/i.test(err.message ?? '');
}

// Fallback: busca os autores dos usuario_id presentes e junta no cliente (Map por id).
async function enrichAutores(orcs: Orcamento[]): Promise<Orcamento[]> {
  const ids = [...new Set(orcs.map(o => o.usuario_id).filter(Boolean))] as string[];
  if (ids.length === 0) return orcs;

  const { data } = await supabase
    .from('concremapprep_usuarios')
    .select('id, nome, avatar_url')
    .in('id', ids);

  const byId = new Map((data ?? []).map(u => [u.id, u as OrcamentoAutor]));
  return orcs.map(o => ({ ...o, autor: o.usuario_id ? (byId.get(o.usuario_id) ?? null) : null }));
}

// Fallback: busca os itens de todos os orçamentos da lista e agrupa por orcamento_id.
async function enrichItens(orcs: Orcamento[]): Promise<Orcamento[]> {
  const ids = orcs.map(o => o.id).filter(Boolean);
  if (ids.length === 0) return orcs;

  const { data } = await supabase
    .from('concremapprep_orcamento_itens')
    .select('*')
    .in('orcamento_id', ids);

  const byOrc = new Map<string, OrcamentoItem[]>();
  for (const item of (data ?? []) as OrcamentoItem[]) {
    const arr = byOrc.get(item.orcamento_id) ?? [];
    arr.push(item);
    byOrc.set(item.orcamento_id, arr);
  }
  return orcs.map(o => ({ ...o, itens: byOrc.get(o.id) ?? [] }));
}

// Executa a query de orçamentos com autor + itens: tenta o embedding; se alguma
// FK não existir, cai para o fallback de queries separadas (funciona nos dois casos).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchOrcamentosComAutor(build: (select: string) => any): Promise<Orcamento[]> {
  const embedded = await build(SELECT_COM_AUTOR);
  if (!embedded.error) return (embedded.data ?? []) as Orcamento[];

  // TODO: criar a FK usuario_id → usuarios.id (ver SQL no topo) para usar só o embedding.
  if (!isRelationshipError(embedded.error)) throw embedded.error;

  const plain = await build('*');
  if (plain.error) throw plain.error;
  return enrichItens(await enrichAutores((plain.data ?? []) as Orcamento[]));
}

// ─── Fetch lista ──────────────────────────────────────
export async function fetchOrcamentos(usuarioId: string): Promise<Orcamento[]> {
  return fetchOrcamentosComAutor(select =>
    supabase
      .from('concremapprep_orcamentos')
      .select(select)
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: false })
  );
}

export async function fetchOrcamentosAdmin(): Promise<Orcamento[]> {
  return fetchOrcamentosComAutor(select =>
    supabase
      .from('concremapprep_orcamentos')
      .select(select)
      .order('created_at', { ascending: false })
  );
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
  return fetchOrcamentosComAutor(select =>
    supabase
      .from('concremapprep_orcamentos')
      .select(select)
      .neq('status', 'rascunho')
      .order('updated_at', { ascending: false })
  );
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

// ─── Duplicar orçamento ───────────────────────────────
// Cria um NOVO rascunho (número novo via RPC) copiando cabeçalho e itens do
// orçamento de origem. O novo orçamento pertence ao usuário atual.
export async function duplicarOrcamento(id: string, usuarioId: string): Promise<Orcamento> {
  const origem = await fetchOrcamentoById(id);

  return createOrcamento(
    {
      usuario_id:         usuarioId,
      representante_erp:  origem.representante_erp ?? undefined,
      cliente_cnpj:       origem.cliente_cnpj,
      cliente_nome:       origem.cliente_nome,
      cliente_fantasia:   origem.cliente_fantasia ?? undefined,
      obra_referencia:    origem.obra_referencia ?? undefined,
      condicao_pagamento: origem.condicao_pagamento ?? undefined,
      validade:           origem.validade ?? undefined,
      endereco_entrega:   origem.endereco_entrega ?? undefined,
      frete_tipo:         origem.frete_tipo ?? undefined,
      frete_valor:        origem.frete_valor ?? undefined,
      observacoes:        origem.observacoes ?? undefined,
    },
    origem.itens.map(item => ({
      produto_id:        item.produto_id ?? undefined,
      produto_codigo:    item.produto_codigo,
      produto_descricao: item.produto_descricao,
      unidade:           item.unidade,
      quantidade:        item.quantidade,
      preco_unitario:    item.preco_unitario ?? undefined,
      is_adicional:      item.is_adicional,
    })),
  );
}
