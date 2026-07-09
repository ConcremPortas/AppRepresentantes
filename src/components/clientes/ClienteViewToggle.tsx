import { Users, Layers } from 'lucide-react';
import { cn } from '@/utils/cn';

export type ClienteView = 'clientes' | 'grupos';

const ITENS: { key: ClienteView; label: string; icon: React.ElementType }[] = [
  { key: 'clientes', label: 'Clientes', icon: Users },
  { key: 'grupos', label: 'Grupos', icon: Layers },
];

// Alterna entre a visão individual de clientes e a visão gerencial por grupo.
export default function ClienteViewToggle({ view, onChange }: { view: ClienteView; onChange: (v: ClienteView) => void }) {
  return (
    <div className="inline-flex rounded-xl bg-gray-100 p-0.5">
      {ITENS.map(it => {
        const on = it.key === view;
        const Icon = it.icon;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            className={cn(
              'inline-flex items-center gap-1.5 text-[13px] font-semibold px-3.5 py-1.5 rounded-lg transition-colors',
              on ? 'bg-white text-[hsl(142,93%,8%)] shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <Icon className="w-4 h-4" />{it.label}
          </button>
        );
      })}
    </div>
  );
}
