import { useEffect, useMemo, useSyncExternalStore, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrcamentos } from '@/hooks/useOrcamentos';
import { useCarteira } from '@/hooks/useCarteira';
import { useDataScope } from '@/hooks/useDataScope';
import { fetchPedidosComAnexos } from '@/services/financeiro';
import { fetchNotificacoes, marcarNotificacaoLida } from '@/services/notificacoes';
import { gerarAlertas } from '@/alerts/engine';
import { alertStore } from '@/alerts/prefs';
import { notificarNovos, atualizarBadgeApp, haptic } from '@/alerts/notify';
import type { Alerta } from '@/alerts/registry';

export interface SecoesAlertas {
  urgentes: Alerta[];      // prioridade crítica
  hoje: Alerta[];          // aconteceu hoje (não crítico)
  semana: Alerta[];        // últimos 7 dias
  informativos: Alerta[];  // o resto (baixa prioridade / mais antigos)
}

// Evita som/banner duplicado quando o hook está montado em vários componentes
let notificandoLote = false;

export function useAlertas(opts: { notificar?: boolean } = {}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.usuario?.admin ?? false;
  const uid = user?.usuario?.id ?? '';
  const { grupos, scopeKey } = useDataScope(); // escopo do diretor (grupos)

  // Estado persistente (prefs/lidas/excluídas) — sincronizado entre componentes
  useEffect(() => { if (uid) alertStore.setUser(uid); }, [uid]);
  const state = useSyncExternalStore(alertStore.subscribe, alertStore.getSnapshot);

  // ── Fontes de dados (cacheadas pelo React Query) ──
  const { data: orcamentos = [], isLoading: l1 } = useOrcamentos();
  const { data: clientes = [], isLoading: l2 } = useCarteira(isAdmin ? 'todos' : undefined);
  const { data: pedidosAnexos = [], isLoading: l3 } = useQuery({
    queryKey: ['pedidos-anexos', scopeKey],
    queryFn: () => fetchPedidosComAnexos(grupos),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
  const { data: notificacoesDB = [] } = useQuery({
    queryKey: ['notificacoes-db', uid],
    queryFn: () => fetchNotificacoes(uid),
    enabled: !!uid,
    staleTime: 1000 * 60 * 2,
  });

  const isLoading = l1 || l2 || l3;
  const hoje = useMemo(() => new Date(), []);

  // ── Motor de regras + filtros do usuário ──
  const todos = useMemo(
    () => gerarAlertas({ orcamentos, clientes, pedidosAnexos, notificacoesDB, hoje }),
    [orcamentos, clientes, pedidosAnexos, notificacoesDB, hoje],
  );

  const alertas = useMemo(
    () => todos.filter(a => state.prefs[a.tipo] !== false && !state.excluidas[a.id]),
    [todos, state.prefs, state.excluidas],
  );

  const naoLidos = useMemo(
    () => alertas.filter(a => !state.lidas[a.id]),
    [alertas, state.lidas],
  );

  // ── Seções por prioridade/tempo ──
  const secoes: SecoesAlertas = useMemo(() => {
    const hojeStr = hoje.toISOString().slice(0, 10);
    const seteDias = new Date(hoje.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
    const s: SecoesAlertas = { urgentes: [], hoje: [], semana: [], informativos: [] };
    for (const a of alertas) {
      const dia = (a.data ?? '').slice(0, 10);
      if (a.prioridade === 'critica') s.urgentes.push(a);
      else if (dia === hojeStr) s.hoje.push(a);
      else if (dia >= seteDias && a.prioridade !== 'baixa') s.semana.push(a);
      else s.informativos.push(a);
    }
    return s;
  }, [alertas, hoje]);

  // ── Detecção de novos → som/vibração/banner (uma vez por alerta) ──
  const primeiraCarga = useRef(true);
  useEffect(() => {
    if (!opts.notificar || isLoading || alertas.length === 0 || notificandoLote) return;

    const vistosVazio = Object.keys(state.vistos).length === 0;
    const novos = alertas.filter(a => !state.vistos[a.id]);
    if (novos.length === 0) return;

    notificandoLote = true;
    try {
      // Primeira visita do usuário: registra tudo sem "explodir" sons/banners
      if (!(vistosVazio && primeiraCarga.current)) {
        notificarNovos(novos, rota => navigate(rota));
      }
      primeiraCarga.current = false;
      alertStore.registrarVistos(novos.map(a => a.id));
    } finally {
      notificandoLote = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.notificar, isLoading, alertas]);

  // ── Badge do ícone do app ──
  useEffect(() => {
    if (opts.notificar) atualizarBadgeApp(naoLidos.length);
  }, [opts.notificar, naoLidos.length]);

  // ── Ações ──
  function marcarLida(a: Alerta) {
    haptic();
    alertStore.marcarLida(a.id);
    // Avisos do banco também são marcados lá (persistência entre dispositivos)
    if (a.id.startsWith('db:')) void marcarNotificacaoLida(a.id.slice(3)).catch(() => {});
  }

  function marcarTodasLidas() {
    haptic([15, 30, 15]);
    alertStore.marcarTodasLidas(alertas.map(a => a.id));
    for (const a of alertas) {
      if (a.id.startsWith('db:')) void marcarNotificacaoLida(a.id.slice(3)).catch(() => {});
    }
  }

  function excluir(a: Alerta) {
    haptic(20);
    alertStore.excluir(a.id);
  }

  function lida(a: Alerta): boolean {
    return !!state.lidas[a.id];
  }

  return {
    alertas, secoes, naoLidos,
    unreadCount: naoLidos.length,
    isLoading,
    lida, marcarLida, marcarTodasLidas, excluir,
    state,
  };
}
