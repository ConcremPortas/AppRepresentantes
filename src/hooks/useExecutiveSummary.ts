import { useMemo } from 'react';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useCarteira } from '@/hooks/useCarteira';
import { useOrcamentos } from '@/hooks/useOrcamentos';
import { useAcompanhamento } from '@/hooks/useAcompanhamento';
import { computeGargalos } from '@/utils/pipeline';
import type { PeriodoFiltro, PipelineCounts } from '@/services/dashboard';

const DAY = 86_400_000;
function diasDesde(iso?: string | null): number {
  if (!iso) return 9999;
  const s = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return 9999;
  return Math.floor((Date.now() - new Date(`${s}T12:00:00`).getTime()) / DAY);
}

export interface ExecutivePeriod {
  periodo: PeriodoFiltro;
  ano?: number;
  mes?: number;
  trimestre?: number;
  representante?: string;
}

export interface ExecutiveSummaryData {
  receita: number;
  receitaAnt: number;
  receitaDelta: number | null;   // % vs período anterior
  pedidos: number;
  ticket: number;
  pipeline?: PipelineCounts;
  orcCriados: number;
  orcAprovados: number;
  conversao: number;             // % aprovados / criados
  orcParados: number;            // enviados/em análise há +30 dias
  clientesTotal: number;
  ativos: number;                // última compra ≤ 30d
  atrasados: number;             // 31–60d
  dormentes: number;             // > 60d
  dormenteValor: number;         // R$ acumulado dos dormentes (risco de perda)
  clientesRisco: number;         // atrasados + dormentes
  docs: number;                  // faturado+ sem NF ou boleto
  parados: number;               // pedidos > 7d parados na etapa
  atrasadosPedidos: number;      // embarque vencido
  pendencias: number;            // parados + atrasados
}

// Núcleo de dados da visão executiva (já escopado por perfil/grupos via hooks).
// Resultado de período (receita/pedidos) respeita o filtro; risco/operação são
// estado atual (point-in-time), como convém a um painel de gestão.
export function useExecutiveSummary(filtros: ExecutivePeriod) {
  const stats = useDashboardStats(filtros);
  const carteira = useCarteira();
  const orcamentos = useOrcamentos();
  const acomp = useAcompanhamento();

  const isLoading = stats.isLoading || carteira.isLoading || orcamentos.isLoading || acomp.isLoading;

  const data = useMemo<ExecutiveSummaryData>(() => {
    const s = stats.data;
    const receita = s?.totalVendidoMes ?? 0;
    const receitaAnt = s?.totalVendidoMesAnt ?? 0;
    const receitaDelta = receitaAnt > 0 ? ((receita - receitaAnt) / receitaAnt) * 100 : null;

    const orcs = orcamentos.data ?? [];
    const orcCriados = orcs.length;
    const orcAprovados = orcs.filter(o => o.status === 'aprovado').length;
    const conversao = orcCriados > 0 ? (orcAprovados / orcCriados) * 100 : 0;
    const orcParados = orcs.filter(o => (o.status === 'enviado' || o.status === 'em_analise') && diasDesde(o.created_at) > 30).length;

    const cli = carteira.data ?? [];
    let ativos = 0, atrasados = 0, dormentes = 0, dormenteValor = 0;
    for (const c of cli) {
      const d = diasDesde(c.ultimo_pedido);
      if (d <= 30) ativos++;
      else if (d <= 60) atrasados++;
      else { dormentes++; dormenteValor += c.total_comprado || 0; }
    }

    const g = computeGargalos(acomp.data ?? []);

    return {
      receita, receitaAnt, receitaDelta,
      pedidos: s?.pedidosNoPeriodo ?? 0,
      ticket: s?.ticketMedio ?? 0,
      pipeline: s?.pipeline,
      orcCriados, orcAprovados, conversao, orcParados,
      clientesTotal: cli.length, ativos, atrasados, dormentes, dormenteValor,
      clientesRisco: atrasados + dormentes,
      docs: g.docs, parados: g.parados, atrasadosPedidos: g.atrasados,
      pendencias: g.parados + g.atrasados,
    };
  }, [stats.data, carteira.data, orcamentos.data, acomp.data]);

  return { ...data, isLoading };
}
