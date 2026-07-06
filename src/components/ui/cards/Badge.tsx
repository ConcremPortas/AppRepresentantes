import { type ReactNode, type ElementType } from 'react';
import { cn } from '@/utils/cn';
import { TONE_CHIP, type Tone } from './tokens';

// Badge semântico padrão do sistema. Use `tone` para comunicar status:
// positive (Aprovado/OK) · warning (Aguardando/Análise) · danger (Atraso/Rejeitado)
// · info (Em rota/Produção/Faturado) · neutral (Rascunho).
export default function Badge({
  tone = 'neutral', icon: Icon, children, size = 'sm', className,
}: {
  tone?: Tone;
  icon?: ElementType;
  children: ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-semibold whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        TONE_CHIP[tone],
        className,
      )}
    >
      {Icon && <Icon className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />}
      {children}
    </span>
  );
}
