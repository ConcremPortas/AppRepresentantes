import { supabase } from '@/lib/supabase/client';
import { VALID_ID_NOTA_CONF } from '@/constants/orderFilters';
import { REP_EXCLUIDOS } from '@/services/pedidosVenda';

export interface RepPerf {
  representante: string;
  totalVendido: number;
  pedidos: number;
  clientes: number;      // CNPJs distintos
  ticketMedio: number;
}

// Performance por representante DENTRO do escopo do usuário:
//   diretor  → só pedidos dos grupos vinculados (grupos != null)
//   global   → todos (admin / diretor geral)
//   outros   → [] (representante não usa este painel)
export async function fetchRepPerformance(grupos: string[] | null, admin: boolean): Promise<RepPerf[]> {
  if (grupos == null && !admin) return [];

  let q = supabase
    .from('concrem_pedidos_venda')
    .select('representante, total_pedido_venda, cliente_cnpj')
    .in('id_nota_conf', VALID_ID_NOTA_CONF)
    .not('representante', 'is', null)
    .not('representante', 'in', `(${REP_EXCLUIDOS.map(r => `"${r}"`).join(',')})`)
    .limit(50000);
  if (grupos != null) q = q.in('grupo_cliente', grupos);

  const { data, error } = await q;
  if (error) throw error;

  const map = new Map<string, { total: number; pedidos: number; cnpjs: Set<string> }>();
  for (const r of (data ?? []) as { representante: string; total_pedido_venda: number; cliente_cnpj: string }[]) {
    const rep = r.representante?.trim();
    if (!rep) continue;
    const e = map.get(rep) ?? { total: 0, pedidos: 0, cnpjs: new Set<string>() };
    e.total += r.total_pedido_venda ?? 0;
    e.pedidos += 1;
    if (r.cliente_cnpj) e.cnpjs.add(r.cliente_cnpj);
    map.set(rep, e);
  }

  return [...map.entries()]
    .map(([representante, e]) => ({
      representante,
      totalVendido: e.total,
      pedidos: e.pedidos,
      clientes: e.cnpjs.size,
      ticketMedio: e.pedidos > 0 ? e.total / e.pedidos : 0,
    }))
    .sort((a, b) => b.totalVendido - a.totalVendido);
}
