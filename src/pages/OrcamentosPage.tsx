import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { formatDate, formatCurrency } from '@/utils/formatters';
import { Card, CardContent } from '@/components/ui/Card';
import { Search, Plus, FileText, Clock, CheckCircle, XCircle, Send, RotateCcw, Pencil, AlertTriangle, Eye, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import OrcamentoPDFButton from '@/components/OrcamentoPDFButton';
import { cn } from '@/utils/cn';
import { useOrcamentos } from '@/hooks/useOrcamentos';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { enviarOrcamento, excluirOrcamento, fetchOrcamentoItens } from '@/services/orcamentos';
import type { Orcamento, OrcamentoItem, OrcamentoStatusReal } from '@/types';

// ─── Status config ─────────────────────────────────────
const STATUS_CONFIG: Record<OrcamentoStatusReal, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  rascunho:   { label: 'Rascunho',   bg: 'bg-gray-100',    text: 'text-gray-600',   icon: FileText     },
  enviado:    { label: 'Enviado',    bg: 'bg-blue-50',     text: 'text-blue-700',   icon: Send         },
  em_analise: { label: 'Em Análise', bg: 'bg-amber-50',    text: 'text-amber-700',  icon: Clock        },
  aprovado:   { label: 'Aprovado',   bg: 'bg-green-50',    text: 'text-green-700',  icon: CheckCircle  },
  rejeitado:  { label: 'Rejeitado',  bg: 'bg-red-50',      text: 'text-red-700',    icon: XCircle      },
};

const STATUSES = Object.keys(STATUS_CONFIG) as OrcamentoStatusReal[];

function StatusBadge({ status }: { status: OrcamentoStatusReal }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full', cfg.bg, cfg.text)}>
      <Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}

// ─── Card individual ───────────────────────────────────────
interface CardProps {
  orc: Orcamento;
  onEnviar: (id: string) => void;
  onExcluir: (id: string) => void;
}

function OrcamentoCard({ orc, onEnviar, onExcluir }: CardProps) {
  const [showDetails, setShowDetails]   = useState(false);
  const [itens, setItens]               = useState<OrcamentoItem[] | null>(null);
  const [loadingItens, setLoadingItens] = useState(false);

  async function toggleDetails() {
    const next = !showDetails;
    setShowDetails(next);
    if (next && itens === null) {
      setLoadingItens(true);
      try { setItens(await fetchOrcamentoItens(orc.id)); }
      finally { setLoadingItens(false); }
    }
  }

  const nome = orc.cliente_fantasia?.trim() || orc.cliente_nome;

  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-gray-400">#{orc.numero}</span>
              <StatusBadge status={orc.status} />
            </div>
            <p className="font-semibold text-gray-900 text-sm mt-0.5 truncate">{nome}</p>
            {orc.obra_referencia && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">Obra: {orc.obra_referencia}</p>
            )}
            <div className="flex gap-3 mt-1 text-xs text-gray-400 flex-wrap">
              <span>Criado em {formatDate(orc.created_at)}</span>
              {orc.validade && <span>Validade: {formatDate(orc.validade)}</span>}
              {orc.condicao_pagamento && <span>{orc.condicao_pagamento}</span>}
            </div>

            {orc.status === 'rejeitado' && orc.observacoes && (
              <div className="mt-2 flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold text-red-600 mb-0.5">Motivo da rejeição</p>
                  <p className="text-xs text-red-700">{orc.observacoes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
            {orc.status !== 'rascunho' && (
              <OrcamentoPDFButton orcamentoId={orc.id} numero={orc.numero} />
            )}

            <button
              onClick={toggleDetails}
              className="h-7 px-2.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
            >
              {loadingItens
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Eye className="w-3 h-3" />
              }
              {showDetails ? 'Fechar' : 'Detalhes'}
              {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {orc.status === 'rascunho' && (
              <>
                <Link
                  to={`/orcamentos/${orc.id}/editar`}
                  className="h-7 px-2.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
                >
                  <Pencil className="w-3 h-3" />
                  Editar
                </Link>
                <button
                  onClick={() => onEnviar(orc.id)}
                  className="h-7 px-2.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  Enviar
                </button>
                <button
                  onClick={() => onExcluir(orc.id)}
                  className="h-7 px-2.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Excluir
                </button>
              </>
            )}
          </div>
        </div>

        {/* Detalhes expandidos */}
        {showDetails && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            {loadingItens ? (
              <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Carregando itens...
              </div>
            ) : itens && itens.length > 0 ? (
              <div className="space-y-1">
                {itens.map((item, i) => (
                  <div key={item.id ?? i} className="flex items-center justify-between text-xs gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-gray-700 font-medium truncate block">{item.produto_descricao}</span>
                      <span className="text-gray-400">{item.produto_codigo} · {item.quantidade} {item.unidade}</span>
                    </div>
                    {item.preco_unitario ? (
                      <span className="text-gray-700 tabular-nums flex-shrink-0">
                        {formatCurrency(item.preco_unitario * item.quantidade)}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-[10px] flex-shrink-0">Sem preço</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 py-1">Nenhum item adicionado</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function OrcamentosPage() {
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<OrcamentoStatusReal | 'todos'>('todos');
  const [confirmEnviar, setConfirmEnviar] = useState<string | null>(null);
  const [confirmExcluir, setConfirmExcluir] = useState<string | null>(null);

  const qc = useQueryClient();
  const { data: orcamentos = [], isLoading } = useOrcamentos();

  const enviarMut = useMutation({
    mutationFn: enviarOrcamento,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orcamentos'] }); setConfirmEnviar(null); },
  });

  const excluirMut = useMutation({
    mutationFn: excluirOrcamento,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orcamentos'] }); setConfirmExcluir(null); },
  });

  const filtered = useMemo(() => {
    let list = [...orcamentos];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.numero.toLowerCase().includes(q) ||
        o.cliente_nome.toLowerCase().includes(q) ||
        (o.cliente_fantasia ?? '').toLowerCase().includes(q) ||
        o.cliente_cnpj.includes(q) ||
        (o.obra_referencia ?? '').toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'todos') {
      list = list.filter(o => o.status === statusFilter);
    }

    return list;
  }, [orcamentos, search, statusFilter]);

  // Contagens por status
  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: orcamentos.length };
    STATUSES.forEach(s => { c[s] = orcamentos.filter(o => o.status === s).length; });
    return c;
  }, [orcamentos]);

  if (isLoading) {
    return (
      <div className="p-5 flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[hsl(142,93%,8%)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-400">Carregando orçamentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Orçamentos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{orcamentos.length} orçamento(s)</p>
        </div>
        <Link
          to="/orcamentos/novo"
          className="flex items-center gap-1.5 h-9 px-4 bg-[hsl(142,93%,8%)] text-white text-sm font-medium rounded-lg hover:bg-[hsl(142,93%,15%)] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Orçamento
        </Link>
      </div>

      {/* Filtros por status */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setStatusFilter('todos')}
          className={cn(
            'px-2.5 py-1 rounded-full text-xs font-medium transition-all',
            statusFilter === 'todos' ? 'bg-[hsl(142,93%,8%)] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          Todos ({counts.todos})
        </button>
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-medium transition-all',
              statusFilter === s ? 'bg-[hsl(142,93%,8%)] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {STATUS_CONFIG[s].label} ({counts[s]})
          </button>
        ))}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nº, cliente, obra..."
          className="w-full h-9 pl-9 pr-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(142,93%,8%)] focus:border-transparent"
        />
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Nenhum orçamento encontrado</p>
            <Link
              to="/orcamentos/novo"
              className="inline-flex items-center gap-1.5 mt-4 text-sm text-[hsl(142,93%,8%)] font-medium hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              Criar primeiro orçamento
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(orc => (
            <OrcamentoCard
              key={orc.id}
              orc={orc}
              onEnviar={setConfirmEnviar}
              onExcluir={setConfirmExcluir}
            />
          ))}
        </div>
      )}

      {/* Confirm enviar */}
      {confirmEnviar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-gray-900 mb-2">Enviar orçamento?</h3>
            <p className="text-sm text-gray-600 mb-4">
              O orçamento será encaminhado para a equipe de análise. Após enviado não será possível editar.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmEnviar(null)}
                className="h-9 px-4 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => enviarMut.mutate(confirmEnviar)}
                disabled={enviarMut.isPending}
                className="h-9 px-4 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {enviarMut.isPending && <RotateCcw className="w-3.5 h-3.5 animate-spin" />}
                Confirmar Envio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm excluir */}
      {confirmExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-gray-900 mb-2">Excluir rascunho?</h3>
            <p className="text-sm text-gray-600 mb-4">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmExcluir(null)}
                className="h-9 px-4 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => excluirMut.mutate(confirmExcluir)}
                disabled={excluirMut.isPending}
                className="h-9 px-4 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
