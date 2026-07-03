import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** 'md' (padrão, h-10 sm:h-9, largura total) ou 'sm' (compacto h-8, largura automática). */
  size?: 'md' | 'sm';
  /** Estilo de "chip": compacto e preenchido em verde quando há valor selecionado. */
  chip?: boolean;
}

/**
 * Select customizado com a identidade Concrem, baseado em @radix-ui/react-select.
 * Substitui os <select> nativos (inconsistentes entre navegadores).
 *
 * Radix não aceita itens com value === '' — internamente mapeamos '' para um
 * sentinel nos ITENS, de modo que uma opção "limpar" (value: '') continue
 * selecionável e o estado externo permaneça string vazia.
 *
 * Já o VALOR do Root usa `undefined` quando o estado externo é '', garantindo
 * que o placeholder apareça mesmo quando exista uma opção de "limpar" na lista.
 */
const EMPTY_SENTINEL = '__empty__';
const toRadix = (v: string) => (v === '' ? EMPTY_SENTINEL : v);
const fromRadix = (v: string) => (v === EMPTY_SENTINEL ? '' : v);

export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Selecionar...',
  disabled,
  className,
  size = 'md',
  chip = false,
}: SelectProps) {
  const compact = chip || size === 'sm';
  const isActive = value !== '';

  return (
    <RadixSelect.Root
      value={value === '' ? undefined : value}
      onValueChange={(v) => onChange(fromRadix(v))}
      disabled={disabled}
    >
      <RadixSelect.Trigger
        className={cn(
          'inline-flex items-center justify-between rounded-lg border outline-none overflow-hidden transition-colors',
          'focus:ring-2 focus:ring-[hsl(142,93%,8%)] focus:border-transparent',
          'data-[state=open]:ring-2 data-[state=open]:ring-[hsl(142,93%,8%)] data-[state=open]:border-transparent',
          'disabled:cursor-not-allowed',
          compact ? 'h-8 pl-2.5 pr-2 text-xs gap-1' : 'h-10 sm:h-9 w-full px-3 text-sm gap-2',
          chip && isActive
            ? 'border-[hsl(142,93%,8%)] bg-[hsl(142,93%,8%)] text-white font-medium disabled:opacity-40'
            : chip
              ? 'border-gray-300 bg-white text-gray-600 data-[placeholder]:text-gray-600 disabled:opacity-40'
              : 'border-gray-300 bg-white text-gray-900 data-[placeholder]:text-gray-400 disabled:bg-gray-50 disabled:text-gray-400',
          className,
        )}
      >
        <span className={cn('min-w-0 truncate text-left', !chip && 'flex-1')}>
          <RadixSelect.Value placeholder={placeholder} />
        </span>
        <RadixSelect.Icon>
          <ChevronDown
            className={cn(
              'flex-shrink-0',
              compact ? 'w-3 h-3' : 'w-4 h-4',
              chip && isActive ? 'text-white' : 'text-gray-400',
            )}
          />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className={cn(
            'radix-pop z-50 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg',
            'min-w-[var(--radix-select-trigger-width)] max-w-[min(20rem,var(--radix-popper-available-width))]',
          )}
        >
          <RadixSelect.ScrollUpButton className="flex items-center justify-center h-6 text-gray-400 bg-white">
            <ChevronDown className="w-4 h-4 rotate-180" />
          </RadixSelect.ScrollUpButton>

          <RadixSelect.Viewport className="p-1 scrollbar-thin max-h-[min(16rem,var(--radix-select-content-available-height))]">
            {options.map((o) => (
              <RadixSelect.Item
                key={o.value || EMPTY_SENTINEL}
                value={toRadix(o.value)}
                className={cn(
                  'relative flex items-center pl-3 pr-8 py-2 text-sm rounded-lg cursor-pointer select-none outline-none',
                  'text-gray-700 data-[highlighted]:bg-gray-50 data-[highlighted]:text-gray-900',
                  'data-[state=checked]:text-[hsl(142,93%,8%)] data-[state=checked]:font-medium',
                )}
              >
                <RadixSelect.ItemText>{o.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="absolute right-2 inline-flex items-center">
                  <Check className="w-4 h-4" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>

          <RadixSelect.ScrollDownButton className="flex items-center justify-center h-6 text-gray-400 bg-white">
            <ChevronDown className="w-4 h-4" />
          </RadixSelect.ScrollDownButton>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
