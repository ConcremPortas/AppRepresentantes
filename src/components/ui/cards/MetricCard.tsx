import { type ElementType } from 'react';
import { cn } from '@/utils/cn';

// KPI/Métrica padrão do sistema — extraído do topo da Central de Pedidos.
// ícone + label pequeno + valor grande + subtítulo opcional. Tom semântico no valor.
export default function MetricCard({
  icon: Icon, label, value, tone, sub, onClick, className,
}: {
  icon?: ElementType;
  label: string;
  value: string;
  tone?: string;       // classe de cor do valor (ex.: 'text-emerald-700')
  sub?: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl bg-white border border-gray-200/70 shadow-sm p-3.5 min-w-[140px] sm:min-w-0 flex-shrink-0 sm:flex-shrink transition-shadow hover:shadow-md',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-gray-400 min-w-0">
        {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
        <p className="text-[10px] font-semibold uppercase tracking-wider truncate">{label}</p>
      </div>
      <p className={cn('text-lg font-bold mt-1 tabular-nums leading-tight truncate', tone ?? 'text-gray-900')}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}
