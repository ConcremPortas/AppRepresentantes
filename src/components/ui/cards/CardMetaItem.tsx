import { type ReactNode, type ElementType } from 'react';
import { cn } from '@/utils/cn';

// Linha de métrica/atributo do card: ícone discreto + texto compacto.
// Ex.: <CardMetaItem icon={Package}>3 item(s)</CardMetaItem>
export default function CardMetaItem({
  icon: Icon, children, tone = 'muted', className,
}: {
  icon?: ElementType;
  children: ReactNode;
  tone?: 'muted' | 'faint';
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px] min-w-0', tone === 'faint' ? 'text-gray-400' : 'text-gray-500', className)}>
      {Icon && <Icon className="w-3 h-3 text-gray-400 flex-shrink-0" />}
      <span className="truncate">{children}</span>
    </span>
  );
}
