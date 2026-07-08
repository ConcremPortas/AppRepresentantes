import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/utils/cn';

// Tokens de status executivo (verde=bom, âmbar=atenção, vermelho=crítico, azul=info)
export type ExecStatus = 'bom' | 'atencao' | 'critico' | 'info' | 'neutro';

export const STATUS_STYLE: Record<ExecStatus, { text: string; bg: string; dot: string; label: string }> = {
  bom:     { text: 'text-emerald-700', bg: 'bg-emerald-50',  dot: 'bg-emerald-500', label: 'Saudável' },
  atencao: { text: 'text-amber-700',   bg: 'bg-amber-50',    dot: 'bg-amber-500',   label: 'Atenção' },
  critico: { text: 'text-red-700',     bg: 'bg-red-50',      dot: 'bg-red-500',     label: 'Crítico' },
  info:    { text: 'text-blue-700',    bg: 'bg-blue-50',     dot: 'bg-blue-500',    label: 'Informação' },
  neutro:  { text: 'text-gray-600',    bg: 'bg-gray-100',    dot: 'bg-gray-400',    label: '—' },
};

export function StatusPill({ status, children }: { status: ExecStatus; children?: React.ReactNode }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full', s.bg, s.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
      {children ?? s.label}
    </span>
  );
}

// Variação percentual com seta. positivoBom=false inverte a cor (ex.: risco em alta é ruim).
export function Delta({ value, positivoBom = true }: { value: number | null; positivoBom?: boolean }) {
  if (value === null || !isFinite(value)) {
    return <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-gray-400"><Minus className="w-3 h-3" />—</span>;
  }
  const up = value >= 0;
  const bom = positivoBom ? up : !up;
  const Icon = value === 0 ? Minus : up ? TrendingUp : TrendingDown;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums', bom ? 'text-emerald-600' : 'text-red-500')}>
      <Icon className="w-3 h-3" />{up ? '+' : ''}{value.toFixed(1)}%
    </span>
  );
}
