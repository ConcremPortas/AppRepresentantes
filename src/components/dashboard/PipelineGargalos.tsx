import { useMemo } from 'react';
import { GitBranch, Clock, AlertTriangle, FileWarning } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useAcompanhamento } from '@/hooks/useAcompanhamento';
import { cn } from '@/utils/cn';

const DAY = 86_400_000;
const STAGES: { key: string; label: string; color: string }[] = [
  { key: 'aprovado',   label: 'Aprovado',   color: '#3b82f6' },
  { key: 'liberado',   label: 'Liberado',   color: '#8b5cf6' },
  { key: 'mapeamento', label: 'Mapeamento', color: '#a855f7' },
  { key: 'ferragem',   label: 'Ferragem',   color: '#f97316' },
  { key: 'comercial',  label: 'Comercial',  color: '#6366f1' },
  { key: 'producao',   label: 'Produção',   color: '#f59e0b' },
  { key: 'faturado',   label: 'Faturado',   color: '#14b8a6' },
  { key: 'entrega',    label: 'Entrega',    color: '#0ea5e9' },
  { key: 'finalizado', label: 'Finalizado', color: '#22c55e' },
];
const FATURADO_ALEM = new Set(['faturado', 'entrega', 'finalizado']);

function parseD(d?: string | null): Date | null {
  if (!d) return null;
  const s = d.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T12:00:00`) : null;
}
function classifyAnexo(t: string): 'nf' | 'boleto' | 'outro' {
  const s = (t ?? '').toLowerCase();
  if (s.includes('boleto')) return 'boleto';
  if (s.includes('nota') || s.includes('nf') || s.includes('fiscal')) return 'nf';
  return 'outro';
}

function Gargalo({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 flex items-center gap-2.5 min-w-0">
      <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', tone)}><Icon className="w-4 h-4" /></span>
      <div className="min-w-0">
        <p className="text-lg font-bold text-gray-900 tabular-nums leading-none">{value}</p>
        <p className="text-[10px] text-gray-400 truncate">{label}</p>
      </div>
    </div>
  );
}

// Pipeline operacional (escopo do usuário): contagem por etapa + gargalos
// (parados > 7 dias na etapa, atrasados vs embarque, docs pendentes em faturados+).
export default function PipelineGargalos() {
  const { data: pedidos = [], isLoading } = useAcompanhamento();

  const { counts, parados, atrasados, docs, max } = useMemo(() => {
    const c: Record<string, number> = {};
    let par = 0, atr = 0, dp = 0;
    const hoje = new Date();
    for (const p of pedidos) {
      c[p.status] = (c[p.status] ?? 0) + 1;
      if (p.status !== 'finalizado') {
        const base = parseD(p.status_updated_at ?? p.data_emissao);
        if (base && (hoje.getTime() - base.getTime()) / DAY > 7) par++;
        const emb = parseD(p.previsao_embarque);
        if (emb && emb < hoje) atr++;
      }
      if (FATURADO_ALEM.has(p.status)) {
        const anexos = p.anexos ?? [];
        const nf = anexos.some(a => classifyAnexo(a.tipo) === 'nf');
        const bol = anexos.some(a => classifyAnexo(a.tipo) === 'boleto');
        if (!nf || !bol) dp++;
      }
    }
    return { counts: c, parados: par, atrasados: atr, docs: dp, max: Math.max(1, ...STAGES.map(s => c[s.key] ?? 0)) };
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
          <p className="text-sm text-gray-400 py-10 text-center">Sem pedidos no seu escopo.</p>
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
                return (
                  <div key={s.key} className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500 w-20 flex-shrink-0 truncate">{s.label}</span>
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
