import { useAuth } from '@/hooks/useAuth';
import {
  mockKPIs,
  mockChartData,
  mockOrcamentos,
  mockPedidos,
  mockClientes,
} from '@/data/mockData';
import {
  formatCurrency,
  formatCurrencyK,
  formatPercent,
  formatDateLong,
  STATUS_LABELS,
  PEDIDO_STATUS_STEPS,
} from '@/utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  Users, DollarSign, CreditCard, Award, FileText, Clock,
  CheckCircle, AlertTriangle, XCircle, ShoppingCart, BarChart2,
  ArrowRight, Plus, TrendingUp, TrendingDown,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Link } from 'react-router-dom';

// ─── KPI Card ────────────────────────────────────────────────────────────────
interface KPICardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  trend?: { value: number; label: string };
}

function KPICard({ title, value, subtitle, icon: Icon, iconBg, iconColor, trend }: KPICardProps) {
  const up = (trend?.value ?? 0) >= 0;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
            {trend && (
              <div className={cn('flex items-center gap-1 mt-1.5', up ? 'text-emerald-600' : 'text-red-500')}>
                {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span className="text-xs font-medium">
                  {up ? '+' : ''}{formatPercent(trend.value, 1)} {trend.label}
                </span>
              </div>
            )}
          </div>
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', iconBg)}>
            <Icon className={cn('w-4 h-4', iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Status Mini Card ─────────────────────────────────────────────────────────
interface StatusCardProps {
  label: string;
  count: number;
  icon: React.ElementType;
  bg: string;
  text: string;
  border: string;
}

function StatusCard({ label, count, icon: Icon, bg, text, border }: StatusCardProps) {
  return (
    <div className={cn('flex items-center gap-2.5 p-3 rounded-xl border', bg, border)}>
      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center bg-white/60 flex-shrink-0', text)}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0">
        <p className={cn('text-lg font-bold leading-tight', text)}>{count}</p>
        <p className={cn('text-[11px] font-medium truncate', text, 'opacity-70')}>{label}</p>
      </div>
    </div>
  );
}

// ─── Funil Bar ───────────────────────────────────────────────────────────────
interface FunilBarProps {
  label: string;
  value: number;
  max: number;
  color: string;
}

function FunilBar({ label, value, max, color }: FunilBarProps) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-600 font-medium">{label}</span>
        <span className="text-xs font-bold text-gray-900">{value}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── Pie Chart colors ─────────────────────────────────────────────────────────
const PIE_COLORS = ['#014017', '#1a7a40', '#38b66b', '#6dcf99', '#a8e4c0'];

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  const today = new Date();
  const rep = user?.representante;

  const myOrcamentos = mockOrcamentos.filter(o => o.representante_id === user?.id);
  const myPedidos = mockPedidos.filter(p => p.representante_id === user?.id);
  const myClientes = mockClientes.filter(c => c.representante_id === user?.id);

  // KPIs
  const totalVendidoMes = myPedidos
    .filter(p => {
      const d = new Date(p.updated_at);
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    })
    .reduce((s, p) => s + p.valor_total, 0);

  const totalFaturadoMes = myPedidos
    .filter(p => p.status === 'faturado' || p.status === 'finalizado')
    .reduce((s, p) => s + p.valor_total, 0);

  const comissaoPrevista = totalVendidoMes * ((rep?.comissao_percentual ?? 3.5) / 100);

  const clientesAtivos = myClientes.filter(c => c.ativo).length;
  const novosMes = myClientes.filter(c => {
    const d = new Date(c.created_at);
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  }).length;

  // Status orçamentos
  const orcStatus = {
    rascunho: myOrcamentos.filter(o => o.status === 'rascunho').length,
    em_analise: myOrcamentos.filter(o => o.status === 'em_analise' || o.status === 'enviado').length,
    aprovado: myOrcamentos.filter(o => o.status === 'aprovado').length,
    devolvido: myOrcamentos.filter(o => o.status === 'devolvido').length,
    perdido: myOrcamentos.filter(o => o.status === 'perdido').length,
  };

  // Status pedidos
  const pedStatus = {
    producao: myPedidos.filter(p => ['aprovado', 'integrado', 'mapeamento', 'ferragem', 'producao'].includes(p.status)).length,
    entrega: myPedidos.filter(p => p.status === 'entrega').length,
    finalizado: myPedidos.filter(p => p.status === 'finalizado').length,
    ticketMedio: myPedidos.length > 0
      ? myPedidos.reduce((s, p) => s + p.valor_total, 0) / myPedidos.length
      : 0,
  };

  // Meta progress
  const metaProgress = rep ? Math.min((mockKPIs.realizado_mes / rep.meta_mensal) * 100, 100) : 0;
  const fatProgress = rep ? Math.min((totalFaturadoMes / (rep.meta_mensal * 0.6)) * 100, 100) : 0;

  // Últimos orçamentos
  const ultimosOrc = myOrcamentos
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  // Funil
  const funil = {
    contatos: myClientes.length,
    criados: myOrcamentos.length,
    enviados: myOrcamentos.filter(o => ['enviado', 'em_analise', 'aprovado', 'devolvido'].includes(o.status)).length,
    aprovados: myOrcamentos.filter(o => o.status === 'aprovado').length,
    pedidos: myPedidos.length,
  };

  // Mix de produto (mock simulado)
  const mixProduto = [
    { name: 'Portas Internas', value: 42 },
    { name: 'Portas Externas', value: 28 },
    { name: 'Batentes', value: 18 },
    { name: 'Alizares', value: 8 },
    { name: 'Outros', value: 4 },
  ];

  const trendOrc = mockKPIs.orcamentos_mes_anterior
    ? ((mockKPIs.orcamentos_mes - mockKPIs.orcamentos_mes_anterior) / mockKPIs.orcamentos_mes_anterior) * 100
    : 0;

  return (
    <div className="p-4 space-y-4">

      {/* ── Row 1: Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">
            Olá, {rep?.nome?.split(' ')[0] ?? 'Representante'} 👋
          </h1>
          <p className="text-xs text-gray-500 mt-0.5 capitalize">
            Portal do Representante · {formatDateLong(today)}
          </p>
        </div>
      </div>

      {/* ── Row 2: KPI Cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KPICard
          title="Carteira Total"
          value={String(myClientes.length)}
          subtitle={`${clientesAtivos} ativos`}
          icon={Users}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <KPICard
          title="Total Vendido Mês"
          value={formatCurrencyK(totalVendidoMes || mockKPIs.realizado_mes)}
          subtitle={`${myPedidos.length} pedido(s)`}
          icon={DollarSign}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          trend={{ value: trendOrc, label: 'vs mês ant.' }}
        />
        <KPICard
          title="Total Faturado Mês"
          value={formatCurrencyK(totalFaturadoMes || mockKPIs.valor_orcamentos_mes * 0.6)}
          subtitle={`${pedStatus.finalizado} NFs`}
          icon={CreditCard}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
        <KPICard
          title="Comissão Prevista"
          value={formatCurrencyK(comissaoPrevista || mockKPIs.comissoes_pendentes)}
          subtitle={`${rep?.comissao_percentual ?? 3.5}% s/ vendas`}
          icon={Award}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
      </div>

      {/* ── Row 3: Status Orçamentos ── */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Status de Orçamentos
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
          <StatusCard
            label="Rascunhos"
            count={orcStatus.rascunho}
            icon={FileText}
            bg="bg-gray-50"
            text="text-gray-600"
            border="border-gray-200"
          />
          <StatusCard
            label="Em Análise"
            count={orcStatus.em_analise}
            icon={Clock}
            bg="bg-amber-50"
            text="text-amber-700"
            border="border-amber-200"
          />
          <StatusCard
            label="Aprovados"
            count={orcStatus.aprovado}
            icon={CheckCircle}
            bg="bg-emerald-50"
            text="text-emerald-700"
            border="border-emerald-200"
          />
          <StatusCard
            label="Devolvidos"
            count={orcStatus.devolvido}
            icon={AlertTriangle}
            bg="bg-red-50"
            text="text-red-700"
            border="border-red-200"
          />
          <StatusCard
            label="Perdidos"
            count={orcStatus.perdido}
            icon={XCircle}
            bg="bg-gray-50"
            text="text-gray-500"
            border="border-gray-200"
          />
        </div>
      </div>

      {/* ── Row 4: Status Pedidos ── */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Status de Pedidos
        </p>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
          <StatusCard
            label="Em Produção"
            count={pedStatus.producao}
            icon={ShoppingCart}
            bg="bg-blue-50"
            text="text-blue-700"
            border="border-blue-200"
          />
          <StatusCard
            label="Em Entrega"
            count={pedStatus.entrega}
            icon={TrendingUp}
            bg="bg-orange-50"
            text="text-orange-700"
            border="border-orange-200"
          />
          <StatusCard
            label="Finalizados"
            count={pedStatus.finalizado}
            icon={CheckCircle}
            bg="bg-emerald-50"
            text="text-emerald-700"
            border="border-emerald-200"
          />
          {/* Ticket Médio — card especial */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl border bg-indigo-50 border-indigo-200">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/60 flex-shrink-0 text-indigo-700">
              <BarChart2 className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-tight text-indigo-700">
                {pedStatus.ticketMedio > 0 ? formatCurrencyK(pedStatus.ticketMedio) : '—'}
              </p>
              <p className="text-[11px] font-medium truncate text-indigo-700 opacity-70">Ticket Médio</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 5: Meta x Realizado + Curva de Vendas ── */}
      <div className="grid lg:grid-cols-2 gap-3">
        {/* Meta x Realizado */}
        <Card>
          <CardHeader>
            <CardTitle>Meta x Realizado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Vendas do Mês */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-gray-700 font-medium">Vendas do Mês</span>
                <span className={cn(
                  'text-xs font-bold px-2 py-0.5 rounded-full',
                  metaProgress >= 80 ? 'bg-emerald-100 text-emerald-700'
                    : metaProgress >= 50 ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-600'
                )}>
                  {formatPercent(metaProgress, 1)}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="h-2.5 rounded-full bg-blue-500 transition-all duration-700"
                  style={{ width: `${metaProgress}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-xs text-gray-500">
                <span>{formatCurrencyK(mockKPIs.realizado_mes)}</span>
                <span>Meta: {formatCurrencyK(rep?.meta_mensal ?? mockKPIs.meta_mensal)}</span>
              </div>
            </div>

            {/* Faturamento do Mês */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-gray-700 font-medium">Faturamento do Mês</span>
                <span className={cn(
                  'text-xs font-bold px-2 py-0.5 rounded-full',
                  fatProgress >= 80 ? 'bg-emerald-100 text-emerald-700'
                    : fatProgress >= 50 ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-600'
                )}>
                  {formatPercent(fatProgress, 1)}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="h-2.5 rounded-full bg-blue-500 transition-all duration-700"
                  style={{ width: `${fatProgress}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-xs text-gray-500">
                <span>{formatCurrencyK(totalFaturadoMes || mockKPIs.valor_orcamentos_mes * 0.4)}</span>
                <span>Meta: {formatCurrencyK((rep?.meta_mensal ?? mockKPIs.meta_mensal) * 0.6)}</span>
              </div>
            </div>

            {/* Rodapé */}
            <div className="flex gap-4 pt-2 border-t border-gray-100">
              <div className="flex-1 text-center">
                <p className="text-xs text-gray-500">Comissão Prevista</p>
                <p className="text-sm font-bold text-emerald-700 mt-0.5">
                  {formatCurrencyK(mockKPIs.comissoes_pendentes)}
                </p>
              </div>
              <div className="w-px bg-gray-100" />
              <div className="flex-1 text-center">
                <p className="text-xs text-gray-500">Inadimplência</p>
                <p className="text-sm font-bold text-red-600 mt-0.5">
                  {formatPercent(4.2, 1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Curva de Vendas */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Curva de Vendas</CardTitle>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">2026</span>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={mockChartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => [formatCurrency(Number(v)), 'Valor']}
                  contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                />
                <Bar dataKey="valor" name="Valor" fill="hsl(142,93%,8%)" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 6: Funil + Carteira ── */}
      <div className="grid lg:grid-cols-2 gap-3">
        {/* Funil Comercial */}
        <Card>
          <CardHeader>
            <CardTitle>Funil Comercial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FunilBar label="Contatos / Clientes" value={funil.contatos} max={funil.contatos} color="#3b82f6" />
            <FunilBar label="Orçamentos Criados" value={funil.criados} max={funil.contatos} color="#22c55e" />
            <FunilBar label="Orçamentos Enviados" value={funil.enviados} max={funil.contatos} color="#f97316" />
            <FunilBar label="Aprovados" value={funil.aprovados} max={funil.contatos} color="#ef4444" />
            <FunilBar label="Pedidos Gerados" value={funil.pedidos} max={funil.contatos} color="#8b5cf6" />
          </CardContent>
        </Card>

        {/* Carteira de Clientes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Carteira de Clientes</CardTitle>
              <Link to="/clientes" className="text-xs text-[hsl(142,93%,8%)] hover:underline flex items-center gap-1 font-medium">
                Ver carteira <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mini KPIs */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Ativos', value: clientesAtivos, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                { label: 'Inativos', value: myClientes.filter(c => !c.ativo).length, color: 'text-gray-500', bg: 'bg-gray-50' },
                { label: 'Novos Mês', value: novosMes, color: 'text-blue-700', bg: 'bg-blue-50' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={cn('text-center p-3 rounded-xl', bg)}>
                  <p className={cn('text-xl font-bold', color)}>{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Top clientes por orçamentos */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Top Clientes</p>
              {myClientes.slice(0, 4).map(c => {
                const orcCount = myOrcamentos.filter(o => o.cliente_id === c.id).length;
                return (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[hsl(142,93%,8%)]/10 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-[hsl(142,93%,8%)]">
                          {(c.nome_fantasia ?? c.razao_social)[0]}
                        </span>
                      </div>
                      <span className="text-sm text-gray-800 font-medium truncate max-w-[130px]">
                        {c.nome_fantasia ?? c.razao_social}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{orcCount} orç.</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 7: Mix de Produto + Últimos Orçamentos ── */}
      <div className="grid lg:grid-cols-2 gap-3">
        {/* Mix por Linha de Produto */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Mix por Linha de Produto</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 pb-4 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mixProduto} margin={{ top: 4, right: 4, left: -24, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={v => `${v}%`}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 50]}
                />
                <Tooltip
                  formatter={(v) => [`${v}%`, 'Participação']}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  cursor={{ fill: '#f9fafb' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={56}>
                  {mixProduto.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Últimos Orçamentos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Últimos Orçamentos</CardTitle>
              <Link to="/orcamentos" className="text-xs text-[hsl(142,93%,8%)] hover:underline flex items-center gap-1 font-medium">
                Ver todos <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-50">
              {ultimosOrc.map(orc => (
                <div key={orc.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-gray-400">{orc.numero}</span>
                      <StatusBadge status={orc.status} />
                    </div>
                    <p className="text-sm font-semibold text-gray-900 truncate mt-0.5">
                      {orc.cliente?.nome_fantasia ?? orc.cliente?.razao_social}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-gray-900 ml-3 flex-shrink-0">
                    {formatCurrencyK(orc.valor_final)}
                  </p>
                </div>
              ))}
              {ultimosOrc.length === 0 && (
                <p className="px-5 py-8 text-sm text-gray-400 text-center">
                  Nenhum orçamento ainda
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
