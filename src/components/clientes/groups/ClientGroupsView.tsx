import { useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useClientGroups } from '@/hooks/useClientGroups';
import { ClienteIntel } from '@/pages/ClientesPage';
import type { ClienteCarteira } from '@/services/carteira';
import GroupList from './GroupList';
import GroupDashboard from './GroupDashboard';
import GroupClientsList from './GroupClientsList';

// Visão gerencial por grupo_cliente. Escopo aplicado na origem (useCarteira já vem
// filtrada por perfil/grupo). Estado (grupo/cliente) vive na URL — assim o voltar
// do navegador/mouse fecha o cliente → volta ao grupo → volta à lista.
export default function ClientGroupsView() {
  const today = useMemo(() => new Date(), []);
  const { grupos, isLoading } = useClientGroups();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const grupoParam = params.get('grupo');
  const cnpjParam = params.get('cnpj');
  const grupoAtivo = useMemo(() => grupos.find(g => g.grupo === grupoParam) ?? null, [grupos, grupoParam]);

  const clienteAtivo = useMemo(() => {
    if (!cnpjParam) return null;
    const alvo = cnpjParam.replace(/\D/g, '');
    for (const g of grupos) {
      const c = g.clientes.find(x => (x.cliente_cnpj ?? '').replace(/\D/g, '') === alvo);
      if (c) return c;
    }
    return null;
  }, [cnpjParam, grupos]);

  // Seleção de grupo (push = ação do usuário; replace = auto-seleção inicial)
  function goGrupo(grupo: string | null, replace = false) {
    const p = new URLSearchParams(params);
    if (grupo) p.set('grupo', grupo); else p.delete('grupo');
    p.delete('cnpj');
    setParams(p, { replace });
  }
  // Abrir cliente = PUSH (cria entrada no histórico → voltar retorna ao grupo)
  function openCliente(c: ClienteCarteira) {
    const p = new URLSearchParams(params);
    p.set('cnpj', (c.cliente_cnpj ?? '').replace(/\D/g, ''));
    setParams(p);
  }

  // Auto-seleciona o 1º grupo no desktop (replace — não polui o histórico)
  useEffect(() => {
    if (!grupoParam && grupos.length > 0 && window.innerWidth >= 1024) goGrupo(grupos[0].grupo, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupos, grupoParam]);

  // Detalhe individual do cliente (mini-dashboard reaproveitado). Voltar = histórico.
  if (clienteAtivo) {
    return <ClienteIntel cliente={clienteAtivo} onBack={() => navigate(-1)} />;
  }

  return (
    <div className="flex gap-4 items-start">
      {/* Esquerda: lista de grupos */}
      <div className={cn('w-full lg:w-[320px] xl:w-[340px] lg:flex-shrink-0 lg:sticky lg:top-4', grupoAtivo && 'hidden lg:block')}>
        <GroupList grupos={grupos} selected={grupoParam} onSelect={g => goGrupo(g)} isLoading={isLoading} />
      </div>

      {/* Direita: dashboard do grupo */}
      <div className={cn('flex-1 min-w-0', !grupoAtivo && 'hidden lg:block')}>
        {grupoAtivo ? (
          <GroupDashboard g={grupoAtivo} today={today} onOpenCliente={openCliente} onBack={() => goGrupo(null)}>
            <GroupClientsList clientes={grupoAtivo.clientes} today={today} onOpenCliente={openCliente} />
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
