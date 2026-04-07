import { useState, useMemo } from 'react';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { Card, CardContent } from '@/components/ui/Card';
import {
  Search, Building2, MapPin, Phone, Mail, ShoppingCart,
  DollarSign, ChevronDown, ChevronUp, Filter,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useCarteira } from '@/hooks/useCarteira';
import type { ClienteCarteira } from '@/services/carteira';

// ─── Formatação CNPJ ──────────────────────────────────
function fmtCnpj(cnpj: string) {
  const n = cnpj.replace(/\D/g, '');
  if (n.length !== 14) return cnpj;
  return n.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

// ─── Card de cliente ──────────────────────────────────
function ClienteCard({ cliente }: { cliente: ClienteCarteira }) {
  const [expanded, setExpanded] = useState(false);
  const nome = cliente.cliente_fantasia?.trim() || cliente.cliente_nome;
  const razao = cliente.cliente_fantasia?.trim() ? cliente.cliente_nome : null;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="py-4 px-4">
        {/* Cabeçalho */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-[hsl(142,93%,8%)]/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-[hsl(142,93%,8%)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{nome}</p>
            {razao && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">{razao}</p>
            )}
            <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{fmtCnpj(cliente.cliente_cnpj)}</p>
          </div>
        </div>

        {/* Métricas rápidas */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-lg px-2.5 py-2">
            <div className="flex items-center gap-1 text-gray-500">
              <ShoppingCart className="w-3 h-3" />
              <span className="text-[10px] font-medium">Pedidos</span>
            </div>
            <p className="text-sm font-bold text-gray-900 mt-0.5">{cliente.total_pedidos}</p>
          </div>
          <div className="bg-emerald-50 rounded-lg px-2.5 py-2">
            <div className="flex items-center gap-1 text-emerald-700">
              <DollarSign className="w-3 h-3" />
              <span className="text-[10px] font-medium">Volume</span>
            </div>
            <p className="text-sm font-bold text-emerald-700 mt-0.5">
              {formatCurrency(cliente.total_comprado)}
            </p>
          </div>
        </div>

        {/* Info de contato — expandível */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-3 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Ocultar' : 'Ver'} contato
        </button>

        {expanded && (
          <div className="mt-2 space-y-1.5 border-t border-gray-100 pt-2">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <MapPin className="w-3 h-3 flex-shrink-0 text-gray-400" />
              <span>{cliente.cliente_cidade}/{cliente.cliente_uf}</span>
            </div>
            {cliente.cliente_telefone && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Phone className="w-3 h-3 flex-shrink-0 text-gray-400" />
                <span>{cliente.cliente_telefone}</span>
              </div>
            )}
            {cliente.cliente_email && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Mail className="w-3 h-3 flex-shrink-0 text-gray-400" />
                <span className="truncate">{cliente.cliente_email}</span>
              </div>
            )}
            {cliente.ultimo_pedido && (
              <p className="text-[10px] text-gray-400 mt-1">
                Último pedido: {formatDate(cliente.ultimo_pedido)}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Página ───────────────────────────────────────────
type SortKey = 'nome' | 'pedidos' | 'volume';

export default function ClientesPage() {
  const [search, setSearch]     = useState('');
  const [ufFilter, setUfFilter] = useState('');
  const [sort, setSort]         = useState<SortKey>('nome');
  const [showFilters, setShowFilters] = useState(false);

  const { data: clientes = [], isLoading } = useCarteira();

  // UFs disponíveis
  const ufsUnicas = useMemo(
    () => [...new Set(clientes.map(c => c.cliente_uf).filter(Boolean))].sort(),
    [clientes]
  );

  const filtered = useMemo(() => {
    let list = [...clientes];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.cliente_nome.toLowerCase().includes(q) ||
        (c.cliente_fantasia ?? '').toLowerCase().includes(q) ||
        c.cliente_cnpj.replace(/\D/g, '').includes(q.replace(/\D/g, ''))
      );
    }

    if (ufFilter) {
      list = list.filter(c => c.cliente_uf === ufFilter);
    }

    if (sort === 'pedidos') list.sort((a, b) => b.total_pedidos - a.total_pedidos);
    else if (sort === 'volume') list.sort((a, b) => b.total_comprado - a.total_comprado);
    // 'nome' já vem ordenado do service

    return list;
  }, [clientes, search, ufFilter, sort]);

  // KPIs
  const totalVolume = clientes.reduce((s, c) => s + c.total_comprado, 0);
  const totalPedidos = clientes.reduce((s, c) => s + c.total_pedidos, 0);
  const ticketMedio = clientes.length > 0 ? totalVolume / clientes.length : 0;

  const hasFilters = search || ufFilter;

  if (isLoading) {
    return (
      <div className="p-5 flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[hsl(142,93%,8%)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-400">Carregando carteira...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Carteira de Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {clientes.length} clientes · {totalPedidos.toLocaleString('pt-BR')} pedidos
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
            showFilters || hasFilters
              ? 'bg-[hsl(142,93%,8%)] text-white border-[hsl(142,93%,8%)]'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          )}
        >
          <Filter className="w-3.5 h-3.5" />
          Filtros
          {hasFilters && (
            <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] font-bold flex items-center justify-center">!</span>
          )}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Clientes', value: clientes.length.toLocaleString('pt-BR') },
          { label: 'Volume Total', value: formatCurrency(totalVolume) },
          { label: 'Ticket Médio', value: formatCurrency(ticketMedio) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-50 rounded-xl px-3 py-2.5 text-center">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5 tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou CNPJ..."
          className="w-full h-9 pl-9 pr-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(142,93%,8%)] focus:border-transparent"
        />
      </div>

      {/* Filtros avançados */}
      {showFilters && (
        <Card>
          <CardContent className="py-3 space-y-3">
            {/* Ordenação */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Ordenar por</p>
              <div className="flex gap-1.5 flex-wrap">
                {([
                  { key: 'nome',    label: 'Nome A-Z' },
                  { key: 'pedidos', label: 'Mais pedidos' },
                  { key: 'volume',  label: 'Maior volume' },
                ] as { key: SortKey; label: string }[]).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSort(key)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                      sort === key
                        ? 'bg-[hsl(142,93%,8%)] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Estado */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Estado (UF)</p>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setUfFilter('')}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                    !ufFilter ? 'bg-[hsl(142,93%,8%)] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  Todos
                </button>
                {ufsUnicas.map(uf => (
                  <button
                    key={uf}
                    onClick={() => setUfFilter(uf)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                      ufFilter === uf ? 'bg-[hsl(142,93%,8%)] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {uf}
                  </button>
                ))}
              </div>
            </div>

            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setUfFilter(''); }}
                className="text-xs text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Contagem filtrada */}
      {(search || ufFilter) && (
        <p className="text-xs text-gray-500 px-1">
          {filtered.length} cliente(s) encontrado(s)
        </p>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-gray-400">
            Nenhum cliente encontrado
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(c => (
            <ClienteCard key={c.cliente_cnpj} cliente={c} />
          ))}
        </div>
      )}
    </div>
  );
}
