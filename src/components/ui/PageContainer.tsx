import { type ReactNode } from 'react';
import { cn } from '@/utils/cn';

// Container padrão de página: largura/gutter/ritmo vertical consistentes e
// proteção contra overflow horizontal (overflow-x-clip NÃO quebra position:sticky,
// ao contrário de overflow-hidden). O espaço para a MobileNav vem do <main>.
const MAX = {
  full: 'max-w-none',
  xl: 'max-w-7xl',
  lg: 'max-w-5xl',
  md: 'max-w-3xl',
} as const;

const SPACE = {
  none: '',
  sm: 'space-y-3',
  md: 'space-y-4',
  lg: 'space-y-5',
} as const;

export interface PageContainerProps {
  children: ReactNode;
  /** Largura máxima do conteúdo. `full` = ocupa toda a largura. */
  size?: keyof typeof MAX;
  /** Espaçamento vertical entre os blocos filhos. */
  space?: keyof typeof SPACE;
  /** Reserva espaço no rodapé para uma StickyActionBar. */
  bottomBar?: boolean;
  className?: string;
}

export default function PageContainer({
  children, size = 'full', space = 'md', bottomBar = false, className,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        'w-full min-w-0 mx-auto overflow-x-clip',
        'px-4 sm:px-6 lg:px-8 py-4 sm:py-5',
        MAX[size],
        SPACE[space],
        // espaço para a barra de ações fixa (mobile inclui MobileNav + safe area)
        bottomBar && 'pb-[calc(var(--nav-h)+var(--safe-bottom)+4.5rem)] lg:pb-24',
        className,
      )}
    >
      {children}
    </div>
  );
}
