import { useState, type ElementType } from 'react';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/utils/cn';
import Button from './Button';

export interface ActionMenuItem {
  label: string;
  icon?: ElementType;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  align?: 'left' | 'right';
}

/** Menu de ações (⋮) — dropdown acionado por um botão de 3 pontos. */
export default function ActionMenu({ items, align = 'right' }: ActionMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex-shrink-0">
      <Button
        variant="icon"
        size="icon"
        aria-label="Ações"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
      >
        <MoreVertical className="w-4 h-4" />
      </Button>

      {open && (
        <>
          {/* Overlay para fechar ao clicar fora */}
          <div
            className="fixed inset-0 z-10"
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
          />
          <div
            className={cn(
              'absolute top-full mt-1 z-20 min-w-[160px] bg-white border border-gray-200 rounded-xl shadow-lg py-1',
              align === 'right' ? 'right-0' : 'left-0'
            )}
          >
            {items.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={item.disabled}
                  onClick={(e) => { e.stopPropagation(); setOpen(false); item.onClick(); }}
                  className={cn(
                    'w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition-colors',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                    item.variant === 'danger'
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                  {item.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
