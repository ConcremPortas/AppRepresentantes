import { cn } from '@/utils/cn';

export interface ProgressStep {
  key: string;
  label: string;
  color: string;      // cor da etapa (concluída/atual)
}

// Linha de progresso compacta (versão para card). Etapas concluídas e a atual
// ficam coloridas; futuras em cinza. Use a versão completa na drawer/detalhe.
export default function ProgressSteps({
  steps, currentIndex, labels = true, className,
}: {
  steps: ProgressStep[];
  currentIndex: number;       // índice da etapa atual (0-based); -1 = nenhuma
  labels?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center', className)}>
      {steps.map((s, i) => {
        const done = i < currentIndex;
        const atual = i === currentIndex;
        const on = done || atual;
        return (
          <div key={s.key} className={cn('flex items-center min-w-0', i === 0 ? 'flex-shrink-0' : 'flex-1')}>
            {i > 0 && (
              <span className="h-0.5 flex-1 rounded-full" style={{ backgroundColor: i <= currentIndex ? steps[i - 1].color : '#e5e7eb' }} />
            )}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <span
                className={cn('w-3 h-3 rounded-full border-2 border-white', atual && 'ring-2 ring-offset-1')}
                style={{ backgroundColor: on ? s.color : '#e5e7eb', boxShadow: atual ? `0 0 0 2px ${s.color}33` : undefined }}
              />
              {labels && (
                <span className={cn('text-[9px] leading-none text-center', atual ? 'font-semibold text-gray-700' : on ? 'text-gray-500' : 'text-gray-300')}>
                  {s.label}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
