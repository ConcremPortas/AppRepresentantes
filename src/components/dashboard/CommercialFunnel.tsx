import { useMemo } from 'react';
import { Filter } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useCarteira } from '@/hooks/useCarteira';
import { useOrcamentos } from '@/hooks/useOrcamentos';
import { useAcompanhamento } from '@/hooks/useAcompanhamento';

const FATURADO_ALEM = new Set(['faturado', 'entrega', 'finalizado']);

// Funil comercial (escopo do usuário): carteira → orçamentos → aprovados →
// pedidos → faturados → entregues. Cada etapa mostra volume e conversão vs a anterior.
export default function CommercialFunnel() {
  const { data: clientes = [] } = useCarteira();
  const { data: orcamentos = [] } = useOrcamentos();
  const { data: pedidos = [], isLoading } = useAcompanhamento();

  const etapas = useMemo(() => {
    const orcCriados = orcamentos.length;
    const orcAprovados = orcamentos.filter(o => o.status === 'aprovado').length;
    const pedTotal = pedidos.length;
    const faturados = pedidos.filter(p => FATURADO_ALEM.has(p.status)).length;
    const entregues = pedidos.filter(p => p.status === 'finalizado').length;
    return [
      { key: 'clientes',  label: 'Clientes na carteira', value: clientes.length, color: '#64748b' },
      { key: 'orc',       label: 'Orçamentos criados',    value: orcCriados,      color: '#6366f1' },
      { key: 'aprov',     label: 'Orçamentos aprovados',  value: orcAprovados,    color: '#0ea5e9' },
      { key: 'pedidos',   label: 'Pedidos',               value: pedTotal,        color: '#f59e0b' },
      { key: 'faturados', label: 'Faturados',             value: faturados,       color: '#14b8a6' },
      { key: 'entregues', label: 'Entregues',             value: entregues,       color: '#22c55e' },
    ];
  }, [clientes, orcamentos, pedidos]);

  const max = Math.max(1, ...etapas.map(e => e.value));

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-indigo-500" />
          <CardTitle>Funil Comercial</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-gray-400 py-10 text-center">Carregando…</p>
        ) : (
          <div className="space-y-2.5">
            {etapas.map((e, i) => {
              const prev = i > 0 ? etapas[i - 1].value : null;
              const conv = prev && prev > 0 ? (e.value / prev) * 100 : null;
              return (
                <div key={e.key}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-600 min-w-0 truncate">{e.label}</span>
                    <span className="flex items-center gap-2 flex-shrink-0">
                      {conv !== null && (
                        <span className={cnv(conv)}>{conv.toFixed(0)}%</span>
                      )}
                      <span className="text-sm font-bold text-gray-900 tabular-nums">{e.value.toLocaleString('pt-BR')}</span>
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max((e.value / max) * 100, e.value > 0 ? 4 : 0)}%`, backgroundColor: e.color }} />
                  </div>
                </div>
              );
            })}
            <p className="text-[10px] text-gray-400 pt-1">A % indica a conversão em relação à etapa anterior.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function cnv(pct: number): string {
  const base = 'text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums ';
  if (pct >= 60) return base + 'bg-emerald-50 text-emerald-600';
  if (pct >= 30) return base + 'bg-amber-50 text-amber-600';
  return base + 'bg-red-50 text-red-500';
}
