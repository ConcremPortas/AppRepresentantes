import { useMemo } from 'react';
import { GitBranch, Clock, AlertTriangle, FileWarning } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useAcompanhamento } from '@/hooks/useAcompanhamento';
import { useDirectorFilters, applyPedidoFilters, PIPELINE_STAGES as STAGES } from './DirectorFilters';
import { computeGargalos } from '@/utils/pipeline';
import { cn } from '@/utils/cn';

function Gargalo({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-2.5 py-2 flex items-center gap-2 min-w-0">
      <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', tone)}><Icon className="w-4 h-4" /></span>
      <div className="min-w-0">
        <p className="text-lg font-bold text-gray-900 tabular-nums leading-none">{value}</p>
        <p className="text-[10px] text-gray-400 leading-tight">{label}</p>
      </div>
    </div>
  );
}

// Pipeline operacional (escopo do usuário): contagem por etapa + gargalos
// (parados > 7 dias na etapa, atrasados vs embarque, docs pendentes em faturados+).
export default function PipelineGargalos() {
  const { data: all = [], isLoading } = useAcompanhamento();
  const { filters } = useDirectorFilters();

  // grupo/rep/UF filtram a esteira; a etapa apenas DESTACA (a esteira mostra a distribuição completa)
  const pedidos = useMemo(() => applyPedidoFilters(all, filters, { ignoreStatus: true }), [all, filters]);

  const { counts, parados, atrasados, docs, max } = useMemo(() => {
    const g = computeGargalos(pedidos);
    return { ...g, max: Math.max(1, ...STAGES.map(s => g.counts[s.key] ?? 0)) };
  }, [pedidos]);

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-emerald-500" />
          <CardTitle>Pipeline Operacional</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-gray-400 py-10 text-center">Carregando…</p>
        ) : pedidos.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center">Nenhum pedido para os filtros atuais.</p>
        ) : (
          <>
            {/* Gargalos */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <Gargalo icon={Clock} label="Parados >7 dias" value={parados} tone="bg-orange-50 text-orange-500" />
              <Gargalo icon={AlertTriangle} label="Atrasados (embarque)" value={atrasados} tone="bg-red-50 text-red-500" />
              <Gargalo icon={FileWarning} label="Docs pendentes" value={docs} tone="bg-amber-50 text-amber-500" />
            </div>
            {/* Etapas */}
            <div className="space-y-1.5">
              {STAGES.map(s => {
                const n = counts[s.key] ?? 0;
                const dimmed = filters.status !== '' && filters.status !== s.key;
                return (
                  <div key={s.key} className={cn('flex items-center gap-2 transition-opacity', dimmed && 'opacity-35')}>
                    <span className={cn('text-[11px] w-20 flex-shrink-0 truncate', filters.status === s.key ? 'text-gray-900 font-semibold' : 'text-gray-500')}>{s.label}</span>
                    <div className="h-2 flex-1 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(n / max) * 100}%`, backgroundColor: s.color }} />
                    </div>
                    <span className="text-[11px] font-bold text-gray-700 tabular-nums w-8 text-right flex-shrink-0">{n}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
