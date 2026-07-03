import { type ReactNode, type CSSProperties } from 'react';
import { cn } from '@/utils/cn';

// Card base: cantos arredondados, borda e sombra suaves — com `min-w-0` e
// `overflow-hidden` embutidos para não estourar dentro de grids/flex.
const PAD = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-5' } as const;

export default function AppCard({
  children, pad = 'md', hover = false, onClick, className, style,
}: {
  children: ReactNode;
  pad?: keyof typeof PAD;
  hover?: boolean;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={cn(
        'rounded-2xl bg-white border border-gray-200/70 shadow-sm min-w-0 overflow-hidden',
        PAD[pad],
        hover && 'transition-all hover:shadow-md',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  );
}
