import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { DayPicker } from 'react-day-picker';
import { ptBR } from 'react-day-picker/locale';
import { Calendar, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatDate } from '@/utils/formatters';
import 'react-day-picker/style.css';

interface DatePickerProps {
  value: string | null;          // ISO date (yyyy-mm-dd) ou null
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// 'yyyy-mm-dd' → Date local (sem deslocamento de fuso)
function parseISO(v: string | null): Date | undefined {
  if (!v) return undefined;
  const [y, m, d] = v.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}
// Date → 'yyyy-mm-dd' local
function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * DatePicker customizado (popover + calendário react-day-picker) com a identidade
 * Concrem. Substitui os <input type="date"> nativos. Emite/recebe ISO (yyyy-mm-dd).
 */
export default function DatePicker({
  value,
  onChange,
  placeholder = 'dd/mm/aaaa',
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseISO(value);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            'inline-flex items-center justify-between gap-2 h-10 sm:h-9 w-full px-3 rounded-lg',
            'border border-gray-300 bg-white text-sm',
            'focus:outline-none focus:ring-2 focus:ring-[hsl(142,93%,8%)] focus:border-transparent',
            'data-[state=open]:ring-2 data-[state=open]:ring-[hsl(142,93%,8%)] data-[state=open]:border-transparent',
            'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
            selected ? 'text-gray-900' : 'text-gray-400',
            className,
          )}
        >
          <span className="truncate">{selected ? formatDate(value!) : placeholder}</span>
          <span className="flex items-center gap-1 flex-shrink-0">
            {selected && !disabled && (
              <X
                role="button"
                aria-label="Limpar data"
                className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
              />
            )}
            <Calendar className="w-4 h-4 text-gray-400" />
          </span>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          collisionPadding={8}
          className="radix-pop z-50 rounded-xl border border-gray-200 bg-white p-2 shadow-lg"
        >
          <DayPicker
            className="concrem-daypicker"
            mode="single"
            locale={ptBR}
            selected={selected}
            defaultMonth={selected}
            onSelect={(d) => {
              onChange(d ? toISO(d) : null);
              setOpen(false);
            }}
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="mt-1 w-full text-center text-xs text-gray-500 hover:text-gray-700 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Limpar data
            </button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
