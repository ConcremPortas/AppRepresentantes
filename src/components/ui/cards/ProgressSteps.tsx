import { type ElementType } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface ProgressStep {
  key: string;
  label: string;
  color: string;      // cor da etapa (concluída/atual)
  icon?: ElementType; // ícone no marcador (opcional)
}

// Linha de progresso da jornada — mesmo visual do card aprovado da Central de
// Pedidos: marcador com ícone (Check quando concluído), rótulo abaixo e conector
// entre etapas. `compact` esconde rótulos (use dentro de espaços apertados).
export default function ProgressSteps({
  steps, currentIndex, compact = false, className,
}: {
  steps: ProgressStep[];
  currentIndex: number;       // índice da etapa atual (0-based)
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {steps.map((e, i) => {
        const done = i < currentIndex;
        const atual = i === currentIndex;
        const Icon = e.icon;
        return (
          <div key={e.key} className="flex items-center gap-1 flex-1 min-w-0">
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div
                className={cn(
                  'rounded-full flex items-center justify-center transition-colors',
                  compact ? 'w-4 h-4' : 'w-5 h-5',
                  (atual || done) ? 'text-white' : 'bg-gray-100 text-gray-300',
                )}
                style={atual || done ? { backgroundColor: e.color } : undefined}
                title={e.label}
              >
                {done ? <Check className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
                  : Icon ? <Icon className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
                  : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
              </div>
              {!compact && (
                <span className={cn('text-[8px] mt-0.5 truncate max-w-full', atual ? 'font-semibold text-gray-700' : 'text-gray-400')}>
                  {e.label}
                </span>
              )}
            </div>
            {i < steps.length - 1 && (
              <div className={cn('h-0.5 flex-1 rounded-full -mt-3', compact && 'mt-0')} style={{ backgroundColor: i < currentIndex ? e.color : '#e5e7eb' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
