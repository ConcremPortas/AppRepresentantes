import { useState, useMemo } from 'react';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { Card, CardContent } from '@/components/ui/Card';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X, CheckCircle2, Unlock, Map, Wrench, Handshake, Factory, FileCheck2, Truck, PackageCheck, FileText, Receipt, Download } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { PedidoVenda, PedidoStatus } from '@/types';
import { usePedidosVenda, useRepresentantesUnicos, useSituacoesEntrega } from '@/hooks/usePedidosVenda';
import { getPedidoItens, PAGE_SIZE } from '@/services/pedidosVenda';

// ─── Config pipeline (mesma do Acompanhamento) ─────────────
const PIPELINE: Record<string, { label: string; icon: React.ElementType; pill: string }> = {
  aprovado:   { label: 'Aprovado',   icon: CheckCircle2, pill: 'bg-blue-50 text-blue-700 border-blue-200'       },
  liberado:   { label: 'Liberado',   icon: Unlock,       pill: 'bg-violet-50 text-violet-700 border-violet-200' },
  mapeamento: { label: 'Mapeamento', icon: Map,          pill: 'bg-purple-50 text-purple-700 border-purple-200' },
  ferragem:   { label: 'Ferragem',   icon: Wrench,       pill: 'bg-orange-50 text-orange-700 border-orange-200' },
  comercial:  { label: 'Comercial',  icon: Handshake,    pill: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  producao:   { label: 'Produção',   icon: Factory,      pill: 'bg-amber-50 text-amber-700 border-amber-200'    },
  faturado:   { label: 'Faturado',   icon: FileCheck2,   pill: 'bg-teal-50 text-teal-700 border-teal-200'       },
  entrega:    { label: 'Entrega',    icon: Truck,        pill: 'bg-sky-50 text-sky-700 border-sky-200'           },
  finalizado: { label: 'Finalizado', icon: PackageCheck, pill: 'bg-green-50 text-green-700 border-green-200'    },
};

// ─── Anos / Meses ──────────────────────────────────────────
const ANO_ATUAL = new Date().getFullYear();
const ANOS = Array.from({ length: 5 }, (_, i) => ANO_ATUAL - i);
const MESES = [
  { v: 1, l: 'Jan' }, { v: 2, l: 'Fev' }, { v: 3, l: 'Mar' },
  { v: 4, l: 'Abr' }, { v: 5, l: 'Mai' }, { v: 6, l: 'Jun' },
  { v: 7, l: 'Jul' }, { v: 8, l: 'Ago' }, { v: 9, l: 'Set' },
  { v: 10, l: 'Out' }, { v: 11, l: 'Nov' }, { v: 12, l: 'Dez' },
];

// ─── Input de texto compacto ───────────────────────────────
function FilterInput({
  placeholder, value, onChange,
}: { placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative flex-1 min-w-[120px]">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(142,93%,8%)] focus:border-transparent placeholder:text-gray-400"
      />
    </div>
  );
}

// ─── Select compacto ───────────────────────────────────────
function FilterSelect({
  value, onChange, options, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <div className="relative min-w-[100px]">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cn(
          'w-full h-9 pl-3 pr-7 text-sm border rounded-lg appearance-none transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-[hsl(142,93%,8%)] focus:border-transparent',
          value ? 'border-[hsl(142,93%,8%)] text-gray-900 font-medium' : 'border-gray-200 text-gray-400',
        )}
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
    </div>
  );
}

// ─── Card de pedido ────────────────────────────────────────
function PedidoCard({ pedido }: { pedido: PedidoVenda }) {
  const [expanded, setExpanded] = useState(false);
  const itens = useMemo(() => getPedidoItens(pedido), [pedido.dados_tabela]);
  const nomeCliente = pedido.cliente_fantasia?.trim() || pedido.cliente_nome;

  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-gray-400 whitespace-nowrap">#{pedido.numero_pedido}</span>
              {pedido.numero_nota && (
                <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded font-medium">
                  NF {pedido.numero_nota}
                </span>
              )}
              {(() => {
                const cfg = pedido.status_pipeline ? PIPELINE[pedido.status_pipeline as PedidoStatus] : null;
                if (!cfg) return null;
                const Icon = cfg.icon;
                return (
                  <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border', cfg.pill)}>
                    <Icon className="w-2.5 h-2.5" />
                    {cfg.label}
                  </span>
                );
              })()}
            </div>
            <p className="font-semibold text-gray-900 text-sm mt-0.5 truncate">{nomeCliente}</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{pedido.representante}</p>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="font-bold text-gray-900 text-sm tabular-nums">{formatCurrency(pedido.total_pedido_venda)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{formatDate(pedido.data_emissao)}</p>
            {pedido.previsao_embarque && (
              <p className="text-[10px] text-amber-600 mt-0.5">Emb: {formatDate(pedido.previsao_embarque)}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          <span>{itens.length} item(ns)</span>
          <span>{pedido.total_qtd} un.</span>
          {pedido.frete > 0    && <span>Frete: {formatCurrency(pedido.frete)}</span>}
          {pedido.desconto > 0 && <span>Desc: {formatCurrency(pedido.desconto)}</span>}
          <span className="text-gray-400">{pedido.cliente_cidade}/{pedido.cliente_uf}</span>
        </div>

        {/* Anexos: notas fiscais e boletos */}
        {(pedido.anexos ?? []).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {(pedido.anexos ?? []).map((anexo, i) => {
              const isNF = anexo.tipo?.toLowerCase().includes('nota');
              const Icon = isNF ? FileText : Receipt;
              const label = isNF ? 'Nota Fiscal' : anexo.tipo === 'boleto' ? 'Boleto' : anexo.arquivo_nome;
              return (
                <a
                  key={i}
                  href={anexo.arquivo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-colors bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300"
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  {label}
                  <Download className="w-3 h-3 opacity-50" />
                </a>
              );
            })}
          </div>
        )}

        {itens.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-2 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'Ocultar' : 'Ver'} itens
          </button>
        )}

        {expanded && (
          <div className="mt-3 border-t border-gray-100 pt-3 space-y-1.5">
            {itens.map((item, i) => (
              <div key={item.id ?? i} className="flex items-start justify-between gap-2 text-xs">
                <div className="flex-1 min-w-0">
                  <span className="text-gray-700 font-medium">{item.produto}</span>
                  <span className="text-gray-400 ml-1">
                    {item.qtd} {item.un}
                    {item.percentual_desconto > 0 && ` · -${item.percentual_desconto}%`}
                  </span>
                </div>
                <span className="text-gray-900 font-semibold tabular-nums flex-shrink-0">
                  {formatCurrency(item.valor_total)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Paginação ─────────────────────────────────────────────
function Paginacao({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;
  const start = (page - 1) * PAGE_SIZE + 1;
  const end   = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-xs text-gray-500">{start}–{end} de {total.toLocaleString('pt-BR')} pedidos</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(page - 1)} disabled={page === 1}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs text-gray-600 px-2">{page} / {totalPages}</span>
        <button onClick={() => onChange(page + 1)} disabled={page === totalPages}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Página ────────────────────────────────────────────────
export default function PedidosPage() {
  const [page, setPage]                   = useState(1);

  // inputs locais (aplicados ao buscar / ao mudar selects)
  const [searchInput, setSearchInput]     = useState('');
  const [clienteInput, setClienteInput]   = useState('');

  // filtros aplicados (disparam fetch)
  const [search, setSearch]               = useState('');
  const [cliente, setCliente]             = useState('');
  const [ano, setAno]                     = useState('');
  const [mes, setMes]                     = useState('');
  const [representante, setRepresentante] = useState('');
  const [situacao, setSituacao]           = useState('');

  const { data: result, isLoading, isFetching } = usePedidosVenda({
    page,
    search:          search        || undefined,
    cliente:         cliente       || undefined,
    representante:   representante || undefined,
    ano:             ano ? Number(ano) : undefined,
    mes:             mes ? Number(mes) : undefined,
    situacaoEntrega: situacao      || undefined,
  });

  const { data: repsUnicos = [] } = useRepresentantesUnicos();
  const { data: situacoes  = [] } = useSituacoesEntrega();

  const pedidos = result?.data  ?? [];
  const total   = result?.total ?? 0;

  const hasFilters = !!(search || cliente || ano || mes || representante || situacao);

  function goPage(p: number) { setPage(p); window.scrollTo(0, 0); }

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setCliente(clienteInput);
    setPage(1);
  }

  function clearFilters() {
    setSearch(''); setSearchInput('');
    setCliente(''); setClienteInput('');
    setAno(''); setMes('');
    setRepresentante(''); setSituacao('');
    setPage(1);
  }

  function handleSelect(setter: (v: string) => void) {
    return (v: string) => { setter(v); setPage(1); };
  }

  const totalValorPagina = pedidos.reduce((s, p) => s + p.total_pedido_venda, 0);

  const repsOpts  = repsUnicos.map(r => ({ value: r, label: r }));
  const sitOpts   = situacoes.map(s => ({ value: s, label: s }));
  const anosOpts  = ANOS.map(a => ({ value: String(a), label: String(a) }));
  const mesesOpts = MESES.map(m => ({ value: String(m.v), label: m.l }));

  return (
    <div className="p-4 space-y-3">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Pedidos de Venda</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {total > 0 ? `${total.toLocaleString('pt-BR')} pedidos encontrados` : isLoading ? 'Carregando...' : '0 pedidos'}
        </p>
      </div>

      {/* Barra de filtros unificada */}
      <form onSubmit={applySearch}>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Nº Pedido / CNPJ */}
          <FilterInput
            placeholder="Nº pedido / CNPJ..."
            value={searchInput}
            onChange={setSearchInput}
          />

          {/* Cliente */}
          <FilterInput
            placeholder="Cliente..."
            value={clienteInput}
            onChange={setClienteInput}
          />

          {/* Ano */}
          <FilterSelect value={ano} onChange={handleSelect(setAno)} options={anosOpts} placeholder="Ano" />

          {/* Mês */}
          <FilterSelect value={mes} onChange={handleSelect(setMes)} options={mesesOpts} placeholder="Mês" />

          {/* Representante */}
          <div className="relative min-w-[140px] flex-1">
            <select
              value={representante}
              onChange={e => { setRepresentante(e.target.value); setPage(1); }}
              className={cn(
                'w-full h-9 pl-3 pr-7 text-sm border rounded-lg appearance-none transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-[hsl(142,93%,8%)] focus:border-transparent',
                representante ? 'border-[hsl(142,93%,8%)] text-gray-900 font-medium' : 'border-gray-200 text-gray-400',
              )}
            >
              <option value="">Representante</option>
              {repsOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          {/* Situação entrega */}
          <div className="relative min-w-[160px]">
            <select
              value={situacao}
              onChange={e => { setSituacao(e.target.value); setPage(1); }}
              className={cn(
                'w-full h-9 pl-3 pr-7 text-sm border rounded-lg appearance-none transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-[hsl(142,93%,8%)] focus:border-transparent',
                situacao ? 'border-[hsl(142,93%,8%)] text-gray-900 font-medium' : 'border-gray-200 text-gray-400',
              )}
            >
              <option value="">Sit. Entrega</option>
              {sitOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          {/* Buscar */}
          <button type="submit"
            className="h-9 px-5 bg-[hsl(142,93%,8%)] text-white text-sm rounded-lg hover:bg-[hsl(142,93%,15%)] transition-colors whitespace-nowrap flex-shrink-0">
            Buscar
          </button>

          {/* Limpar */}
          {hasFilters && (
            <button type="button" onClick={clearFilters}
              className="h-9 px-3 flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0">
              <X className="w-3.5 h-3.5" />
              Limpar
            </button>
          )}
        </div>
      </form>

      {/* KPI rápido */}
      {pedidos.length > 0 && (
        <div className="flex items-center justify-between text-xs text-gray-500 px-1">
          <span>{pedidos.length} pedidos nesta página</span>
          <span className="font-semibold text-gray-700">Subtotal: {formatCurrency(totalValorPagina)}</span>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[hsl(142,93%,8%)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-400">Carregando pedidos...</p>
          </div>
        </div>
      )}

      {/* Lista */}
      {!isLoading && (
        <div className={cn('space-y-2', isFetching && 'opacity-60 pointer-events-none')}>
          {pedidos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-gray-400">
                Nenhum pedido encontrado
              </CardContent>
            </Card>
          ) : (
            pedidos.map(ped => <PedidoCard key={ped.id} pedido={ped} />)
          )}
        </div>
      )}

      {/* Paginação */}
      {!isLoading && total > PAGE_SIZE && (
        <Paginacao page={page} total={total} onChange={goPage} />
      )}
    </div>
  );
}
