import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useClientGroups } from '@/hooks/useClientGroups';
import { ClienteIntel } from '@/pages/ClientesPage';
import type { ClienteCarteira } from '@/services/carteira';
import GroupList from './GroupList';
import GroupDashboard from './GroupDashboard';
import GroupClientsList from './GroupClientsList';

// Visão gerencial por grupo_cliente. Escopo aplicado na origem (useCarteira já vem
// filtrada por perfil/grupo) — diretor só enxerga os grupos vinculados.
export default function ClientGroupsView() {
  const today = useMemo(() => new Date(), []);
  const { grupos, isLoading } = useClientGroups();
  const [params, setParams] = useSearchParams();
  const [cliente, setCliente] = useState<ClienteCarteira | null>(null);

  const grupoParam = params.get('grupo');
  const grupoAtivo = useMemo(() => grupos.find(g => g.grupo === grupoParam) ?? null, [grupos, grupoParam]);

  function selectGrupo(grupo: string | null) {
    const p = new URLSearchParams(params);
    if (grupo) p.set('grupo', grupo); else p.delete('grupo');
    setParams(p, { replace: true });
  }

  // Auto-seleciona o 1º grupo no desktop (espelha a visão de clientes)
  useEffect(() => {
    if (!grupoParam && grupos.length > 0 && window.innerWidth >= 1024) selectGrupo(grupos[0].grupo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupos, grupoParam]);

  // Detalhe individual do cliente (reaproveita o mini-dashboard existente)
  if (cliente) {
    return <ClienteIntel cliente={cliente} onBack={() => setCliente(null)} />;
  }

  return (
    <div className="flex gap-4 items-start">
      {/* Esquerda: lista de grupos */}
      <div className={cn('w-full lg:w-[320px] xl:w-[340px] lg:flex-shrink-0 lg:sticky lg:top-4', grupoAtivo && 'hidden lg:block')}>
        <GroupList grupos={grupos} selected={grupoParam} onSelect={selectGrupo} isLoading={isLoading} />
      </div>

      {/* Direita: dashboard do grupo */}
      <div className={cn('flex-1 min-w-0', !grupoAtivo && 'hidden lg:block')}>
        {grupoAtivo ? (
          <GroupDashboard g={grupoAtivo} today={today} onOpenCliente={setCliente} onBack={() => selectGrupo(null)}>
            <GroupClientsList clientes={grupoAtivo.clientes} today={today} onOpenCliente={setCliente} />
          </GroupDashboard>
        ) : (
          <div className="rounded-2xl bg-white border border-gray-200/70 shadow-sm py-24 text-center">
            <Layers className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">Selecione um grupo</p>
            <p className="text-xs text-gray-400 mt-1">Escolha um grupo na lista para ver o painel completo</p>
          </div>
        )}
      </div>
    </div>
  );
}
