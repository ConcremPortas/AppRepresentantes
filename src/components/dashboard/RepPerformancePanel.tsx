import { UsersRound } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useRepPerformance } from '@/hooks/useRepPerformance';
import { formatCurrencyK } from '@/utils/formatters';

// Painel de performance dos representantes DENTRO do escopo (grupos do diretor
// ou tudo, p/ diretor geral). Total vendido, pedidos, clientes e ticket médio.
export default function RepPerformancePanel() {
  const { data: reps = [], isLoading } = useRepPerformance();

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-2">
          <UsersRound className="w-4 h-4 text-indigo-500" />
          <CardTitle>Performance dos Representantes</CardTitle>
          <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">seus grupos</span>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-gray-400 py-8 text-center">Carregando…</p>
        ) : reps.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">Nenhum representante com pedidos no seu escopo.</p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="px-3 py-2">Representante</th>
                  <th className="px-3 py-2 text-right">Vendido</th>
                  <th className="px-3 py-2 text-center">Pedidos</th>
                  <th className="px-3 py-2 text-center">Clientes</th>
                  <th className="px-3 py-2 text-right">Ticket médio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reps.slice(0, 25).map(r => (
                  <tr key={r.representante} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-3 py-2 font-medium text-gray-800 truncate max-w-[240px]">{r.representante}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-emerald-700">{formatCurrencyK(r.totalVendido)}</td>
                    <td className="px-3 py-2 text-center tabular-nums text-gray-600">{r.pedidos}</td>
                    <td className="px-3 py-2 text-center tabular-nums text-gray-600">{r.clientes}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-700">{formatCurrencyK(r.ticketMedio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
