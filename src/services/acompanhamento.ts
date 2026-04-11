import { supabase } from '@/lib/supabase/client';
import { REP_EXCLUIDOS } from '@/services/pedidosVenda';
import type { PedidoStatus } from '@/types';

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
  data_emissao: string;
  total_pedido_venda: number;
  representante: string | null;
  status: PedidoStatus;
  status_observacao: string | null;
  status_updated_at: string | null;
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
): Promise<PedidoAcompanhamento[]> {
  if (!admin && repCodes.length === 0) return [];

  // 1. Buscar pedidos em concrem_pedidos_venda
  let pedidosQuery = supabase
    .from('concrem_pedidos_venda')
    .select('id, numero_pedido, cliente_nome, cliente_fantasia, cliente_cnpj, data_emissao, total_pedido_venda, representante')
    .order('data_emissao', { ascending: false });

  if (!admin && repCodes.length > 0) {
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
      .from('pedidos_status')
      .select('numero_pedido, status_atual')
      .in('numero_pedido', batch);

    for (const s of (statusRows ?? []) as { numero_pedido: string; status_atual: string }[]) {
      statusByNumero.set(s.numero_pedido, s.status_atual);
    }
  }

  // 3. Histórico por numero_pedido
  let logsMap: Record<string, PedidoStatusLog[]> = {};

  if (numeros.length > 0) {
    try {
      // Busca histórico em lotes também
      const allLogRows: {
        id: string; numero_pedido: string; status_novo: string;
        alterado_em: string; alterado_por: string | null; observacao: string | null;
      }[] = [];

      for (const batch of chunk(numeros, 200)) {
        const { data: logBatch, error: logErr } = await supabase
          .from('pedidos_status_historico')
          .select('id, numero_pedido, status_novo, alterado_em, alterado_por, observacao')
          .in('numero_pedido', batch)
          .order('alterado_em', { ascending: false });
        if (!logErr && logBatch) allLogRows.push(...(logBatch as typeof allLogRows));
      }

      for (const row of allLogRows) {
        if (!logsMap[row.numero_pedido]) logsMap[row.numero_pedido] = [];
        logsMap[row.numero_pedido].push({
          id:            row.id,
          numero_pedido: row.numero_pedido,
          status:        mapStatus(row.status_novo),
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

  // 4. Merge
  return pedidos.map(p => ({
    numero_pedido:      p.numero_pedido,
    cliente_nome:       p.cliente_nome       ?? p.numero_pedido,
    cliente_fantasia:   p.cliente_fantasia   ?? null,
    cliente_cnpj:       p.cliente_cnpj       ?? '',
    data_emissao:       p.data_emissao       ?? '',
    total_pedido_venda: p.total_pedido_venda ?? 0,
    representante:      p.representante      ?? null,
    status:             mapStatus(statusByNumero.get(p.numero_pedido) ?? null),
    status_observacao:  null,
    status_updated_at:  null,
    logs:               logsMap[p.numero_pedido] ?? [],
  }));
}
