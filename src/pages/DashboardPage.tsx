import { useAuth } from '@/hooks/useAuth';
import { useOrcamentos } from '@/hooks/useOrcamentos';
import { useCarteira } from '@/hooks/useCarteira';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import {
  formatCurrency,
  formatCurrencyK,
  formatDateLong,
} from '@/utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  Users, DollarSign, CreditCard, Award,
  FileText, Clock, CheckCircle, AlertTriangle,
  ShoppingCart, BarChart2, ArrowRight, TrendingUp, TrendingDown,
  Unlock, Map, Wrench, Handshake, Factory, FileCheck2, Truck, PackageCheck,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Link } from 'react-router-dom';
import type { PipelineCounts } from '@/services/dashboard';

// ─── KPI Card ─────────────────────────────────────────────────
function KPICard({
  title, value, subtitle, icon: Icon, iconBg, iconColor, trend,
}: {
  title: string; value: string; subtitle: string;
  icon: React.ElementType; iconBg: string; iconColor: string;
  trend?: { value: number; label: string };
}) {
  const up = (trend?.value ?? 0) >= 0;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
            <p className="text-xl font-bold text-gray-900 mt-1 tabular-nums">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
            {trend && (
              <div className={cn('flex items-center gap-1 mt-1.5', up ? 'text-emerald-600' : 'text-red-500')}>
                {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span className="text-xs font-medium">
                  {up ? '+' : ''}{trend.value.toFixed(1)}% {trend.label}
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

// ─── Status Mini Card ──────────────────────────────────────────
function StatusCard({ label, count, icon: Icon, bg, text, border }: {
  label: string; count: number;
  icon: React.ElementType; bg: string; text: string; border: string;
}) {
  return (
    <div className={cn('flex items-center gap-2.5 p-3 rounded-xl border', bg, border)}>
      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center bg-white/60 flex-shrink-0', text)}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0">
        <p className={cn('text-lg font-bold leading-tight', text)}>{count}</p>
        <p className={cn('text-[11px] font-medium truncate opacity-70', text)}>{label}</p>
      </div>
    </div>
  );
}

// ─── Pipeline Section ──────────────────────────────────────────
const PIPELINE_STAGES: {
  key: keyof PipelineCounts;
  label: string;
  icon: React.ElementType;
  bg: string; text: string; border: string;
}[] = [
  { key: 'aprovado',   label: 'Aprovado',   icon: CheckCircle,  bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'   },
  { key: 'liberado',   label: 'Liberado',   icon: Unlock,       bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  { key: 'mapeamento', label: 'Mapeamento', icon: Map,          bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  { key: 'ferragem',   label: 'Ferragem',   icon: Wrench,       bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  { key: 'comercial',  label: 'Comercial',  icon: Handshake,    bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  { key: 'producao',   label: 'Produção',   icon: Factory,      bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200'  },
  { key: 'faturado',   label: 'Faturado',   icon: FileCheck2,   bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-200'   },
  { key: 'entrega',    label: 'Entrega',    icon: Truck,        bg: 'bg-sky-50',    text: 'text-sky-700',    border: 'border-sky-200'    },
  { key: 'finalizado', label: 'Finalizado', icon: PackageCheck, bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200'  },
];

// ─── Funil Bar ─────────────────────────────────────────────────
function FunilBar({ label, value, max, color }: {
  label: string; value: number; max: number; color: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-600 font-medium">{label}</span>
        <span className="text-xs font-bold text-gray-900">{value}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

const BAR_COLORS = ['#014017', '#1a7a40', '#38b66b', '#6dcf99', '#a8e4c0', '#d1f5e0'];

// ─── Dashboard ─────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  const today    = new Date();
  const rep      = user?.representante;
  const isAdmin  = user?.usuario?.admin ?? false;

  const { data: stats, isLoading: loadingStats } = useDashboardStats();
  const { data: orcamentos = [] }                = useOrcamentos();
  const { data: clientes   = [] }                = useCarteira();

  // ── Orçamentos status (dados reais) ──
  const orcStatus = {
    rascunho:   orcamentos.filter(o => o.status === 'rascunho').length,
    em_analise: orcamentos.filter(o => o.status === 'enviado' || o.status === 'em_analise').length,
    aprovado:   orcamentos.filter(o => o.status === 'aprovado').length,
    rejeitado:  orcamentos.filter(o => o.status === 'rejeitado').length,
  };

  // ── Últimos 5 orçamentos (excluindo rascunhos) ──
  const ultimosOrc = [...orcamentos]
    .filter(o => o.status !== 'rascunho')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  // ── Tendência mês a mês ──
  const trendMes = stats && stats.totalVendidoMesAnt > 0
    ? ((stats.totalVendidoMes - stats.totalVendidoMesAnt) / stats.totalVendidoMesAnt) * 100
    : 0;

  // ── Comissão ──
  const comissao = (stats?.totalVendidoMes ?? 0) * ((rep?.comissao_percentual ?? 0) / 100);

  // ── Funil (dados reais) ──
  const totalOrcCriados  = orcamentos.length;
  const totalOrcEnviados = orcamentos.filter(o => o.status !== 'rascunho').length;
  const totalOrcAprov    = orcamentos.filter(o => o.status === 'aprovado').length;
  const totalClientes    = clientes.length;
  const totalPedidos     = stats?.totalPedidos ?? 0;

  const funilMax = Math.max(totalClientes, totalOrcCriados, totalPedidos, 1);

  const loading = loadingStats;

  return (
    <div className="p-4 space-y-4">

      {/* ── Header ── */}
      <div>
        <h1 className="text-lg font-bold text-gray-900">
          Olá, {user?.usuario?.nome?.split(' ')[0] ?? rep?.nome?.split(' ')[0] ?? 'Representante'} 👋
        </h1>
        <p className="text-xs text-gray-500 mt-0.5 capitalize">
          Portal do Representante · {formatDateLong(today)}
        </p>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KPICard
          title="Carteira Total"
          value={String(totalClientes)}
          subtitle={`${totalClientes} clientes`}
          icon={Users}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <KPICard
          title="Total Vendido Mês"
          value={loading ? '...' : formatCurrencyK(stats?.totalVendidoMes ?? 0)}
          subtitle={`${stats?.totalPedidos ?? 0} pedido(s)`}
          icon={DollarSign}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          trend={stats && stats.totalVendidoMesAnt > 0
            ? { value: trendMes, label: 'vs mês ant.' }
            : undefined}
        />
        <KPICard
          title="Total Faturado Mês"
          value={loading ? '...' : formatCurrencyK(stats?.totalFaturadoMes ?? 0)}
          subtitle={`${stats?.pipeline.faturado ?? 0} NFs`}
          icon={CreditCard}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
        <KPICard
          title="Comissão Prevista"
          value={loading ? '...' : formatCurrencyK(comissao)}
          subtitle={`${rep?.comissao_percentual ?? 0}% s/ vendas`}
          icon={Award}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
      </div>

      {/* ── Status de Orçamentos ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status de Orçamentos</p>
          <Link to="/orcamentos" className="text-xs text-[hsl(142,93%,8%)] hover:underline flex items-center gap-1 font-medium">
            Ver todos <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatusCard label="Rascunhos"  count={orcStatus.rascunho}   icon={FileText}      bg="bg-gray-50"    text="text-gray-600"   border="border-gray-200"   />
          <StatusCard label="Em Análise" count={orcStatus.em_analise} icon={Clock}         bg="bg-amber-50"   text="text-amber-700"  border="border-amber-200"  />
          <StatusCard label="Aprovados"  count={orcStatus.aprovado}   icon={CheckCircle}   bg="bg-emerald-50" text="text-emerald-700" border="border-emerald-200" />
          <StatusCard label="Rejeitados" count={orcStatus.rejeitado}  icon={AlertTriangle} bg="bg-red-50"     text="text-red-700"    border="border-red-200"    />
        </div>
      </div>

      {/* ── Pipeline de Pedidos ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pipeline de Pedidos</p>
          <Link to="/acompanhamento" className="text-xs text-[hsl(142,93%,8%)] hover:underline flex items-center gap-1 font-medium">
            Acompanhar <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-4 justify-center">
            <div className="w-5 h-5 border-2 border-[hsl(142,93%,8%)] border-t-transparent rounded-full animate-spin" />
            Carregando...
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 xl:grid-cols-9 gap-2">
            {PIPELINE_STAGES.map(s => (
              <StatusCard
                key={s.key}
                label={s.label}
                count={stats?.pipeline[s.key] ?? 0}
                icon={s.icon}
                bg={s.bg}
                text={s.text}
                border={s.border}
              />
            ))}
          </div>
        )}

        {/* Total */}
        {!loading && (
          <div className="mt-2 flex items-center justify-between px-1">
            <span className="text-xs text-gray-400">
              Total: <strong className="text-gray-700">{stats?.pipeline.total ?? 0}</strong> pedidos no pipeline
            </span>
            <span className="text-xs text-gray-400 tabular-nums">
              Tk. médio: <strong className="text-gray-700">{formatCurrencyK(stats?.ticketMedio ?? 0)}</strong>
            </span>
          </div>
        )}
      </div>

      {/* ── Curva de Vendas + Funil ── */}
      <div className="grid lg:grid-cols-2 gap-3">

        {/* Curva de Vendas (real) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Vendas por Mês</CardTitle>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">6 meses</span>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-6 h-6 border-2 border-[hsl(142,93%,8%)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats?.vendasMensais ?? []} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v) => [formatCurrency(Number(v)), 'Vendas']}
                    contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                  />
                  <Bar dataKey="valor" radius={[5, 5, 0, 0]}>
                    {(stats?.vendasMensais ?? []).map((_, i, arr) => (
                      <Cell
                        key={i}
                        fill={i === arr.length - 1 ? 'hsl(142,93%,8%)' : '#a8e4c0'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Funil Comercial (real) */}
        <Card>
          <CardHeader>
            <CardTitle>Funil Comercial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FunilBar label="Clientes na Carteira"  value={totalClientes}    max={funilMax} color="#3b82f6" />
            <FunilBar label="Orçamentos Criados"    value={totalOrcCriados}  max={funilMax} color="#22c55e" />
            <FunilBar label="Orçamentos Enviados"   value={totalOrcEnviados} max={funilMax} color="#f97316" />
            <FunilBar label="Orçamentos Aprovados"  value={totalOrcAprov}    max={funilMax} color="#10b981" />
            <FunilBar label="Pedidos no Pipeline"   value={totalPedidos}     max={funilMax} color="#8b5cf6" />
          </CardContent>
        </Card>
      </div>

      {/* ── Últimos Orçamentos ── */}
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
          {ultimosOrc.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">Nenhum orçamento enviado ainda</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {ultimosOrc.map(orc => {
                const nome = orc.cliente_fantasia?.trim() || orc.cliente_nome;
                const pillCfg: Record<string, string> = {
                  enviado:    'bg-blue-50 text-blue-700 border-blue-200',
                  em_analise: 'bg-amber-50 text-amber-700 border-amber-200',
                  aprovado:   'bg-green-50 text-green-700 border-green-200',
                  rejeitado:  'bg-red-50 text-red-700 border-red-200',
                };
                const pillLabel: Record<string, string> = {
                  enviado: 'Enviado', em_analise: 'Em Análise', aprovado: 'Aprovado', rejeitado: 'Rejeitado',
                };
                return (
                  <div key={orc.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono text-gray-400">#{orc.numero}</span>
                        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full border', pillCfg[orc.status] ?? 'bg-gray-50 text-gray-500 border-gray-200')}>
                          {pillLabel[orc.status] ?? orc.status}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 truncate mt-0.5">{nome}</p>
                    </div>
                    {orc.condicao_pagamento && (
                      <span className="text-xs text-gray-400 ml-3 flex-shrink-0">{orc.condicao_pagamento}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
