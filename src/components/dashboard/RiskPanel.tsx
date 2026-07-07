import { useMemo } from 'react';
import { ShieldAlert, Clock, AlertTriangle, FileWarning, UserX, Moon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useAcompanhamento } from '@/hooks/useAcompanhamento';
import { useRepPerformance, useGroupPerformance } from '@/hooks/useRepPerformance';
import { computeGargalos } from '@/utils/pipeline';
import { cn } from '@/utils/cn';

function RiskKpi({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2.5 flex items-center gap-2.5 min-w-0">
      <span className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', tone)}><Icon className="w-4 h-4" /></span>
      <div className="min-w-0">
        <p className="text-xl font-bold text-gray-900 tabular-nums leading-none">{value}</p>
        <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// Painel de risco consolidado (Diretor Geral): gargalos operacionais +
// carteira dormente + focos de atenção (reps e grupos com maior atraso).
export default function RiskPanel() {
  const { data: pedidos = [], isLoading } = useAcompanhamento();
  const { data: reps = [] } = useRepPerformance();
  const { data: grupos = [] } = useGroupPerformance();

  const { parados, atrasados, docs } = useMemo(() => computeGargalos(pedidos), [pedidos]);

  const dormentes = useMemo(() => reps.reduce((s, r) => s + r.clientesDormentes, 0), [reps]);
  const repsCriticos = useMemo(() => reps.filter(r => r.badge === 'critico').length, [reps]);

  const focos = useMemo(() => {
    const repFocos = [...reps]
      .map(r => ({ nome: r.representante, atraso: r.clientesAtrasados + r.clientesDormentes, tipo: 'Representante' as const }))
      .filter(f => f.atraso > 0)
      .sort((a, b) => b.atraso - a.atraso)
      .slice(0, 3);
    const grpFocos = [...grupos]
      .map(g => ({ nome: g.grupo, atraso: g.clientesAtrasados + g.clientesDormentes, tipo: 'Grupo' as const }))
      .filter(f => f.atraso > 0)
      .sort((a, b) => b.atraso - a.atraso)
      .slice(0, 3);
    return [...repFocos, ...grpFocos].sort((a, b) => b.atraso - a.atraso).slice(0, 5);
  }, [reps, grupos]);

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-500" />
          <CardTitle>Painel de Risco</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-gray-400 py-10 text-center">Carregando…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              <RiskKpi icon={Clock}         label="Pedidos parados >7d" value={parados}      tone="bg-orange-50 text-orange-500" />
              <RiskKpi icon={AlertTriangle} label="Embarque atrasado"    value={atrasados}    tone="bg-red-50 text-red-500" />
              <RiskKpi icon={FileWarning}   label="Docs pendentes"       value={docs}         tone="bg-amber-50 text-amber-500" />
              <RiskKpi icon={Moon}          label="Clientes dormentes"   value={dormentes}    tone="bg-slate-100 text-slate-500" />
              <RiskKpi icon={UserX}         label="Reps críticos"        value={repsCriticos} tone="bg-rose-50 text-rose-500" />
            </div>

            {focos.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] font-semibold text-gray-500 mb-2">Focos de atenção</p>
                <div className="space-y-1.5">
                  {focos.map((f, i) => (
                    <div key={`${f.tipo}-${f.nome}-${i}`} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-1.5">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="text-[9px] font-bold uppercase tracking-wide text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 flex-shrink-0">{f.tipo}</span>
                        <span className="text-[13px] text-gray-700 truncate">{f.nome}</span>
                      </span>
                      <span className="text-xs font-bold text-red-500 tabular-nums flex-shrink-0">{f.atraso} em atraso</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
