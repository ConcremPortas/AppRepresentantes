import { cn } from '@/utils/cn';
import { STATUS_LABELS } from '@/utils/formatters';

const STATUS_STYLES: Record<string, string> = {
  rascunho: 'bg-gray-100 text-gray-600 border-gray-200',
  enviado: 'bg-blue-50 text-blue-700 border-blue-200',
  em_analise: 'bg-amber-50 text-amber-700 border-amber-200',
  aprovado: 'bg-green-50 text-green-700 border-green-200',
  devolvido: 'bg-red-50 text-red-600 border-red-200',
  perdido: 'bg-gray-100 text-gray-500 border-gray-200',
  integrado: 'bg-teal-50 text-teal-700 border-teal-200',
  mapeamento: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  ferragem: 'bg-orange-50 text-orange-700 border-orange-200',
  producao: 'bg-purple-50 text-purple-700 border-purple-200',
  faturado: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  entrega: 'bg-sky-50 text-sky-700 border-sky-200',
  finalizado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, className, size = 'sm' }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600 border-gray-200';
  const label = STATUS_LABELS[status] ?? status;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        style,
        className
      )}
    >
      {label}
    </span>
  );
}
