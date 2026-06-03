import { useState, useMemo } from 'react';
import { formatCurrency } from '@/utils/formatters';
import { Card, CardContent } from '@/components/ui/Card';
import {
  Search,
  CheckCircle2,
  Unlock,
  Map,
  Wrench,
  Handshake,
  Factory,
  FileCheck2,
  Truck,
  PackageCheck,
  ChevronDown,
  ChevronUp,
  Package,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAcompanhamento } from '@/hooks/useAcompanhamento';
import type { PedidoStatus } from '@/types';
import type { PedidoStatusLog, PedidoAcompanhamento } from '@/services/acompanhamento';

// ─── Helpers de data ───────────────────────────────────────
const TZ = 'America/Sao_Paulo';

function fmtShort(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit' }).format(d);
}

function fmtFull(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const date = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: '2-digit' }).format(d);
  const time = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  return `${date} ${time}`;
}

// ─── Configuração do pipeline ──────────────────────────────
const STEPS: {
  key: PedidoStatus;
  label: string;
  icon: React.ElementType;
  bg: string;
  ring: string;
  text: string;
  line: string;
  pill: string;
}[] = [
  { key: 'aprovado',   label: 'Aprovado',   icon: CheckCircle2, bg: 'bg-blue-500',   ring: 'ring-blue-200',   text: 'text-blue-600',   line: 'bg-blue-400',   pill: 'bg-blue-50 text-blue-700 border-blue-200'     },
  { key: 'liberado',   label: 'Liberado',   icon: Unlock,       bg: 'bg-violet-500', ring: 'ring-violet-200', text: 'text-violet-600', line: 'bg-violet-400', pill: 'bg-violet-50 text-violet-700 border-violet-200' },
  { key: 'mapeamento', label: 'Mapeamento', icon: Map,          bg: 'bg-purple-500', ring: 'ring-purple-200', text: 'text-purple-600', line: 'bg-purple-400', pill: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'ferragem',   label: 'Ferragem',   icon: Wrench,       bg: 'bg-orange-500', ring: 'ring-orange-200', text: 'text-orange-600', line: 'bg-orange-400', pill: 'bg-orange-50 text-orange-700 border-orange-200' },
  { key: 'comercial',  label: 'Comercial',  icon: Handshake,    bg: 'bg-indigo-500', ring: 'ring-indigo-200', text: 'text-indigo-600', line: 'bg-indigo-400', pill: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { key: 'producao',   label: 'Produção',   icon: Factory,      bg: 'bg-amber-500',  ring: 'ring-amber-200',  text: 'text-amber-600',  line: 'bg-amber-400',  pill: 'bg-amber-50 text-amber-700 border-amber-200'   },
  { key: 'faturado',   label: 'Faturado',   icon: FileCheck2,   bg: 'bg-teal-500',   ring: 'ring-teal-200',   text: 'text-teal-600',   line: 'bg-teal-400',   pill: 'bg-teal-50 text-teal-700 border-teal-200'     },
  { key: 'entrega',    label: 'Entrega',    icon: Truck,        bg: 'bg-sky-500',    ring: 'ring-sky-200',    text: 'text-sky-600',    line: 'bg-sky-400',    pill: 'bg-sky-50 text-sky-700 border-sky-200'         },
  { key: 'finalizado', label: 'Finalizado', icon: PackageCheck, bg: 'bg-green-500',  ring: 'ring-green-200',  text: 'text-green-600',  line: 'bg-green-400',  pill: 'bg-green-50 text-green-700 border-green-200'  },
];

const STEP_INDEX = Object.fromEntries(STEPS.map((s, i) => [s.key, i])) as Record<PedidoStatus, number>;

// ─── Pipeline visual ───────────────────────────────────────
function Pipeline({ status, logs }: { status: PedidoStatus; logs: PedidoStatusLog[] }) {
  const currentIdx = STEP_INDEX[status] ?? 0;

  // Objeto: status → data da primeira ocorrência no histórico
  const dateByStatus = useMemo(() => {
    const map: Record<string, string> = {};
    for (const log of [...logs].reverse()) {
      map[log.status] = log.created_at;
    }
    return map;
  }, [logs]);

  return (
    <div className="mt-3 mb-1 -mx-1 overflow-x-auto scrollbar-thin">
      <div className="flex items-start px-1 pb-1" style={{ minWidth: `${STEPS.length * 56}px` }}>
        {STEPS.map((step, i) => {
          const done    = i < currentIdx;
          const current = i === currentIdx;
          const Icon    = step.icon;
          const dateStr = dateByStatus[step.key];

          return (
            <div key={step.key} className="flex items-center flex-1 min-w-0">
              {/* Nó */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center transition-all',
                  done    && `${step.bg} shadow-sm`,
                  current && `${step.bg} ring-4 ${step.ring} shadow-md scale-110`,
                  !done && !current && 'bg-gray-100',
                )}>
                  <Icon className={cn('w-3.5 h-3.5', done || current ? 'text-white' : 'text-gray-300')} />
                </div>

                <span className={cn(
                  'text-[8px] font-medium mt-1 whitespace-nowrap leading-tight text-center',
                  done    && step.text,
                  current && cn(step.text, 'font-bold'),
                  !done && !current && 'text-gray-300',
                )}>
                  {step.label}
                </span>

                {/* Data do step */}
                {(done || current) && dateStr ? (
                  <span className={cn('text-[7px] leading-tight mt-0.5 tabular-nums', step.text, 'opacity-80')}>
                    {fmtShort(dateStr)}
                  </span>
                ) : (done || current) ? (
                  <span className="text-[7px] leading-tight mt-0.5 text-gray-300">—</span>
                ) : null}
              </div>

              {/* Linha conectora */}
              {i < STEPS.length - 1 && (
                <div className={cn(
                  'flex-1 h-0.5 mx-0.5 mt-[-20px]',
                  done ? step.line : 'bg-gray-200',
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Card de pedido ────────────────────────────────────────
function PedidoCard({ pedido }: { pedido: PedidoAcompanhamento }) {
  const [showLog, setShowLog] = useState(false);
  const nomeCliente = pedido.cliente_fantasia?.trim() || pedido.cliente_nome;
  const cfg = STEPS[STEP_INDEX[pedido.status]] ?? STEPS[0];

  return (
    <Card className={cn('border-l-4 transition-shadow hover:shadow-md', cfg.bg.replace('bg-', 'border-l-'))}>
      <CardContent className="py-3 px-4">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-gray-400">#{pedido.numero_pedido}</span>
              <span className={cn(
                'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                cfg.pill,
              )}>
                <cfg.icon className="w-2.5 h-2.5" />
                {cfg.label}
              </span>
            </div>
            <p className="font-semibold text-gray-900 text-sm mt-0.5 truncate">{nomeCliente}</p>
            <p className="text-xs text-gray-400">{pedido.cliente_cnpj}</p>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="font-bold text-gray-900 text-sm tabular-nums">
              {formatCurrency(pedido.total_pedido_venda)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Emissão: {fmtShort(pedido.data_emissao)}
            </p>
          </div>
        </div>

        {/* Pipeline com datas */}
        <Pipeline status={pedido.status} logs={pedido.logs} />

        {/* Observação */}
        {pedido.status_observacao && (
          <p className="text-xs text-gray-500 mt-1 italic border-l-2 border-gray-200 pl-2">
            {pedido.status_observacao}
          </p>
        )}

        {/* Botão histórico */}
        {pedido.logs.length > 0 && (
          <>
            <button
              onClick={() => setShowLog(!showLog)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-2 transition-colors"
            >
              {showLog ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showLog ? 'Ocultar' : 'Ver'} histórico ({pedido.logs.length})
            </button>

            {showLog && (
              <div className="mt-2 border-t border-gray-100 pt-2 space-y-1">
                {pedido.logs.map(log => {
                  const logCfg = STEPS[STEP_INDEX[log.status]] ?? STEPS[0];
                  return (
                    <div key={log.id} className="flex items-center gap-2 text-xs">
                      {/* Ícone colorido */}
                      <div className={cn('w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0', logCfg.bg)}>
                        <logCfg.icon className="w-3 h-3 text-white" />
                      </div>
                      {/* Label + observação */}
                      <div className="flex-1 min-w-0">
                        <span className={cn('font-semibold', logCfg.text)}>
                          {log.status_db.replace(/_/g, ' ')}
                        </span>
                        {log.observacao && (
                          <span className="text-gray-400 ml-1">· {log.observacao}</span>
                        )}
                        {log.responsavel && (
                          <span className="text-gray-300 ml-1 text-[10px]">({log.responsavel})</span>
                        )}
                      </div>
                      {/* Data/hora */}
                      <span className="text-gray-400 flex-shrink-0 tabular-nums text-[10px] bg-gray-50 px-1.5 py-0.5 rounded">
                        {fmtFull(log.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Override temporário para apresentação (remover depois) ──
const STATUS_OVERRIDE: Record<string, PedidoStatus> = {
  '135732': 'mapeamento',
  '135128': 'producao',
  '133469': 'finalizado',
};

// ─── Filtros ───────────────────────────────────────────────
type FilterView = 'todos' | PedidoStatus;

// ─── Página ────────────────────────────────────────────────
export default function AcompanhamentoPage() {
  const [search, setSearch] = useState('');
  const [view, setView]     = useState<FilterView>('todos');

  const { data: pedidos = [], isLoading, isError, error } = useAcompanhamento();

  const OVERRIDE_ORDER = ['133469', '135128', '135732'];

  const filtered = useMemo(() => {
    let list = pedidos.map(p =>
      STATUS_OVERRIDE[p.numero_pedido]
        ? { ...p, status: STATUS_OVERRIDE[p.numero_pedido], logs: [] }
        : p,
    );
    // Coloca os pedidos de apresentação no topo na ordem definida
    const overrideItems = OVERRIDE_ORDER
      .map(n => list.find(p => p.numero_pedido === n))
      .filter(Boolean) as typeof list;
    const rest = list.filter(p => !STATUS_OVERRIDE[p.numero_pedido]);
    list = [...overrideItems, ...rest];
    if (view !== 'todos') {
      list = list.filter(p => p.status === view);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.numero_pedido.toLowerCase().includes(q) ||
        p.cliente_nome.toLowerCase().includes(q) ||
        (p.cliente_fantasia ?? '').toLowerCase().includes(q) ||
        p.cliente_cnpj.includes(q),
      );
    }
    return list;
  }, [pedidos, view, search]);

  // Contagem por status
  const countByStatus = useMemo(() => {
    const map: Record<string, number> = { todos: pedidos.length };
    for (const p of pedidos) {
      map[p.status] = (map[p.status] ?? 0) + 1;
    }
    return map;
  }, [pedidos]);

  // Filtros: Todos + cada step do pipeline
  const STATUS_FILTERS: { key: FilterView; label: string; dot: string }[] = [
    { key: 'todos',      label: 'Todos',      dot: 'bg-gray-400'    },
    ...STEPS.map(s => ({ key: s.key as FilterView, label: s.label, dot: s.bg })),
  ];

  if (isLoading) {
    return (
      <div className="p-5 flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[hsl(142,93%,8%)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-400">Carregando pedidos...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-5">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-red-700">Erro ao carregar pedidos</p>
          <p className="text-xs text-red-500 mt-1 font-mono break-all">
            {error instanceof Error
              ? error.message
              : (error as any)?.message ?? JSON.stringify(error)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Acompanhamento de Pedidos</h1>
        <p className="text-sm text-gray-500 mt-0.5">Status de produção e entrega dos seus pedidos</p>
      </div>

      {/* Filtros por status */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {STATUS_FILTERS.map(({ key, label, dot }) => {
          const count = countByStatus[key] ?? 0;
          const active = view === key;
          return (
            <button
              key={key}
              onClick={() => setView(key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all whitespace-nowrap flex-shrink-0',
                active
                  ? 'bg-[hsl(142,93%,8%)] text-white border-[hsl(142,93%,8%)]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300',
              )}
            >
              <span className={cn('w-2 h-2 rounded-full flex-shrink-0', active ? 'bg-white' : dot)} />
              {label}
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full font-bold',
                active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600',
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nº pedido, cliente ou CNPJ..."
          className="w-full h-9 pl-9 pr-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(142,93%,8%)] focus:border-transparent"
        />
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Nenhum pedido encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(ped => (
            <PedidoCard key={ped.numero_pedido} pedido={ped} />
          ))}
        </div>
      )}
    </div>
  );
}
