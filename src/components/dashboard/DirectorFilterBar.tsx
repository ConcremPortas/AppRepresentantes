import { useMemo } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import Select, { type SelectOption } from '@/components/ui/Select';
import { useAcompanhamento } from '@/hooks/useAcompanhamento';
import { normalizaGrupo } from '@/services/scope';
import { useDirectorFilters, PIPELINE_STAGES } from './DirectorFilters';

const withTodos = (label: string, opts: SelectOption[]): SelectOption[] => [
  { value: '', label: `Todos · ${label}` },
  ...opts,
];

// Barra de filtros da Central Executiva (escopo do diretor):
// grupo / representante / UF / etapa. Opções derivadas dos pedidos já escopados.
export default function DirectorFilterBar() {
  const { data: pedidos = [] } = useAcompanhamento();
  const { filters, set, clear, active } = useDirectorFilters();

  const { grupos, reps, ufs } = useMemo(() => {
    const g = new Set<string>(), r = new Set<string>(), u = new Set<string>();
    for (const p of pedidos) {
      g.add(normalizaGrupo(p.grupo_cliente));
      if (p.representante) r.add(p.representante);
      if (p.cliente_uf) u.add(p.cliente_uf);
    }
    const toOpt = (v: string): SelectOption => ({ value: v, label: v });
    return {
      grupos: [...g].sort().map(toOpt),
      reps:   [...r].sort().map(toOpt),
      ufs:    [...u].sort().map(toOpt),
    };
  }, [pedidos]);

  const etapas: SelectOption[] = PIPELINE_STAGES.map(s => ({ value: s.key, label: s.label }));

  return (
    <div className="rounded-2xl border border-gray-200/70 bg-white/70 backdrop-blur px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 mr-1">
          <SlidersHorizontal className="w-3.5 h-3.5" /> Filtros
        </span>
        <Select chip value={filters.grupo}  onChange={v => set({ grupo: v })}  options={withTodos('grupos', grupos)} placeholder="Grupo"        className="max-w-[44vw] sm:max-w-[200px]" />
        <Select chip value={filters.rep}    onChange={v => set({ rep: v })}    options={withTodos('reps', reps)}     placeholder="Representante" className="max-w-[44vw] sm:max-w-[220px]" />
        <Select chip value={filters.uf}     onChange={v => set({ uf: v })}     options={withTodos('UFs', ufs)}       placeholder="UF"           className="max-w-[30vw] sm:max-w-[120px]" />
        <Select chip value={filters.status} onChange={v => set({ status: v })} options={withTodos('etapas', etapas)} placeholder="Etapa"        className="max-w-[44vw] sm:max-w-[160px]" />
        {active > 0 && (
          <button
            onClick={clear}
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Limpar ({active})
          </button>
        )}
      </div>
    </div>
  );
}
