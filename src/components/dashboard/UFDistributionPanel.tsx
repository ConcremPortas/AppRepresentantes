import { useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useAcompanhamento } from '@/hooks/useAcompanhamento';
import { formatCurrencyK } from '@/utils/formatters';

interface UFAgg { uf: string; receita: number; pedidos: number; clientes: number; }

// Distribuição geográfica da receita por UF (Diretor Geral / escopo global).
export default function UFDistributionPanel() {
  const { data: pedidos = [], isLoading } = useAcompanhamento();

  const { linhas, total } = useMemo(() => {
    const map = new Map<string, UFAgg & { cnpjs: Set<string> }>();
    for (const p of pedidos) {
      const uf = (p.cliente_uf || 'N/D').toUpperCase().trim() || 'N/D';
      const e = map.get(uf) ?? { uf, receita: 0, pedidos: 0, clientes: 0, cnpjs: new Set<string>() };
      e.receita += p.total_pedido_venda || 0;
      e.pedidos += 1;
      if (p.cliente_cnpj) e.cnpjs.add(p.cliente_cnpj);
      map.set(uf, e);
    }
    const linhas: UFAgg[] = [...map.values()]
      .map(e => ({ uf: e.uf, receita: e.receita, pedidos: e.pedidos, clientes: e.cnpjs.size }))
      .sort((a, b) => b.receita - a.receita);
    const total = linhas.reduce((s, l) => s + l.receita, 0);
    return { linhas, total };
  }, [pedidos]);

  const max = Math.max(1, ...linhas.map(l => l.receita));

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-500" />
          <CardTitle>Distribuição por UF</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-gray-400 py-10 text-center">Carregando…</p>
        ) : linhas.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center">Sem pedidos no escopo.</p>
        ) : (
          <div className="space-y-2">
            {linhas.slice(0, 12).map(l => {
              const share = total > 0 ? (l.receita / total) * 100 : 0;
              return (
                <div key={l.uf} className="flex items-center gap-2.5">
                  <span className="w-8 flex-shrink-0 text-xs font-bold text-gray-700 text-center">{l.uf}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11px] text-gray-400 tabular-nums">{l.pedidos} ped · {l.clientes} cli</span>
                      <span className="text-xs font-semibold text-gray-800 tabular-nums">{formatCurrencyK(l.receita)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500/80 transition-all duration-700" style={{ width: `${(l.receita / max) * 100}%` }} />
                    </div>
                  </div>
                  <span className="w-9 flex-shrink-0 text-right text-[10px] font-bold text-gray-400 tabular-nums">{share.toFixed(0)}%</span>
                </div>
              );
            })}
            {linhas.length > 12 && <p className="text-[10px] text-gray-400 pt-1">+{linhas.length - 12} outras UFs</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
