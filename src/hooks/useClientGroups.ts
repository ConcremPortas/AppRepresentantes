import { useMemo } from 'react';
import { useCarteira } from '@/hooks/useCarteira';
import { useGroupPerformance } from '@/hooks/useRepPerformance';
import { movimentacaoCliente, type Movimentacao } from '@/pages/ClientesPage';
import type { ClienteCarteira } from '@/services/carteira';

const DAY = 24 * 60 * 60 * 1000;
const PRAZO = 30;

export type GroupStatus = 'saudavel' | 'atencao' | 'critico';

export interface ClientGroup {
  grupo: string;
  clientes: ClienteCarteira[];
  totalClientes: number;
  receita: number;
  pedidos: number;
  ticketMedio: number;
  ativos: number;
  atencaoN: number;
  atrasados: number;
  dormentes: number;
  semHistorico: number;
  emRisco: number;              // atrasados + dormentes
  proximasVencidas: number;     // último pedido + 30d já passou
  representantes: number;       // distintos atuando (de useGroupPerformance)
  ultimaMovimentacao: string | null;
  status: GroupStatus;
}

function statusDoGrupo(emRisco: number, total: number): GroupStatus {
  if (total === 0) return 'atencao';
  const r = emRisco / total;
  if (r <= 0.25) return 'saudavel';
  if (r <= 0.5) return 'atencao';
  return 'critico';
}

// Agrega a carteira (já escopada por perfil/grupo) por grupo_cliente.
// Diretor vê só seus grupos (carteira já vem filtrada); Diretor Geral, todos.
export function useClientGroups() {
  const { data: clientes = [], isLoading } = useCarteira();
  const { data: perf = [] } = useGroupPerformance();

  const grupos = useMemo<ClientGroup[]>(() => {
    const today = new Date();
    const repPorGrupo = new Map(perf.map(g => [g.grupo, g.representantes]));
    const map = new Map<string, ClienteCarteira[]>();
    for (const c of clientes) {
      const g = c.grupo_cliente || 'SEM GRUPO';
      const arr = map.get(g) ?? [];
      arr.push(c);
      map.set(g, arr);
    }

    const out: ClientGroup[] = [];
    for (const [grupo, lista] of map) {
      let receita = 0, pedidos = 0, ativos = 0, atencaoN = 0, atrasados = 0, dormentes = 0, semHistorico = 0, proximasVencidas = 0;
      let ultimaMov: string | null = null;
      for (const c of lista) {
        receita += c.total_comprado || 0;
        pedidos += c.total_pedidos || 0;
        const mov: Movimentacao = movimentacaoCliente(c, today);
        if (mov === 'ativo') ativos++;
        else if (mov === 'atencao') atencaoN++;
        else if (mov === 'atrasado') atrasados++;
        else if (mov === 'dormente') dormentes++;
        else semHistorico++;
        if (c.ultimo_pedido) {
          if (!ultimaMov || c.ultimo_pedido > ultimaMov) ultimaMov = c.ultimo_pedido;
          const prox = new Date(`${c.ultimo_pedido.slice(0, 10)}T12:00:00`).getTime() + PRAZO * DAY;
          if (today.getTime() > prox) proximasVencidas++;
        }
      }
      const emRisco = atrasados + dormentes;
      out.push({
        grupo, clientes: lista, totalClientes: lista.length,
        receita, pedidos, ticketMedio: pedidos > 0 ? receita / pedidos : 0,
        ativos, atencaoN, atrasados, dormentes, semHistorico, emRisco,
        proximasVencidas,
        representantes: repPorGrupo.get(grupo) ?? 0,
        ultimaMovimentacao: ultimaMov,
        status: statusDoGrupo(emRisco, lista.length),
      });
    }
    return out.sort((a, b) => b.receita - a.receita);
  }, [clientes, perf]);

  return { grupos, isLoading };
}
