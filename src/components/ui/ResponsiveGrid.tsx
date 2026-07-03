import { type ReactNode } from 'react';
import { cn } from '@/utils/cn';

// Grade responsiva padrão: 1 coluna no mobile → 2 no tablet → N no desktop.
// `items-start` evita que cards de alturas diferentes se estiquem.
const COLS = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
} as const;

const GAP = {
  sm: 'gap-2',
  md: 'gap-3',
  lg: 'gap-3 sm:gap-4',
} as const;

export default function ResponsiveGrid({
  children, cols = 3, gap = 'lg', className,
}: {
  children: ReactNode;
  cols?: keyof typeof COLS;
  gap?: keyof typeof GAP;
  className?: string;
}) {
  return (
    <div className={cn('grid items-start', COLS[cols], GAP[gap], className)}>
      {children}
    </div>
  );
}
