// ─────────────────────────────────────────────────────────────────────────────
// Motor de regras: transforma os dados reais do portal em alertas acionáveis.
// Funções puras — recebem dados, devolvem Alerta[]. O agrupamento ("4 clientes
// ultrapassaram a previsão...") acontece AQUI, antes de chegar à tela.
// IDs são estáveis (derivados dos dados) para persistir lida/excluída.
// ─────────────────────────────────────────────────────────────────────────────
import type { Orcamento } from '@/types';
import type { ClienteCarteira } from '@/services/carteira';
import type { PedidoComAnexos } from '@/services/financeiro';
import type { NotificacaoDB } from '@/services/notificacoes';
import { ALERT_DEFS, type Alerta } from './registry';
import { formatCurrencyK } from '@/utils/formatters';

const DAY = 86_400_000;

function parseISO(d?: string | null): Date | null {
  if (!d) return null;
  const s = d.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T12:00:00`) : new Date(d);
}
function diasDesde(d: string | null | undefined, hoje: Date): number {
  const p = parseISO(d);
  return p ? Math.floor((hoje.getTime() - p.getTime()) / DAY) : 0;
}
function valorOrcamento(o: Orcamento): number {
  return (o.itens ?? []).reduce((s, it) => s + (it.preco_unitario ?? 0) * it.quantidade, 0);
}
function nomeCliente(nome: string, fantasia?: string | null): string {
  return fantasia?.trim() || nome || 'Cliente';
}
function classifyAnexo(tipo: string): 'nf' | 'boleto' | 'outro' {
  const t = (tipo ?? '').toLowerCase();
  if (t.includes('boleto')) return 'boleto';
  if (t.includes('nota') || t.includes('nf') || t.includes('fiscal')) return 'nf';
  return 'outro';
}

export interface EngineInput {
  orcamentos: Orcamento[];
  clientes: ClienteCarteira[];
  pedidosAnexos: PedidoComAnexos[];
  notificacoesDB: NotificacaoDB[];
  hoje: Date;
}

// ─── Orçamentos: aprovado / recusado / parado / expirando ───────────────────
function alertasOrcamentos({ orcamentos, hoje }: EngineInput): Alerta[] {
  const out: Alerta[] = [];

  for (const o of orcamentos) {
    const valor = valorOrcamento(o);

    // Aprovado / recusado nos últimos 30 dias (decisões antigas não são "novidade")
    if (o.status === 'aprovado' && diasDesde(o.updated_at, hoje) <= 30) {
      out.push({
        id: `aprovado:${o.id}:${(o.updated_at ?? '').slice(0, 10)}`,
        tipo: 'orcamento_aprovado',
        prioridade: ALERT_DEFS.orcamento_aprovado.prioridade,
        titulo: `Orçamento #${o.numero} aprovado`,
        descricao: nomeCliente(o.cliente_nome, o.cliente_fantasia),
        detalhe: valor > 0 ? `Valor: ${formatCurrencyK(valor)}` : undefined,
        data: o.updated_at,
        rota: '/orcamentos?status=aprovado',
        acao: 'Abrir orçamento',
      });
    }

    if (o.status === 'rejeitado' && diasDesde(o.updated_at, hoje) <= 30) {
      out.push({
        id: `recusado:${o.id}:${(o.updated_at ?? '').slice(0, 10)}`,
        tipo: 'orcamento_recusado',
        prioridade: ALERT_DEFS.orcamento_recusado.prioridade,
        titulo: `Orçamento #${o.numero} recusado`,
        descricao: nomeCliente(o.cliente_nome, o.cliente_fantasia),
        detalhe: o.observacoes ? `Motivo: ${o.observacoes}` : undefined,
        data: o.updated_at,
        rota: '/orcamentos?status=rejeitado',
        acao: 'Ver detalhes',
      });
    }

    const pendente = o.status === 'enviado' || o.status === 'em_analise';

    // Parado: aguardando aprovação há mais de 30 dias
    if (pendente) {
      const dias = diasDesde(o.created_at, hoje);
      if (dias > 30) {
        out.push({
          id: `parado:${o.id}`,
          tipo: 'orcamento_parado',
          prioridade: ALERT_DEFS.orcamento_parado.prioridade,
          titulo: `Orçamento #${o.numero} parado há ${dias} dias`,
          descricao: `${nomeCliente(o.cliente_nome, o.cliente_fantasia)} · aguardando aprovação`,
          data: o.created_at,
          rota: '/aprovacoes',
          acao: 'Ver aprovações',
        });
      }

      // Expirando: validade nos próximos 5 dias (ou vencida há até 7)
      if (o.validade) {
        const diasAteVencer = -diasDesde(o.validade, hoje); // futuro = positivo
        if (diasAteVencer <= 5 && diasAteVencer >= -7) {
          out.push({
            id: `expirando:${o.id}:${o.validade}`,
            tipo: 'orcamento_expirando',
            prioridade: ALERT_DEFS.orcamento_expirando.prioridade,
            titulo: diasAteVencer < 0
              ? `Orçamento #${o.numero} venceu`
              : diasAteVencer === 0
                ? `Orçamento #${o.numero} vence hoje`
                : `Orçamento #${o.numero} vence em ${diasAteVencer} dia(s)`,
            descricao: nomeCliente(o.cliente_nome, o.cliente_fantasia),
            data: o.validade,
            rota: '/aprovacoes',
            acao: 'Ver orçamento',
          });
        }
      }
    }
  }
  return out;
}

// ─── Clientes: ultrapassaram a previsão média de recompra ───────────────────
export interface ClienteAtrasado {
  cliente: ClienteCarteira;
  ciclo: number;        // dias (média entre compras)
  diasSemComprar: number;
}

export function clientesAtrasados(clientes: ClienteCarteira[], hoje: Date): ClienteAtrasado[] {
  const out: ClienteAtrasado[] = [];
  for (const c of clientes) {
    // Ciclo médio requer histórico recorrente (3+ pedidos com datas válidas)
    if (c.total_pedidos < 3 || !c.primeiro_pedido || !c.ultimo_pedido) continue;
    const primeiro = parseISO(c.primeiro_pedido);
    const ultimo = parseISO(c.ultimo_pedido);
    if (!primeiro || !ultimo || ultimo <= primeiro) continue;
    const ciclo = (ultimo.getTime() - primeiro.getTime()) / DAY / (c.total_pedidos - 1);
    if (ciclo < 5) continue; // compras no mesmo dia/semana não formam ciclo útil
    const diasSemComprar = diasDesde(c.ultimo_pedido, hoje);
    if (diasSemComprar > ciclo * 1.25 && diasSemComprar - ciclo >= 7) {
      out.push({ cliente: c, ciclo: Math.round(ciclo), diasSemComprar });
    }
  }
  return out.sort((a, b) => b.diasSemComprar - a.diasSemComprar);
}

function alertasRecompra(input: EngineInput): Alerta[] {
  const atrasados = clientesAtrasados(input.clientes, input.hoje);
  if (atrasados.length === 0) return [];

  // Poucos → um card por cliente; muitos → agrupa em um único card
  if (atrasados.length <= 2) {
    return atrasados.map(a => ({
      id: `recompra:${a.cliente.cliente_cnpj}:${a.cliente.ultimo_pedido}`,
      tipo: 'cliente_recompra' as const,
      prioridade: ALERT_DEFS.cliente_recompra.prioridade,
      titulo: `${nomeCliente(a.cliente.cliente_nome, a.cliente.cliente_fantasia)} há ${a.diasSemComprar} dias sem pedidos`,
      descricao: `A frequência média deste cliente é de ${a.ciclo} dias.`,
      data: a.cliente.ultimo_pedido,
      rota: '/clientes',
      acao: 'Ver cliente',
    }));
  }
  const hojeStr = input.hoje.toISOString().slice(0, 10);
  return [{
    id: `recompra-grupo:${hojeStr}`,
    tipo: 'cliente_recompra',
    prioridade: ALERT_DEFS.cliente_recompra.prioridade,
    titulo: `${atrasados.length} clientes ultrapassaram a previsão média de compra`,
    descricao: atrasados.slice(0, 3).map(a => nomeCliente(a.cliente.cliente_nome, a.cliente.cliente_fantasia)).join(', ')
      + (atrasados.length > 3 ? ` e mais ${atrasados.length - 3}` : ''),
    data: hojeStr,
    rota: '/clientes',
    acao: 'Ver carteira',
    agrupado: atrasados.length,
  }];
}

// ─── Pedidos: faturado (NF + boleto) / NF / boleto disponível ────────────────
function alertasFaturamento({ pedidosAnexos, hoje }: EngineInput): Alerta[] {
  const out: Alerta[] = [];
  // Janela de relevância: pedidos emitidos nos últimos 45 dias
  const recentes = pedidosAnexos.filter(p => p.data_emissao && diasDesde(p.data_emissao, hoje) <= 45);

  const faturados: PedidoComAnexos[] = [];
  for (const p of recentes) {
    const temNF = p.anexos.some(a => classifyAnexo(a.tipo) === 'nf');
    const temBoleto = p.anexos.some(a => classifyAnexo(a.tipo) === 'boleto');
    if (temNF && temBoleto) {
      faturados.push(p);
    } else if (temNF) {
      out.push({
        id: `nf:${p.numero_pedido}`,
        tipo: 'nf_disponivel',
        prioridade: ALERT_DEFS.nf_disponivel.prioridade,
        titulo: `Nota Fiscal disponível — pedido ${p.numero_pedido}`,
        descricao: nomeCliente(p.cliente_nome, p.cliente_fantasia),
        data: p.data_emissao,
        rota: '/financeiro',
        acao: 'Baixar NF',
      });
    } else if (temBoleto) {
      out.push({
        id: `boleto:${p.numero_pedido}`,
        tipo: 'boleto_disponivel',
        prioridade: ALERT_DEFS.boleto_disponivel.prioridade,
        titulo: `Boleto disponível — pedido ${p.numero_pedido}`,
        descricao: nomeCliente(p.cliente_nome, p.cliente_fantasia),
        data: p.data_emissao,
        rota: '/financeiro',
        acao: 'Baixar boleto',
      });
    }
  }

  // Faturados: até 4 cards individuais; acima disso, agrupa
  if (faturados.length <= 4) {
    for (const p of faturados) {
      out.push({
        id: `faturado:${p.numero_pedido}`,
        tipo: 'pedido_faturado',
        prioridade: ALERT_DEFS.pedido_faturado.prioridade,
        titulo: `Pedido ${p.numero_pedido} foi faturado`,
        descricao: nomeCliente(p.cliente_nome, p.cliente_fantasia),
        detalhe: 'Nota Fiscal e boleto disponíveis.',
        data: p.data_emissao,
        rota: '/financeiro',
        acao: 'Baixar documentos',
      });
    }
  } else if (faturados.length > 0) {
    const hojeStr = hoje.toISOString().slice(0, 10);
    out.push({
      id: `faturado-grupo:${hojeStr}`,
      tipo: 'pedido_faturado',
      prioridade: ALERT_DEFS.pedido_faturado.prioridade,
      titulo: `${faturados.length} pedidos faturados recentemente`,
      descricao: 'Notas fiscais e boletos disponíveis para download.',
      data: hojeStr,
      rota: '/financeiro',
      acao: 'Baixar documentos',
      agrupado: faturados.length,
    });
  }
  return out;
}

// ─── Avisos do sistema (tabela concremapprep_notificacoes) ──────────────────
function alertasSistema({ notificacoesDB }: EngineInput): Alerta[] {
  return notificacoesDB.map(n => ({
    id: `db:${n.id}`,
    tipo: (n.tipo === 'sistema' ? 'aviso_sistema' : 'atualizacao') as Alerta['tipo'],
    prioridade: ALERT_DEFS.aviso_sistema.prioridade,
    titulo: n.titulo,
    descricao: n.mensagem,
    data: n.created_at,
    rota: n.link ?? '/alertas',
    acao: n.link ? 'Abrir' : 'Ver',
  }));
}

// ─── Entrada principal ───────────────────────────────────────────────────────
export function gerarAlertas(input: EngineInput): Alerta[] {
  const todos = [
    ...alertasOrcamentos(input),
    ...alertasRecompra(input),
    ...alertasFaturamento(input),
    ...alertasSistema(input),
    // Tipos meta_atingida / comissao_liberada estão registrados e prontos na
    // arquitetura; geradores entram quando houver dados de metas no banco.
  ];
  // Mais recente primeiro dentro do conjunto
  return todos.sort((a, b) => (b.data ?? '').localeCompare(a.data ?? ''));
}
