import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDate, formatCurrency } from '@/utils/formatters';
import { Card, CardContent } from '@/components/ui/Card';
import {
  AlertTriangle, Clock, CheckCircle2, FileText,
  XCircle, ThumbsUp, ThumbsDown, Eye, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type { Orcamento, OrcamentoItem, OrcamentoStatusReal } from '@/types';
import { useOrcamentos } from '@/hooks/useOrcamentos';
import { useAuth } from '@/hooks/useAuth';
import { marcarEmAnalise, aprovarOrcamento, rejeitarOrcamento, fetchOrcamentoItens } from '@/services/orcamentos';
import OrcamentoPDFButton from '@/components/OrcamentoPDFButton';

// ─── Status config ─────────────────────────────────────────
const STATUS_CFG: Record<OrcamentoStatusReal, { label: string; pill: string }> = {
  rascunho:   { label: 'Rascunho',   pill: 'bg-gray-50 text-gray-500 border-gray-200'    },
  enviado:    { label: 'Enviado',    pill: 'bg-blue-50 text-blue-700 border-blue-200'     },
  em_analise: { label: 'Em Análise', pill: 'bg-amber-50 text-amber-700 border-amber-200'  },
  aprovado:   { label: 'Aprovado',   pill: 'bg-green-50 text-green-700 border-green-200'  },
  rejeitado:  { label: 'Rejeitado',  pill: 'bg-red-50 text-red-700 border-red-200'        },
};

type FilterView = 'pendente' | 'aprovado' | 'rejeitado' | 'todos';

// ─── Card de orçamento para operador ───────────────────────
function OrcamentoCardOperador({ orc }: { orc: Orcamento }) {
  const qc = useQueryClient();
  const [showDetails, setShowDetails]   = useState(false);
  const [rejectMode, setRejectMode]     = useState(false);
  const [motivo, setMotivo]             = useState('');
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

  const invalidate = () => qc.invalidateQueries({ queryKey: ['orcamentos'] });

  const mutEmAnalise = useMutation({ mutationFn: () => marcarEmAnalise(orc.id), onSuccess: invalidate });
  const mutAprovar   = useMutation({ mutationFn: () => aprovarOrcamento(orc.id), onSuccess: invalidate });
  const mutRejeitar  = useMutation({
    mutationFn: () => rejeitarOrcamento(orc.id, motivo),
    onSuccess: () => { invalidate(); setRejectMode(false); setMotivo(''); },
  });

  const isPending = orc.status === 'enviado' || orc.status === 'em_analise';
  const cfg = STATUS_CFG[orc.status];
  const nomeCliente = orc.cliente_fantasia?.trim() || orc.cliente_nome;
  const loading = mutEmAnalise.isPending || mutAprovar.isPending || mutRejeitar.isPending;

  const borderColor =
    orc.status === 'rejeitado'  ? 'border-l-red-400'
    : orc.status === 'aprovado' ? 'border-l-green-400'
    : orc.status === 'em_analise' ? 'border-l-amber-400'
    : 'border-l-blue-400';

  return (
    <Card className={cn('border-l-4', borderColor)}>
      <CardContent className="py-3 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-gray-400">#{orc.numero}</span>
              <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', cfg.pill)}>
                {cfg.label}
              </span>
            </div>
            <p className="font-semibold text-gray-900 text-sm mt-0.5 truncate">{nomeCliente}</p>
            <p className="text-xs text-gray-500 mt-0.5">{orc.cliente_cnpj}</p>
            {orc.obra_referencia && (
              <p className="text-xs text-gray-400 mt-0.5">Obra: {orc.obra_referencia}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
              <span>Atualizado {formatDate(orc.updated_at)}</span>
              {orc.condicao_pagamento && <span>{orc.condicao_pagamento}</span>}
              {orc.validade && <span>Validade: {formatDate(orc.validade)}</span>}
              {orc.representante_erp && <span className="truncate max-w-[200px]">{orc.representante_erp}</span>}
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            {orc.frete_valor && orc.frete_valor > 0 && (
              <p className="text-xs text-gray-400">Frete: {formatCurrency(orc.frete_valor)}</p>
            )}
            <div className="flex flex-col items-end gap-1">
              <OrcamentoPDFButton orcamentoId={orc.id} numero={orc.numero} />
              <button
                onClick={toggleDetails}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                {loadingItens ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                {showDetails ? 'Fechar' : 'Detalhes'}
                {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Observação de rejeição */}
        {orc.status === 'rejeitado' && orc.observacoes && (
          <div className="mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{orc.observacoes}</p>
            </div>
          </div>
        )}

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

        {/* Ações do operador */}
        {isPending && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            {!rejectMode ? (
              <div className="flex flex-wrap gap-2">
                {orc.status === 'enviado' && (
                  <button
                    onClick={() => mutEmAnalise.mutate()}
                    disabled={loading}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Em Análise
                  </button>
                )}
                <button
                  onClick={() => mutAprovar.mutate()}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  Aprovar
                </button>
                <button
                  onClick={() => setRejectMode(true)}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  Rejeitar
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  placeholder="Motivo da rejeição (obrigatório)..."
                  rows={2}
                  className="w-full text-sm border border-red-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => mutRejeitar.mutate()}
                    disabled={!motivo.trim() || loading}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Confirmar Rejeição
                  </button>
                  <button
                    onClick={() => { setRejectMode(false); setMotivo(''); }}
                    className="text-xs text-gray-400 hover:text-gray-600 px-2 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Card somente leitura (representante) ──────────────────
function OrcamentoCardRep({ orc }: { orc: Orcamento }) {
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

  const nomeCliente = orc.cliente_fantasia?.trim() || orc.cliente_nome;
  const cfg = STATUS_CFG[orc.status];

  return (
    <Card className={cn(
      'border-l-4',
      orc.status === 'rejeitado'  ? 'border-l-red-400'
      : orc.status === 'aprovado' ? 'border-l-green-400'
      : orc.status === 'em_analise' ? 'border-l-amber-400'
      : 'border-l-blue-400'
    )}>
      <CardContent className="py-3 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-gray-400">#{orc.numero}</span>
              <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', cfg.pill)}>
                {cfg.label}
              </span>
            </div>
            <p className="font-semibold text-gray-900 mt-0.5 text-sm truncate">{nomeCliente}</p>
            {orc.obra_referencia && (
              <p className="text-xs text-gray-500 mt-0.5">Obra: {orc.obra_referencia}</p>
            )}
            <div className="flex gap-3 mt-1 text-xs text-gray-400">
              <span>{formatDate(orc.updated_at)}</span>
              {orc.condicao_pagamento && <span>{orc.condicao_pagamento}</span>}
            </div>
            {orc.status === 'rejeitado' && orc.observacoes && (
              <div className="mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{orc.observacoes}</p>
                </div>
              </div>
            )}
            {orc.status === 'em_analise' && (
              <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <p className="text-xs text-amber-700">Em análise pela equipe de orçamentos</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <OrcamentoPDFButton orcamentoId={orc.id} numero={orc.numero} />
            <button
              onClick={toggleDetails}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {loadingItens ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
              {showDetails ? 'Fechar' : 'Detalhes'}
              {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
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

// ─── Página ────────────────────────────────────────────────
export default function AprovacoesPage() {
  const { user } = useAuth();
  const isOperador = user?.usuario?.operador ?? false;
  const isAdmin    = user?.usuario?.admin    ?? false;
  const canAct     = isOperador || isAdmin;

  const [view, setView] = useState<FilterView>('pendente');

  const { data: allOrcamentos = [], isLoading } = useOrcamentos();

  const filtered = useMemo(() => {
    const source = canAct
      ? allOrcamentos.filter(o => o.status !== 'rascunho')
      : allOrcamentos.filter(o => ['enviado', 'em_analise', 'aprovado', 'rejeitado'].includes(o.status));

    if (view === 'pendente')  return source.filter(o => o.status === 'enviado' || o.status === 'em_analise');
    if (view === 'aprovado')  return source.filter(o => o.status === 'aprovado');
    if (view === 'rejeitado') return source.filter(o => o.status === 'rejeitado');
    return source;
  }, [allOrcamentos, view, canAct]);

  const counts = useMemo(() => {
    const src = canAct
      ? allOrcamentos.filter(o => o.status !== 'rascunho')
      : allOrcamentos.filter(o => o.status !== 'rascunho');
    return {
      pendente:  src.filter(o => o.status === 'enviado' || o.status === 'em_analise').length,
      aprovado:  src.filter(o => o.status === 'aprovado').length,
      rejeitado: src.filter(o => o.status === 'rejeitado').length,
      todos:     src.length,
    };
  }, [allOrcamentos, canAct]);

  const filters: { key: FilterView; label: string; icon: React.ElementType }[] = [
    { key: 'pendente',  label: 'Pendentes',  icon: Clock        },
    { key: 'aprovado',  label: 'Aprovados',  icon: CheckCircle2 },
    { key: 'rejeitado', label: 'Rejeitados', icon: XCircle      },
    { key: 'todos',     label: 'Todos',      icon: FileText     },
  ];

  if (isLoading) {
    return (
      <div className="p-5 flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[hsl(142,93%,8%)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-400">Carregando aprovações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Aprovações de Orçamentos</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {canAct ? 'Analise, aprove ou rejeite os orçamentos enviados pelos representantes'
                  : 'Acompanhe o status dos seus orçamentos enviados'}
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {filters.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all',
              view === key
                ? 'bg-[hsl(142,93%,8%)] text-white border-[hsl(142,93%,8%)]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            )}
          >
            <Icon className={cn('w-3.5 h-3.5', view === key ? 'text-white' : 'text-gray-500')} />
            {label}
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded-full font-bold',
              view === key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
            )}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600">
                {view === 'pendente' ? 'Nenhum orçamento pendente' : 'Nenhum orçamento encontrado'}
              </p>
            </CardContent>
          </Card>
        ) : canAct ? (
          filtered.map(orc => <OrcamentoCardOperador key={orc.id} orc={orc} />)
        ) : (
          filtered.map(orc => <OrcamentoCardRep key={orc.id} orc={orc} />)
        )}
      </div>
    </div>
  );
}
