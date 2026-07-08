import { useMemo } from 'react';
import { ClipboardList, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useExecutiveSummary, type ExecutivePeriod } from '@/hooks/useExecutiveSummary';
import { useRepPerformance, useGroupPerformance } from '@/hooks/useRepPerformance';
import { cn } from '@/utils/cn';

type Prioridade = 'alta' | 'media' | 'baixa';
const PRIO: Record<Prioridade, string> = {
  alta:  'bg-red-50 text-red-600',
  media: 'bg-amber-50 text-amber-600',
  baixa: 'bg-blue-50 text-blue-600',
};

// "Plano de Ação Sugerido": ações objetivas geradas dos indicadores reais.
export default function StrategicActionsPanel({ period, limit = 5, title = 'Plano de Ação Sugerido' }: { period: ExecutivePeriod; limit?: number; title?: string }) {
  const d = useExecutiveSummary(period);
  const { data: reps = [] } = useRepPerformance();
  const { data: grupos = [] } = useGroupPerformance();

  const acoes = useMemo(() => {
    const out: { prioridade: Prioridade; texto: string }[] = [];

    if (d.docs > 0)
      out.push({ prioridade: 'alta', texto: `Anexar documentos de ${d.docs} pedido(s) faturado(s) sem nota fiscal ou boleto — destrava o faturamento.` });
    if (d.clientesRisco > 0)
      out.push({ prioridade: d.clientesRisco > d.ativos ? 'alta' : 'media', texto: `Cobrar contato com ${d.clientesRisco} cliente(s) sem comprar há +30 dias${d.dormentes > 0 ? ` (${d.dormentes} há +60 dias)` : ''}.` });
    if (d.orcParados > 0)
      out.push({ prioridade: 'media', texto: `Dar retorno em ${d.orcParados} orçamento(s) enviado(s)/em análise parado(s) há +30 dias sem resposta.` });

    const grpRisco = [...grupos].sort((a, b) => (b.clientesAtrasados + b.clientesDormentes) - (a.clientesAtrasados + a.clientesDormentes))[0];
    if (grpRisco && (grpRisco.clientesAtrasados + grpRisco.clientesDormentes) > 0) {
      const totGrp = grpRisco.clientesAtrasados + grpRisco.clientesDormentes;
      out.push({ prioridade: 'media', texto: `Reativar ${totGrp} cliente(s) do grupo ${grpRisco.grupo} sem comprar há +30 dias${grpRisco.clientesDormentes > 0 ? ` (${grpRisco.clientesDormentes} dormente[s])` : ''}.` });
    }

    const criticos = reps.filter(r => r.badge === 'critico' || r.badge === 'atencao');
    if (criticos.length > 0) {
      const nomes = criticos.slice(0, 2).map(r => r.representante.split(' - ').pop()?.split(' ')[0] ?? r.representante).join(', ');
      out.push({ prioridade: 'baixa', texto: `Acompanhar ${criticos.length} representante(s) com score baixo e carteira em atraso (${nomes}${criticos.length > 2 ? '…' : ''}).` });
    }
    if (d.pendencias > 0)
      out.push({ prioridade: 'baixa', texto: `Destravar ${d.pendencias} pedido(s) parado(s) +7 dias na etapa ou com embarque vencido.` });

    if (out.length === 0)
      out.push({ prioridade: 'baixa', texto: 'Indicadores saudáveis — manter cadência comercial e de contato.' });

    return out.slice(0, limit);
  }, [d, reps, grupos, limit]);

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-emerald-500" />
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {acoes.map((a, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5 min-w-0">
              <span className={cn('text-[9px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 flex-shrink-0', PRIO[a.prioridade])}>{a.prioridade}</span>
              <p className="text-[13px] text-gray-700 leading-snug flex-1 min-w-0">{a.texto}</p>
              <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
