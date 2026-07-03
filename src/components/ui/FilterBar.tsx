import { cn } from '@/utils/cn';
import { type ReactNode } from 'react';

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  count?: number; // opcional: mostra "(N)" ao lado
}

/** Chip de filtro arredondado (padrão usado em Orçamentos e Acompanhamento). */
export function FilterChip({ active, onClick, children, count }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
        active ? 'bg-[hsl(142,93%,8%)] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      )}
    >
      {children}
      {count !== undefined && (
        <span className={cn('ml-1.5 tabular-nums', active ? 'text-white/70' : 'text-gray-400')}>
          ({count})
        </span>
      )}
    </button>
  );
}

interface FilterBarProps {
  children: ReactNode;
  className?: string;
}

/** Container de filtros responsivo: linha no desktop, quebra natural no mobile. */
export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div className={cn('flex flex-wrap gap-2 items-center', className)}>
      {children}
    </div>
  );
}
