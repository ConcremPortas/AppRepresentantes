import { type ReactNode, type ElementType } from 'react';
import { cn } from '@/utils/cn';
import { CARD_BASE } from './tokens';

// Skeleton de card (loading) — pulso suave, mesma silhueta do card real.
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(CARD_BASE, 'p-4 animate-pulse', className)}>
      <div className="flex items-center gap-2">
        <div className="h-3 w-16 bg-gray-100 rounded" />
        <div className="h-4 w-14 bg-gray-100 rounded-full" />
        <div className="h-3 w-12 bg-gray-100 rounded ml-auto" />
      </div>
      <div className="h-4 w-3/4 bg-gray-100 rounded mt-3" />
      <div className="h-3 w-1/2 bg-gray-100 rounded mt-2" />
      <div className="flex gap-2 mt-4">
        <div className="h-3 w-16 bg-gray-100 rounded" />
        <div className="h-3 w-16 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

// Estado vazio elegante: ícone + mensagem + ação opcional.
export function EmptyCard({
  icon: Icon, title, description, action, className,
}: {
  icon?: ElementType;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(CARD_BASE, 'py-14 px-6 text-center', className)}>
      {Icon && <Icon className="w-10 h-10 text-gray-200 mx-auto mb-3" />}
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

// Estado de erro amigável com opção de tentar novamente.
export function ErrorCard({
  title = 'Não foi possível carregar', description, onRetry, className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn(CARD_BASE, 'py-12 px-6 text-center border-red-200/70', className)}>
      <p className="text-sm font-semibold text-red-600">{title}</p>
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry}
          className="mt-4 inline-flex items-center rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
          Tentar novamente
        </button>
      )}
    </div>
  );
}
