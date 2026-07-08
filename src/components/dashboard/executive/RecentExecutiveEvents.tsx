import { useMemo } from 'react';
import { History, CheckCircle2, XCircle, Receipt, Truck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useOrcamentos } from '@/hooks/useOrcamentos';
import { useAcompanhamento } from '@/hooks/useAcompanhamento';
import { formatDate } from '@/utils/formatters';

interface Evento { data: string; icon: React.ElementType; tone: string; titulo: string; ref: string; }

// Timeline compacta dos eventos executivos mais recentes (aprovações, faturamento, entrega).
export default function RecentExecutiveEvents() {
  const { data: orcs = [] } = useOrcamentos();
  const { data: pedidos = [] } = useAcompanhamento();

  const eventos = useMemo<Evento[]>(() => {
    const ev: Evento[] = [];

    for (const o of orcs) {
      if (o.status === 'aprovado') ev.push({ data: o.updated_at, icon: CheckCircle2, tone: 'text-emerald-500', titulo: 'Orçamento aprovado', ref: `${o.numero} · ${o.cliente_nome}` });
      else if (o.status === 'rejeitado') ev.push({ data: o.updated_at, icon: XCircle, tone: 'text-red-500', titulo: 'Orçamento recusado', ref: `${o.numero} · ${o.cliente_nome}` });
    }

    for (const p of pedidos) {
      const log = (p.logs ?? [])[0];   // transição mais recente
      if (!log) continue;
      if (log.status === 'faturado') ev.push({ data: log.created_at, icon: Receipt, tone: 'text-teal-500', titulo: 'Pedido faturado', ref: `${p.numero_pedido} · ${p.cliente_nome}` });
      else if (log.status === 'finalizado') ev.push({ data: log.created_at, icon: Truck, tone: 'text-green-500', titulo: 'Pedido entregue', ref: `${p.numero_pedido} · ${p.cliente_nome}` });
    }

    return ev
      .filter(e => e.data)
      .sort((a, b) => (a.data < b.data ? 1 : -1))
      .slice(0, 8);
  }, [orcs, pedidos]);

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-emerald-500" />
          <CardTitle>Eventos Recentes</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {eventos.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">Sem eventos recentes no seu escopo.</p>
        ) : (
          <div className="space-y-0.5">
            {eventos.map((e, i) => {
              const Icon = e.icon;
              return (
                <div key={i} className="flex items-center gap-3 py-1.5">
                  <span className="flex-shrink-0"><Icon className={`w-4 h-4 ${e.tone}`} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-gray-800 leading-tight">{e.titulo}</p>
                    <p className="text-[11px] text-gray-400 truncate">{e.ref}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 tabular-nums flex-shrink-0">{formatDate(e.data)}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
