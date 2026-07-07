import { supabase } from '@/lib/supabase/client';
import { VALID_ID_NOTA_CONF } from '@/constants/orderFilters';
import { REP_EXCLUIDOS } from '@/services/pedidosVenda';

const DAY = 86_400_000;
export type RepBadge = 'excelente' | 'bom' | 'atencao' | 'critico';

export interface RepPerf {
  representante: string;
  totalVendido: number;
  pedidos: number;
  clientes: number;            // CNPJs distintos
  clientesAtivos: number;      // último pedido <= 30 dias
  clientesAtrasados: number;   // 31–60 dias
  clientesDormentes: number;   // > 60 dias
  ticketMedio: number;
  ultimoPedido: string | null; // ISO (YYYY-MM-DD)
  score: number;               // 0–100 (relativo ao conjunto)
  badge: RepBadge;
}

function badgeDoScore(s: number): RepBadge {
  if (s >= 75) return 'excelente';
  if (s >= 55) return 'bom';
  if (s >= 35) return 'atencao';
  return 'critico';
}

// Performance por representante DENTRO do escopo do usuário:
//   diretor  → só pedidos dos grupos vinculados (grupos != null)
//   global   → todos (admin / diretor geral)
//   outros   → [] (representante não usa este painel)
export async function fetchRepPerformance(grupos: string[] | null, admin: boolean): Promise<RepPerf[]> {
  if (grupos == null && !admin) return [];

  let q = supabase
    .from('concrem_pedidos_venda')
    .select('representante, total_pedido_venda, cliente_cnpj, data_emissao')
    .in('id_nota_conf', VALID_ID_NOTA_CONF)
    .not('representante', 'is', null)
    .not('representante', 'in', `(${REP_EXCLUIDOS.map(r => `"${r}"`).join(',')})`)
    .limit(50000);
  if (grupos != null) q = q.in('grupo_cliente', grupos);

  const { data, error } = await q;
  if (error) throw error;

  // Agrega por rep: total, nº pedidos, última compra por CNPJ (p/ movimentação).
  type Acc = { total: number; pedidos: number; ultPorCnpj: Map<string, string>; ultimo: string };
  const map = new Map<string, Acc>();
  for (const r of (data ?? []) as { representante: string; total_pedido_venda: number; cliente_cnpj: string; data_emissao: string }[]) {
    const rep = r.representante?.trim();
    if (!rep) continue;
    const e = map.get(rep) ?? { total: 0, pedidos: 0, ultPorCnpj: new Map<string, string>(), ultimo: '' };
    e.total += r.total_pedido_venda ?? 0;
    e.pedidos += 1;
    const cnpj = (r.cliente_cnpj ?? '').trim();
    const d = (r.data_emissao ?? '').slice(0, 10);
    if (cnpj && d) {
      const prev = e.ultPorCnpj.get(cnpj);
      if (!prev || d > prev) e.ultPorCnpj.set(cnpj, d);
    }
    if (d > e.ultimo) e.ultimo = d;
    map.set(rep, e);
  }

  const hoje = new Date();
  const base = [...map.entries()].map(([representante, e]) => {
    let ativos = 0, atrasados = 0, dormentes = 0;
    for (const d of e.ultPorCnpj.values()) {
      const dt = /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T12:00:00`) : null;
      const dias = dt ? Math.floor((hoje.getTime() - dt.getTime()) / DAY) : 9999;
      if (dias <= 30) ativos++;
      else if (dias <= 60) atrasados++;
      else dormentes++;
    }
    return {
      representante,
      totalVendido: e.total,
      pedidos: e.pedidos,
      clientes: e.ultPorCnpj.size,
      clientesAtivos: ativos,
      clientesAtrasados: atrasados,
      clientesDormentes: dormentes,
      ticketMedio: e.pedidos > 0 ? e.total / e.pedidos : 0,
      ultimoPedido: e.ultimo || null,
    };
  });

  // Score relativo ao conjunto: receita (45%) + pedidos (15%) + % ativos (25%)
  // + (1 − % atraso/dormência) (15%).
  const maxRec = Math.max(1, ...base.map(b => b.totalVendido));
  const maxPed = Math.max(1, ...base.map(b => b.pedidos));
  const scored: RepPerf[] = base.map(b => {
    const recNorm = b.totalVendido / maxRec;
    const pedNorm = b.pedidos / maxPed;
    const ativoRatio = b.clientes > 0 ? b.clientesAtivos / b.clientes : 0;
    const atrasoPenalty = b.clientes > 0 ? (b.clientesAtrasados + b.clientesDormentes) / b.clientes : 0;
    const raw = 0.45 * recNorm + 0.15 * pedNorm + 0.25 * ativoRatio + 0.15 * (1 - atrasoPenalty);
    const score = Math.round(Math.max(0, Math.min(1, raw)) * 100);
    return { ...b, score, badge: badgeDoScore(score) };
  });

  return scored.sort((a, b) => b.totalVendido - a.totalVendido);
}

// ─── Performance por GRUPO de cliente ────────────────────────────────────────
export interface GroupPerf {
  grupo: string;
  receita: number;
  pedidos: number;
  clientes: number;            // CNPJs distintos
  ticketMedio: number;
  clientesAtrasados: number;   // última compra 31–60 dias
  clientesDormentes: number;   // > 60 dias
  representantes: number;      // representantes distintos atuando
  pctReceita: number;          // participação % na receita do escopo
}

export async function fetchGroupPerformance(grupos: string[] | null, admin: boolean): Promise<GroupPerf[]> {
  if (grupos == null && !admin) return [];

  let q = supabase
    .from('concrem_pedidos_venda')
    .select('grupo_cliente, total_pedido_venda, cliente_cnpj, representante, data_emissao')
    .in('id_nota_conf', VALID_ID_NOTA_CONF)
    .not('representante', 'in', `(${REP_EXCLUIDOS.map(r => `"${r}"`).join(',')})`)
    .limit(50000);
  if (grupos != null) q = q.in('grupo_cliente', grupos);

  const { data, error } = await q;
  if (error) throw error;

  type Acc = { receita: number; pedidos: number; ultPorCnpj: Map<string, string>; reps: Set<string> };
  const map = new Map<string, Acc>();
  for (const r of (data ?? []) as { grupo_cliente: string | null; total_pedido_venda: number; cliente_cnpj: string; representante: string; data_emissao: string }[]) {
    const g = (r.grupo_cliente ?? '').trim() || 'SEM GRUPO';
    const e = map.get(g) ?? { receita: 0, pedidos: 0, ultPorCnpj: new Map<string, string>(), reps: new Set<string>() };
    e.receita += r.total_pedido_venda ?? 0;
    e.pedidos += 1;
    const cnpj = (r.cliente_cnpj ?? '').trim();
    const d = (r.data_emissao ?? '').slice(0, 10);
    if (cnpj && d) { const prev = e.ultPorCnpj.get(cnpj); if (!prev || d > prev) e.ultPorCnpj.set(cnpj, d); }
    if (r.representante?.trim()) e.reps.add(r.representante.trim());
    map.set(g, e);
  }

  const hoje = new Date();
  const total = [...map.values()].reduce((s, e) => s + e.receita, 0) || 1;
  return [...map.entries()].map(([grupo, e]) => {
    let atrasados = 0, dormentes = 0;
    for (const d of e.ultPorCnpj.values()) {
      const dt = /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T12:00:00`) : null;
      const dias = dt ? Math.floor((hoje.getTime() - dt.getTime()) / DAY) : 9999;
      if (dias > 60) dormentes++; else if (dias > 30) atrasados++;
    }
    return {
      grupo,
      receita: e.receita,
      pedidos: e.pedidos,
      clientes: e.ultPorCnpj.size,
      ticketMedio: e.pedidos > 0 ? e.receita / e.pedidos : 0,
      clientesAtrasados: atrasados,
      clientesDormentes: dormentes,
      representantes: e.reps.size,
      pctReceita: (e.receita / total) * 100,
    };
  }).sort((a, b) => b.receita - a.receita);
}
