import { useState, useMemo } from 'react';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { Card, CardContent } from '@/components/ui/Card';
import { FileText, Clock, AlertCircle, CheckCircle, Download, Filter } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useTitulos } from '@/hooks/useTitulos';

const STATUS_STYLES: Record<string, string> = {
  a_vencer: 'bg-amber-50 text-amber-700 border border-amber-200',
  vencido: 'bg-red-50 text-red-600 border border-red-200',
  pago: 'bg-green-50 text-green-700 border border-green-200',
  cancelado: 'bg-gray-100 text-gray-500 border border-gray-200',
};

const STATUS_LABELS: Record<string, string> = {
  a_vencer: 'A Vencer',
  vencido: 'Vencido',
  pago: 'Pago',
  cancelado: 'Cancelado',
};

export default function FinanceiroPage() {
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [clienteFilter, setClienteFilter] = useState<string>('todos');

  const { data: allTitulos = [], isLoading } = useTitulos();

  const clientes = useMemo(() => {
    const map = new Map<string, string>();
    allTitulos.forEach(t => {
      if (t.cliente) {
        map.set(t.cliente_id, t.cliente.nome_fantasia ?? t.cliente.razao_social);
      }
    });
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
  }, [allTitulos]);

  const titulos = useMemo(() => {
    let list = [...allTitulos];
    if (statusFilter !== 'todos') list = list.filter(t => t.status === statusFilter);
    if (clienteFilter !== 'todos') list = list.filter(t => t.cliente_id === clienteFilter);
    return list.sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime());
  }, [allTitulos, statusFilter, clienteFilter]);

  const summary = useMemo(() => {
    const aVencer = allTitulos.filter(t => t.status === 'a_vencer');
    const vencidos = allTitulos.filter(t => t.status === 'vencido');
    const pagos = allTitulos.filter(t => t.status === 'pago');
    return {
      totalEmAberto: [...aVencer, ...vencidos].reduce((s, t) => s + t.valor, 0),
      qtdAVencer: aVencer.length,
      valorAVencer: aVencer.reduce((s, t) => s + t.valor, 0),
      qtdVencidos: vencidos.length,
      valorVencidos: vencidos.reduce((s, t) => s + t.valor, 0),
      qtdPagos: pagos.length,
    };
  }, [allTitulos]);

  function handleDownload(tipo: 'boleto' | 'nf', numero: string) {
    alert(`Download de ${tipo === 'boleto' ? 'Boleto' : 'Nota Fiscal'} do título ${numero}`);
  }

  if (isLoading) {
    return (
      <div className="p-5 flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[hsl(142,93%,8%)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-400">Carregando títulos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Financeiro</h1>
        <p className="text-sm text-gray-500 mt-0.5">Títulos dos seus clientes</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-3 px-4">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Total em Aberto</p>
              <p className="text-sm font-bold text-gray-900 tabular-nums">{formatCurrency(summary.totalEmAberto)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3 px-4">
            <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">A Vencer</p>
              <p className="text-sm font-bold text-amber-700 tabular-nums">{formatCurrency(summary.valorAVencer)}</p>
              <p className="text-xs text-gray-400">{summary.qtdAVencer} título{summary.qtdAVencer !== 1 ? 's' : ''}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3 px-4">
            <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Vencidos</p>
              <p className="text-sm font-bold text-red-600 tabular-nums">{formatCurrency(summary.valorVencidos)}</p>
              <p className="text-xs text-gray-400">{summary.qtdVencidos} título{summary.qtdVencidos !== 1 ? 's' : ''}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3 px-4">
            <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Pagos</p>
              <p className="text-sm font-bold text-gray-900">{summary.qtdPagos} título{summary.qtdPagos !== 1 ? 's' : ''}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Filter className="w-3.5 h-3.5" />
          Filtrar:
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-8 px-2 text-xs border border-gray-300 rounded-lg focus:outline-none bg-white text-gray-700"
        >
          <option value="todos">Todos status</option>
          <option value="a_vencer">A Vencer</option>
          <option value="vencido">Vencido</option>
          <option value="pago">Pago</option>
        </select>
        <select
          value={clienteFilter}
          onChange={e => setClienteFilter(e.target.value)}
          className="h-8 px-2 text-xs border border-gray-300 rounded-lg focus:outline-none bg-white text-gray-700"
        >
          <option value="todos">Todos os clientes</option>
          {clientes.map(c => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>

      {/* Tabela */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Título</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Cliente</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Valor</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Emissão</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vencimento</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Downloads</th>
              </tr>
            </thead>
            <tbody>
              {titulos.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">
                    Nenhum título encontrado
                  </td>
                </tr>
              )}
              {titulos.map(titulo => (
                <tr key={titulo.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-gray-900">{titulo.numero}</p>
                    <p className="md:hidden text-xs text-gray-400 mt-0.5">
                      {titulo.cliente?.nome_fantasia ?? titulo.cliente?.razao_social}
                    </p>
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell">
                    <span className="text-sm text-gray-700">
                      {titulo.cliente?.nome_fantasia ?? titulo.cliente?.razao_social ?? '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="font-semibold text-gray-900">{formatCurrency(titulo.valor)}</span>
                  </td>
                  <td className="px-5 py-3 hidden lg:table-cell text-xs text-gray-500">
                    {formatDate(titulo.data_emissao)}
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn(
                      'text-xs',
                      titulo.status === 'vencido' ? 'text-red-600 font-semibold' : 'text-gray-500'
                    )}>
                      {formatDate(titulo.data_vencimento)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full', STATUS_STYLES[titulo.status])}>
                      {STATUS_LABELS[titulo.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {titulo.has_boleto && (
                        <button
                          onClick={() => handleDownload('boleto', titulo.numero)}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                          title="Baixar boleto"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Boleto</span>
                        </button>
                      )}
                      {titulo.has_nota_fiscal && (
                        <button
                          onClick={() => handleDownload('nf', titulo.numero)}
                          className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 hover:underline"
                          title={`Baixar NF ${titulo.nota_fiscal_numero ?? ''}`}
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">NF</span>
                        </button>
                      )}
                      {!titulo.has_boleto && !titulo.has_nota_fiscal && (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
