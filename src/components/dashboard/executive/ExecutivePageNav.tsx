import { cn } from '@/utils/cn';

export type CountTone = 'risco' | 'atencao' | 'neutro';

export interface NavItem {
  key: string;
  label: string;
  icon: React.ElementType;
  count?: number;
  countTone?: CountTone;
}

const COUNT_CLS: Record<CountTone, string> = {
  risco:   'bg-red-100 text-red-600',
  atencao: 'bg-amber-100 text-amber-600',
  neutro:  'bg-gray-100 text-gray-500',
};

// Navegação executiva premium (segmentada; rola na horizontal no mobile).
export default function ExecutivePageNav({ items, active, onChange }: {
  items: NavItem[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-thin -mx-1 px-1 py-0.5">
      {items.map(it => {
        const on = it.key === active;
        const Icon = it.icon;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            aria-current={on ? 'page' : undefined}
            className={cn(
              'group inline-flex items-center gap-2 rounded-xl px-3.5 py-2 flex-shrink-0 border transition-all duration-200',
              on
                ? 'bg-[#0D2012] text-white border-[#0D2012] shadow-sm'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-800',
            )}
          >
            <Icon className={cn('w-4 h-4 flex-shrink-0', on ? 'text-emerald-300' : 'text-gray-400 group-hover:text-gray-600')} />
            <span className="text-[13px] font-semibold whitespace-nowrap">{it.label}</span>
            {it.count != null && it.count > 0 && (
              <span className={cn('text-[10px] font-bold rounded-full px-1.5 py-0.5 tabular-nums leading-none',
                on ? 'bg-white/20 text-white' : COUNT_CLS[it.countTone ?? 'neutro'])}>
                {it.count > 999 ? '999+' : it.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
