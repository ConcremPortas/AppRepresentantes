import { supabase } from '@/lib/supabase/client';
import { mapStatus } from '@/services/acompanhamento';
import { REP_EXCLUIDOS } from '@/services/pedidosVenda';
import type { PedidoStatus } from '@/types';

// ─── Tipos ────────────────────────────────────────────────────
export interface PipelineCounts {
  aprovado:   number;
  liberado:   number;
  mapeamento: number;
  ferragem:   number;
  comercial:  number;
  producao:   number;
  faturado:   number;
  entrega:    number;
  finalizado: number;
  total:      number;
}

export interface DashboardStats {
  pipeline:              PipelineCounts;
  totalVendidoMes:       number;
  totalVendidoMesAnt:    number;
  totalFaturadoMes:      number;
  ticketMedio:           number;
  totalPedidos:          number;
  // Financeiro por mês (últimos 6 meses) para o gráfico
  vendasMensais: { mes: string; valor: number }[];
}

const EMPTY_PIPELINE: PipelineCounts = {
  aprovado: 0, liberado: 0, mapeamento: 0, ferragem: 0, comercial: 0,
  producao: 0, faturado: 0, entrega: 0, finalizado: 0, total: 0,
};

const EMPTY_STATS: DashboardStats = {
  pipeline:           { ...EMPTY_PIPELINE },
  totalVendidoMes:    0,
  totalVendidoMesAnt: 0,
  totalFaturadoMes:   0,
  ticketMedio:        0,
  totalPedidos:       0,
  vendasMensais:      [],
};

// ─── Helpers de data ──────────────────────────────────────────
function startOf(year: number, month: number) {
  return new Date(year, month, 1).toISOString().slice(0, 10);
}
function endOf(year: number, month: number) {
  return new Date(year, month + 1, 0).toISOString().slice(0, 10);
}

const MES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// ─── Fetch principal ──────────────────────────────────────────
export async function fetchDashboardStats(
  repCodes: string[],
  isAdmin: boolean,
): Promise<DashboardStats> {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();   // 0-based

  // ── 1. Buscar pedidos do representante (id + valor + data) ──
  let pedidosQuery = supabase
    .from('concrem_pedidos_venda')
    .select('id, numero_pedido, total_pedido_venda, data_emissao, representante');

  if (!isAdmin && repCodes.length > 0) {
    pedidosQuery = pedidosQuery.in('representante', repCodes);
  }
  if (REP_EXCLUIDOS.length > 0) {
    pedidosQuery = pedidosQuery.not(
      'representante', 'in',
      `(${REP_EXCLUIDOS.map(r => `"${r}"`).join(',')})`,
    );
  }

  const { data: pedidosData, error: pedidosErr } = await pedidosQuery;
  if (pedidosErr || !pedidosData?.length) return EMPTY_STATS;

  const totalPedidos = pedidosData.length;
  const totalGeral   = pedidosData.reduce((s, p) => s + (p.total_pedido_venda ?? 0), 0);
  const ticketMedio  = totalPedidos > 0 ? totalGeral / totalPedidos : 0;

  // ── 2. Filtros de mês ──
  const mesIni    = startOf(year, month);
  const mesFim    = endOf(year, month);
  const mesAntIni = startOf(year, month - 1);
  const mesAntFim = endOf(year, month - 1);

  const pedidosMes = pedidosData.filter(
    p => p.data_emissao >= mesIni && p.data_emissao <= mesFim,
  );
  const pedidosMesAnt = pedidosData.filter(
    p => p.data_emissao >= mesAntIni && p.data_emissao <= mesAntFim,
  );

  const totalVendidoMes    = pedidosMes.reduce((s, p) => s + (p.total_pedido_venda ?? 0), 0);
  const totalVendidoMesAnt = pedidosMesAnt.reduce((s, p) => s + (p.total_pedido_venda ?? 0), 0);

  // ── 3. Status do pipeline (concrem_pedidos_status) ──
  const numeros = pedidosData.map(p => p.numero_pedido).filter(Boolean);

  // Busca em lotes de 200 para evitar limite de URL do PostgREST
  const statusPorNumero = new Map<string, PedidoStatus>();
  for (let i = 0; i < numeros.length; i += 200) {
    const batch = numeros.slice(i, i + 200);
    const { data: statusRows } = await supabase
      .from('concrem_pedidos_status')
      .select('numero_pedido, status_atual')
      .in('numero_pedido', batch);
    for (const row of (statusRows ?? []) as { numero_pedido: string; status_atual: string }[]) {
      statusPorNumero.set(row.numero_pedido, mapStatus(row.status_atual));
    }
  }

  const pipeline: PipelineCounts = { ...EMPTY_PIPELINE };

  // Pedidos sem status em pedidos_status = 'aprovado' (entrada no pipeline)
  for (const p of pedidosData) {
    const st = statusPorNumero.get(p.numero_pedido) ?? 'aprovado';
    pipeline[st] = (pipeline[st] ?? 0) + 1;
    pipeline.total += 1;
  }

  // ── 4. Faturado do mês — pedidos com status faturado/entrega/finalizado emitidos este mês ──
  const totalFaturadoMes = pedidosMes
    .filter(p => {
      const st = statusPorNumero.get(p.numero_pedido);
      return st === 'faturado' || st === 'entrega' || st === 'finalizado';
    })
    .reduce((s, p) => s + (p.total_pedido_venda ?? 0), 0);

  // ── 5. Vendas mensais — últimos 6 meses para o gráfico ──
  const vendasMensais: { mes: string; valor: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const m   = month - i;
    const y   = m < 0 ? year - 1 : year;
    const mi  = ((m % 12) + 12) % 12;
    const ini = startOf(y, mi);
    const fim = endOf(y, mi);
    const valor = pedidosData
      .filter(p => p.data_emissao >= ini && p.data_emissao <= fim)
      .reduce((s, p) => s + (p.total_pedido_venda ?? 0), 0);
    vendasMensais.push({ mes: MES_ABREV[mi], valor });
  }

  return {
    pipeline,
    totalVendidoMes,
    totalVendidoMesAnt,
    totalFaturadoMes,
    ticketMedio,
    totalPedidos,
    vendasMensais,
  };
}
