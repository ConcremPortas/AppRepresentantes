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

// ─── Fetch via RPC (bypassa RLS) ─────────────────────────

export async function fetchAcompanhamento(
  repCodes: string[],
  admin: boolean,
): Promise<PedidoAcompanhamento[]> {
  if (!admin && repCodes.length === 0) return [];

  // 1. RPC security definer: acessa pedidos_status + concrem_pedidos_venda
  const { data: rows, error } = await supabase.rpc('get_acompanhamento', {
    p_rep_codes: repCodes,
    p_admin:     admin,
  });

  if (error) throw error;

  const list = (rows ?? []) as {
    numero_pedido:      string;
    status_atual:       string | null;
    atualizado_em:      string;
    cliente_nome:       string | null;
    cliente_fantasia:   string | null;
    cliente_cnpj:       string | null;
    data_emissao:       string | null;
    total_pedido_venda: number | null;
    representante:      string | null;
  }[];

  const filtered = list.filter(r => !REP_EXCLUIDOS.includes(r.representante ?? ''));
  if (!filtered.length) return [];
  // shadow list with filtered
  const listFiltered = filtered;

  const numeros = listFiltered.map(r => r.numero_pedido).filter(Boolean);

  // 2. Histórico — colunas reais: status_novo, alterado_em, alterado_por, observacao
  let logsMap: Record<string, PedidoStatusLog[]> = {};
  try {
    const { data: logRows, error: logErr } = await supabase
      .from('pedidos_status_historico')
      .select('id,numero_pedido,status_novo,alterado_em,alterado_por,observacao')
      .in('numero_pedido', numeros)
      .order('alterado_em', { ascending: false });

    if (!logErr) {
      for (const row of (logRows ?? []) as {
        id: string;
        numero_pedido: string;
        status_novo: string;
        alterado_em: string;
        alterado_por: string | null;
        observacao: string | null;
      }[]) {
        if (!logsMap[row.numero_pedido]) logsMap[row.numero_pedido] = [];
        logsMap[row.numero_pedido].push({
          id:           row.id,
          numero_pedido: row.numero_pedido,
          status:       mapStatus(row.status_novo),
          status_db:    row.status_novo,
          observacao:   row.observacao,
          responsavel:  row.alterado_por,
          created_at:   row.alterado_em,
        });
      }
    }
  } catch {
    logsMap = {};
  }

  // 3. Merge
  return listFiltered.map(r => ({
    numero_pedido:      r.numero_pedido,
    cliente_nome:       r.cliente_nome       ?? r.numero_pedido,
    cliente_fantasia:   r.cliente_fantasia   ?? null,
    cliente_cnpj:       r.cliente_cnpj       ?? '',
    data_emissao:       r.data_emissao       ?? r.atualizado_em,
    total_pedido_venda: r.total_pedido_venda ?? 0,
    representante:      r.representante      ?? null,
    status:             mapStatus(r.status_atual),
    status_observacao:  null,
    status_updated_at:  r.atualizado_em,
    logs:               logsMap[r.numero_pedido] ?? [],
  }));
}
