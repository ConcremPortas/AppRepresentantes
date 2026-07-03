import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Bell, BellOff, Check, CheckCheck, Settings2, ChevronLeft, ChevronRight,
  Sparkles, Volume2, Vibrate, MessageSquare, Lock, Play, Trash2, Inbox,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import { useAlertas } from '@/hooks/useAlertas';
import { formatDate } from '@/utils/formatters';
import { ALERT_DEFS, ALERT_TIPOS, PRIO_META, type Alerta } from '@/alerts/registry';
import { alertStore, type Canais } from '@/alerts/prefs';
import { playSom } from '@/alerts/sounds';
import { haptic, pedirPermissaoBanner, permissaoBanner } from '@/alerts/notify';

// ─── Helpers ─────────────────────────────────────────────
function tempoRelativo(iso: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso.slice(0, 10)) && iso.length <= 10
    ? new Date(`${iso}T12:00:00`)
    : new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const dias = Math.floor(h / 24);
  if (dias === 1) return 'ontem';
  if (dias < 7) return `há ${dias} dias`;
  return formatDate(iso);
}

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

// ─── Switch (iOS-like) ───────────────────────────────────
// `min-h-0 min-w-0` neutraliza a regra global de touch-target (44px) que
// deformava o pill; `shrink-0` impede o pill de ser espremido no flex.
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => { haptic(); onChange(!on); }}
      className={cn(
        'relative inline-flex items-center h-6 w-11 min-h-0 min-w-0 shrink-0 rounded-full p-0.5 transition-colors',
        on ? 'bg-[hsl(142,93%,8%)]' : 'bg-gray-300',
      )}
    >
      <span className={cn(
        'block w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out',
        on ? 'translate-x-5' : 'translate-x-0',
      )} />
    </button>
  );
}

// ─── Card de alerta (swipe para excluir) ─────────────────
function AlertaCard({ alerta, lida, onLer, onExcluir, onAcao, index }: {
  alerta: Alerta;
  lida: boolean;
  onLer: () => void;
  onExcluir: () => void;
  onAcao: () => void;
  index: number;
}) {
  const reduce = useReducedMotion();
  const def = ALERT_DEFS[alerta.tipo];
  const prio = PRIO_META[alerta.prioridade];
  const Icon = def.icon;

  return (
    <motion.div
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, x: -80, height: 0, marginBottom: 0, transition: { duration: 0.22 } }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.25), ease: [0.22, 1, 0.36, 1] }}
      drag={reduce ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0.6, right: 0.05 }}
      onDragEnd={(_, info) => { if (info.offset.x < -90) onExcluir(); }}
      className={cn(
        'relative rounded-2xl border shadow-sm transition-shadow hover:shadow-md overflow-hidden touch-pan-y',
        lida ? 'bg-white border-gray-200/60' : 'bg-white border-gray-200/90',
      )}
      style={{ borderLeft: `3px solid ${lida ? '#e5e7eb' : prio.border}` }}
    >
      <div className="p-3.5 sm:p-4">
        <div className="flex items-start gap-3">
          {/* Ícone */}
          <span className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
            lida ? 'bg-gray-100 text-gray-400' : prio.chip,
          )}>
            <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className={cn('text-sm leading-snug', lida ? 'font-medium text-gray-600' : 'font-semibold text-gray-900')}>
                {alerta.titulo}
              </p>
              {!lida && <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: prio.dot }} />}
            </div>
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{alerta.descricao}</p>
            {alerta.detalhe && (
              <p className={cn('text-xs mt-1 line-clamp-2', lida ? 'text-gray-400' : 'font-medium text-gray-700')}>
                {alerta.detalhe}
              </p>
            )}

            <div className="flex items-center justify-between gap-2 mt-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] text-gray-400 tabular-nums whitespace-nowrap">{tempoRelativo(alerta.data)}</span>
                <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wider', prio.chip)}>
                  {prio.label}
                </span>
                {alerta.agrupado && (
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 tabular-nums">
                    {alerta.agrupado} itens
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 touch-compact flex-shrink-0">
                {!lida && (
                  <button
                    type="button"
                    onClick={onLer}
                    title="Marcar como lida"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-[hsl(142,93%,8%)] hover:bg-gray-50 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onAcao}
                  className="h-7 px-2.5 rounded-lg text-[11px] font-semibold text-[hsl(142,93%,8%)] bg-[hsl(142,93%,8%)]/8 hover:bg-[hsl(142,93%,8%)]/15 active:scale-95 transition-all flex items-center gap-1 whitespace-nowrap"
                >
                  {alerta.acao}
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Seção de alertas ────────────────────────────────────
function Secao({ titulo, alertas, lida, marcarLida, excluir, abrir, cor }: {
  titulo: string;
  alertas: Alerta[];
  lida: (a: Alerta) => boolean;
  marcarLida: (a: Alerta) => void;
  excluir: (a: Alerta) => void;
  abrir: (a: Alerta) => void;
  cor?: string;
}) {
  if (alertas.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-0.5">
        {cor && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cor }} />}
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{titulo}</h2>
        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5 tabular-nums">{alertas.length}</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 items-start">
        <AnimatePresence mode="popLayout">
          {alertas.map((a, i) => (
            <AlertaCard
              key={a.id}
              alerta={a}
              index={i}
              lida={lida(a)}
              onLer={() => marcarLida(a)}
              onExcluir={() => excluir(a)}
              onAcao={() => abrir(a)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Preferências ────────────────────────────────────────
const MUTE_OPCOES = [
  { label: '30 minutos', min: 30 },
  { label: '1 hora',     min: 60 },
  { label: '8 horas',    min: 480 },
  { label: '24 horas',   min: 1440 },
];

const CANAIS_DEF: { key: keyof Canais; label: string; descricao: string; icon: React.ElementType }[] = [
  { key: 'som',           label: 'Som',                    descricao: 'Toques discretos ao receber alertas',        icon: Volume2 },
  { key: 'vibracao',      label: 'Vibração',               descricao: 'Feedback tátil em novos alertas e ações',    icon: Vibrate },
  { key: 'banner',        label: 'Banner',                 descricao: 'Notificação do sistema com deep-link',       icon: MessageSquare },
  { key: 'telaBloqueada', label: 'Mostrar na tela bloqueada', descricao: 'Exibir alertas com o aparelho bloqueado', icon: Lock },
];

function PreferenciasView({ onVoltar }: { onVoltar: () => void }) {
  const state = alertStore.getSnapshot();
  const [, force] = useState(0);
  const rerender = () => force(x => x + 1);
  const [muteCustom, setMuteCustom] = useState('');
  const permissao = permissaoBanner();
  const muted = alertStore.isMuted();

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-5"
    >
      <div className="flex items-center gap-2">
        <button onClick={onVoltar} className="p-1.5 -ml-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" aria-label="Voltar">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">Preferências de Alertas</h1>
          <p className="text-xs text-gray-400">Escolha o que e como você quer ser avisado</p>
        </div>
      </div>

      {/* Silenciar */}
      <div className="rounded-2xl bg-white border border-gray-200/70 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-1">
          <BellOff className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Silenciar notificações</h2>
        </div>
        <p className="text-[11px] text-gray-400 mb-3">
          Interrompe sons e banners sem perder nenhuma notificação.
          {muted && state.muteAte && (
            <span className="text-amber-600 font-medium"> Silenciado até {new Date(state.muteAte).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.</span>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          {MUTE_OPCOES.map(o => (
            <button
              key={o.min}
              type="button"
              onClick={() => { haptic(); alertStore.silenciar(o.min); rerender(); }}
              className="h-9 px-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 active:scale-95 transition-all"
            >
              {o.label}
            </button>
          ))}
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              value={muteCustom}
              onChange={e => setMuteCustom(e.target.value)}
              placeholder="min"
              className="w-16 h-9 px-2 text-xs text-center border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(142,93%,8%)]"
            />
            <button
              type="button"
              disabled={!muteCustom || Number(muteCustom) <= 0}
              onClick={() => { haptic(); alertStore.silenciar(Number(muteCustom)); setMuteCustom(''); rerender(); }}
              className="h-9 px-3 rounded-xl bg-gray-900 text-white text-xs font-medium disabled:opacity-40 active:scale-95 transition-all"
            >
              OK
            </button>
          </div>
          {muted && (
            <button
              type="button"
              onClick={() => { haptic(); alertStore.silenciar(null); rerender(); }}
              className="h-9 px-3 rounded-xl bg-[hsl(142,93%,8%)] text-white text-xs font-medium active:scale-95 transition-all"
            >
              Reativar agora
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 items-start">
      {/* Canais */}
      <div className="rounded-2xl bg-white border border-gray-200/70 shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Canais</h2>
        <div className="space-y-3">
          {CANAIS_DEF.map(c => {
            const Icon = c.icon;
            return (
              <div key={c.key} className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{c.label}</p>
                  <p className="text-[11px] text-gray-400 truncate">{c.descricao}</p>
                </div>
                <Toggle on={state.canais[c.key]} onChange={v => { alertStore.setCanal(c.key, v); rerender(); }} />
              </div>
            );
          })}
        </div>

        {/* Permissão de banner do sistema */}
        {state.canais.banner && permissao !== 'granted' && permissao !== 'unsupported' && (
          <button
            type="button"
            onClick={async () => { await pedirPermissaoBanner(); rerender(); }}
            className="mt-3 w-full h-10 rounded-xl border border-[hsl(142,93%,8%)]/30 text-[hsl(142,93%,8%)] text-xs font-semibold hover:bg-[hsl(142,93%,8%)]/5 active:scale-[0.99] transition-all"
          >
            {permissao === 'denied'
              ? 'Banners bloqueados — habilite nas configurações do navegador'
              : 'Permitir banners do sistema'}
          </button>
        )}

        {/* Testar sons */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-[11px] text-gray-400 mb-2">Testar sons (todos com menos de 500ms)</p>
          <div className="flex gap-2">
            {([['sucesso', 'Sucesso'], ['atencao', 'Atenção'], ['erro', 'Erro']] as const).map(([som, label]) => (
              <button
                key={som}
                type="button"
                onClick={() => playSom(som)}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-gray-50 text-xs font-medium text-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
              >
                <Play className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tipos de alerta */}
      <div className="rounded-2xl bg-white border border-gray-200/70 shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Tipos de alerta</h2>
        <div className="space-y-3">
          {ALERT_TIPOS.map(tipo => {
            const def = ALERT_DEFS[tipo];
            const Icon = def.icon;
            const prio = PRIO_META[def.prioridade];
            return (
              <div key={tipo} className="flex items-center gap-3">
                <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', prio.chip)}>
                  <Icon className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{def.label}</p>
                  <p className="text-[11px] text-gray-400 truncate">{def.descricao}</p>
                </div>
                <Toggle on={state.prefs[tipo]} onChange={v => { alertStore.setPref(tipo, v); rerender(); }} />
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </motion.div>
  );
}

// ─── Página ──────────────────────────────────────────────
export default function AlertasPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<'lista' | 'prefs'>('lista');
  const listaRef = useRef<HTMLDivElement>(null);

  const {
    alertas, secoes, unreadCount, isLoading,
    lida, marcarLida, marcarTodasLidas, excluir, state,
  } = useAlertas();

  const nome = user?.usuario?.nome?.split(' ')[0] ?? 'Representante';
  const muted = state.muteAte !== null && Date.now() < state.muteAte;

  // ── Recomendações do assistente (resumo diário) ──
  const recomendacoes = useMemo(() => {
    const rec: string[] = [];
    const recompra = alertas.find(a => a.tipo === 'cliente_recompra');
    if (recompra) {
      const n = recompra.agrupado ?? alertas.filter(a => a.tipo === 'cliente_recompra').length;
      rec.push(`Entrar em contato com ${n} cliente(s) que ultrapassaram a frequência média de compra.`);
    }
    const faturados = alertas.filter(a => a.tipo === 'pedido_faturado' && !lida(a));
    if (faturados.length > 0) {
      const n = faturados.reduce((s, a) => s + (a.agrupado ?? 1), 0);
      rec.push(`Você possui ${n} pedido(s) faturado(s) aguardando download da NF.`);
    }
    const parados = alertas.filter(a => a.tipo === 'orcamento_parado');
    if (parados.length > 0) {
      rec.push(`Existe(m) ${parados.length} orçamento(s) aguardando aprovação há mais de 30 dias.`);
    }
    const expirando = alertas.filter(a => a.tipo === 'orcamento_expirando');
    if (expirando.length > 0) {
      rec.push(`${expirando.length} orçamento(s) com validade expirando — vale renovar com o cliente.`);
    }
    const aprovados = alertas.filter(a => a.tipo === 'orcamento_aprovado' && !lida(a));
    if (aprovados.length > 0) {
      rec.push(`${aprovados.length} orçamento(s) aprovado(s) recentemente — bom momento para fechar o pedido.`);
    }
    return rec.slice(0, 4);
  }, [alertas, lida]);

  function abrir(a: Alerta) {
    marcarLida(a);
    navigate(a.rota);
  }

  if (view === 'prefs') {
    return (
      <div className="p-4 sm:p-5 max-w-5xl mx-auto pb-24">
        <PreferenciasView onVoltar={() => setView('lista')} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 space-y-5 max-w-5xl mx-auto pb-24">

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-[hsl(142,93%,8%)]" />
            Alertas
          </h1>
          {unreadCount > 0 && (
            <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-[hsl(142,93%,8%)] text-white text-[11px] font-bold flex items-center justify-center tabular-nums">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          {muted && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
              <BellOff className="w-3 h-3" />
              silenciado
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 touch-compact">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={marcarTodasLidas}
              title="Marcar todas como lidas"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-[hsl(142,93%,8%)] hover:bg-gray-50 transition-colors"
            >
              <CheckCheck className="w-4.5 h-4.5 w-[18px] h-[18px]" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setView('prefs')}
            title="Preferências"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Settings2 className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>

      {/* ── Assistente Comercial Inteligente ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 via-white to-white shadow-sm p-4 sm:p-5"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="w-7 h-7 rounded-lg bg-[hsl(142,93%,8%)] text-white flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <h2 className="text-base font-bold text-gray-900">{saudacao()}, {nome} 👋</h2>
        </div>
        {isLoading ? (
          <div className="space-y-2 mt-3 animate-pulse">
            <div className="h-3 bg-emerald-100/60 rounded w-3/4" />
            <div className="h-3 bg-emerald-100/60 rounded w-2/3" />
          </div>
        ) : recomendacoes.length > 0 ? (
          <>
            <p className="text-xs text-gray-500 mt-0.5 mb-2.5">Hoje recomendamos:</p>
            <ul className="space-y-1.5">
              {recomendacoes.map((r, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.07 }}
                  className="flex items-start gap-2 text-[13px] text-gray-700 leading-snug"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[hsl(142,93%,8%)] flex-shrink-0 mt-1.5" />
                  {r}
                </motion.li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => listaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="mt-3.5 h-9 px-4 rounded-xl bg-[hsl(142,93%,8%)] text-white text-xs font-semibold hover:bg-[hsl(142,93%,15%)] active:scale-[0.98] transition-all inline-flex items-center gap-1.5 shadow-sm"
            >
              Ver recomendações
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <p className="text-sm text-gray-500 mt-1">Tudo em dia por aqui — nenhuma ação pendente. 🎉</p>
        )}
      </motion.div>

      {/* ── Lista de alertas por prioridade ── */}
      <div ref={listaRef} className="space-y-5 scroll-mt-4">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white border border-gray-200/60 p-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 flex-shrink-0" />
                  <div className="flex-1 space-y-2 pt-0.5">
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : alertas.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-200/70 shadow-sm py-16 text-center">
            <Inbox className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">Nenhum alerta por aqui</p>
            <p className="text-xs text-gray-400 mt-1">Você será avisado quando algo precisar da sua atenção</p>
          </div>
        ) : (
          <>
            <Secao titulo="Ações Urgentes" cor="#ef4444" alertas={secoes.urgentes}
              lida={lida} marcarLida={marcarLida} excluir={excluir} abrir={abrir} />
            <Secao titulo="Hoje" cor="#f97316" alertas={secoes.hoje}
              lida={lida} marcarLida={marcarLida} excluir={excluir} abrir={abrir} />
            <Secao titulo="Esta Semana" cor="#3b82f6" alertas={secoes.semana}
              lida={lida} marcarLida={marcarLida} excluir={excluir} abrir={abrir} />
            <Secao titulo="Informativos" cor="#9ca3af" alertas={secoes.informativos}
              lida={lida} marcarLida={marcarLida} excluir={excluir} abrir={abrir} />
          </>
        )}
      </div>

      {/* Dica de swipe (mobile) */}
      {!isLoading && alertas.length > 0 && (
        <p className="flex items-center justify-center gap-1.5 text-[10px] text-gray-300 sm:hidden">
          <Trash2 className="w-3 h-3" />
          Arraste um alerta para a esquerda para excluir
        </p>
      )}
    </div>
  );
}
