import { supabase } from '@/lib/supabase/client';
import { VALID_ID_NOTA_CONF } from '@/constants/orderFilters';
import { REP_EXCLUIDOS } from '@/services/pedidosVenda';
import type { PedidoStatus, PedidoAnexo } from '@/types';

// ─── Tipos ────────────────────────────────────────────────

export interface PedidoStatusLog {
  id: string;
  numero_pedido: string;
  status: PedidoStatus;          // já mapeado do DB
  status_db: string;             // valor original do DB
  observacao: string | null;
  responsavel: string | null;
  created_at: string;            // alias de alterado_em
}

export interface PedidoAcompanhamento {
  numero_pedido: string;
  cliente_nome: string;
  cliente_fantasia: string | null;
  cliente_cnpj: string;
  cliente_cidade: string | null;
  cliente_uf: string | null;
  data_emissao: string;
  previsao_embarque: string | null;
  situacao_entrega: string | null;
  total_pedido_venda: number;
  representante: string | null;
  status: PedidoStatus;
  status_observacao: string | null;
  status_updated_at: string | null;   // quando entrou no status atual (do histórico)
  anexos: PedidoAnexo[];
  logs: PedidoStatusLog[];
}

// ─── Mapeamento DB → pipeline visual ─────────────────────
// status_atual / status_novo  →  PedidoStatus (app)

export const STATUS_MAP: Record<string, PedidoStatus> = {
  aguardando_avaliacao: 'aprovado',
  mapeamento_concluido: 'mapeamento',
  ferragem_recebida:    'ferragem',
  liberado_comercial:   'comercial',
  aguardando_gerencia:  'comercial',
  confirmado_gerencia:  'comercial',
  liberado_producao:    'producao',
  producao_finalizada:  'producao',
  faturado:             'faturado',
  em_entrega:           'entrega',
  entregue:             'finalizado',
  finalizado:           'finalizado',
};

export function mapStatus(dbStatus: string | null): PedidoStatus {
  if (!dbStatus) return 'aprovado';
  return STATUS_MAP[dbStatus] ?? 'aprovado';
}

// ─── Fetch via queries diretas ───────────────────────────

export async function fetchAcompanhamento(
  repCodes: string[],
  admin: boolean,
  grupos: string[] | null = null,
): Promise<PedidoAcompanhamento[]> {
  if (grupos == null && !admin && repCodes.length === 0) return [];

  // 1. Buscar pedidos em concrem_pedidos_venda
  let pedidosQuery = supabase
    .from('concrem_pedidos_venda')
    .select('id, numero_pedido, cliente_nome, cliente_fantasia, cliente_cnpj, cliente_cidade, cliente_uf, data_emissao, previsao_embarque, situacao_entrega, total_pedido_venda, representante')
    .in('id_nota_conf', VALID_ID_NOTA_CONF)
    .order('data_emissao', { ascending: false });

  if (grupos != null) {
    pedidosQuery = pedidosQuery.in('grupo_cliente', grupos);
  } else if (!admin && repCodes.length > 0) {
    pedidosQuery = pedidosQuery.in('representante', repCodes);
  }
  if (REP_EXCLUIDOS.length > 0) {
    pedidosQuery = pedidosQuery.not(
      'representante', 'in',
      `(${REP_EXCLUIDOS.map(r => `"${r}"`).join(',')})`,
    );
  }

  const { data: pedidos, error: pedidosErr } = await pedidosQuery;
  if (pedidosErr) throw pedidosErr;
  if (!pedidos?.length) return [];

  // helper — divide array em chunks para evitar limite de URL do PostgREST
  function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  // 2. Status atual em pedidos_status — join por numero_pedido + coluna status_atual
  const numeros = pedidos.map(p => p.numero_pedido).filter(Boolean);
  const statusByNumero = new Map<string, string>();

  for (const batch of chunk(numeros, 200)) {
    const { data: statusRows } = await supabase
      .from('concrem_pedidos_status')
      .select('numero_pedido, status_atual')
      .in('numero_pedido', batch);

    for (const s of (statusRows ?? []) as { numero_pedido: string; status_atual: string }[]) {
      statusByNumero.set(s.numero_pedido, s.status_atual);
    }
  }

  // 3. Histórico por numero_pedido.
  // A tabela do ERP concrem_pedidos_status_historico usa colunas: status_anterior,
  // status_novo (o status "novo" da transição), alterado_em, alterado_por.
  // status_novo está no vocabulário BRUTO do ERP → precisa de mapStatus() p/ virar app-level.
  let logsMap: Record<string, PedidoStatusLog[]> = {};
  const statusFromHistorico = new Map<string, PedidoStatus>();

  if (numeros.length > 0) {
    try {
      const allLogRows: {
        id: string; numero_pedido: string;
        status_anterior: string | null; status_novo: string;
        alterado_em: string; alterado_por: string | null; observacao: string | null;
      }[] = [];

      for (const batch of chunk(numeros, 200)) {
        const { data: logBatch, error: logErr } = await supabase
          .from('concrem_pedidos_status_historico')
          .select('id, numero_pedido, status_anterior, status_novo, alterado_em, alterado_por, observacao')
          .in('numero_pedido', batch)
          .order('alterado_em', { ascending: false });
        if (!logErr && logBatch) allLogRows.push(...(logBatch as typeof allLogRows));
      }

      for (const row of allLogRows) {
        const statusApp = mapStatus(row.status_novo);
        // Primeira ocorrência = mais recente (ordenado desc) = status atual
        if (!statusFromHistorico.has(row.numero_pedido)) {
          statusFromHistorico.set(row.numero_pedido, statusApp);
        }
        if (!logsMap[row.numero_pedido]) logsMap[row.numero_pedido] = [];
        logsMap[row.numero_pedido].push({
          id:            row.id,
          numero_pedido: row.numero_pedido,
          status:        statusApp,
          status_db:     row.status_novo,
          observacao:    row.observacao,
          responsavel:   row.alterado_por,
          created_at:    row.alterado_em,
        });
      }
    } catch {
      logsMap = {};
    }
  }

  // 4. Anexos (NF/boleto) — relatorio_entrega_anexos, em lotes
  const anexosMap = new Map<string, PedidoAnexo[]>();
  for (const batch of chunk(numeros, 200)) {
    const { data: anexosData } = await supabase
      .from('relatorio_entrega_anexos')
      .select('pedido_id, tipo, arquivo_nome, arquivo_url')
      .in('pedido_id', batch)
      .order('criado_em', { ascending: false });
    for (const a of (anexosData ?? []) as { pedido_id: string; tipo: string; arquivo_nome: string; arquivo_url: string }[]) {
      const arr = anexosMap.get(a.pedido_id) ?? [];
      arr.push({ tipo: a.tipo, arquivo_nome: a.arquivo_nome, arquivo_url: a.arquivo_url });
      anexosMap.set(a.pedido_id, arr);
    }
  }

  // 5. Merge — historico tem prioridade; fallback para pedidos_status (ERP)
  return pedidos.map(p => {
    const logs = logsMap[p.numero_pedido] ?? [];
    return {
      numero_pedido:      p.numero_pedido,
      cliente_nome:       p.cliente_nome       ?? p.numero_pedido,
      cliente_fantasia:   p.cliente_fantasia   ?? null,
      cliente_cnpj:       p.cliente_cnpj       ?? '',
      cliente_cidade:     (p as { cliente_cidade?: string | null }).cliente_cidade ?? null,
      cliente_uf:         (p as { cliente_uf?: string | null }).cliente_uf ?? null,
      data_emissao:       p.data_emissao       ?? '',
      previsao_embarque:  (p as { previsao_embarque?: string | null }).previsao_embarque ?? null,
      situacao_entrega:   (p as { situacao_entrega?: string | null }).situacao_entrega ?? null,
      total_pedido_venda: p.total_pedido_venda ?? 0,
      representante:      p.representante      ?? null,
      status:             statusFromHistorico.get(p.numero_pedido)
                            ?? mapStatus(statusByNumero.get(p.numero_pedido) ?? null),
      status_observacao:  null,
      status_updated_at:  logs[0]?.created_at ?? null,   // logs[0] = transição mais recente
      anexos:             anexosMap.get(p.numero_pedido) ?? [],
      logs,
    };
  });
}
