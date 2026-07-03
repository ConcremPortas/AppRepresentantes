// ─────────────────────────────────────────────────────────────────────────────
// Adaptador de notificação: som + vibração + banner + badge do app.
//
// HOJE (web/PWA):
//   • Banner via Notification API (com o app aberto/instalado); clique abre a
//     rota exata do alerta (deep-link), nunca a Home.
//   • Badge do ícone via Badging API (navigator.setAppBadge) — PWA instalado.
//   • Vibração via navigator.vibrate (Android).
//
// FUTURO (Capacitor — Android/iOS nativos): trocar apenas ESTE arquivo por
// @capacitor/push-notifications + @capacitor/haptics + @capacitor/badge.
// O restante do sistema (engine, prefs, tela) não muda — é o ponto de troca.
// ─────────────────────────────────────────────────────────────────────────────
import type { Alerta } from './registry';
import { ALERT_DEFS } from './registry';
import { playSom } from './sounds';
import { alertStore } from './prefs';

export function podeBanner(): boolean {
  return typeof Notification !== 'undefined';
}

export function permissaoBanner(): NotificationPermission | 'unsupported' {
  return podeBanner() ? Notification.permission : 'unsupported';
}

export async function pedirPermissaoBanner(): Promise<boolean> {
  if (!podeBanner()) return false;
  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

/** Feedback tátil curto para interações (marcar lida, excluir, aprovar). */
export function haptic(pattern: number | number[] = 12) {
  try {
    if (alertStore.getSnapshot().canais.vibracao) navigator.vibrate?.(pattern);
  } catch { /* não suportado */ }
}

/** Atualiza o badge do ícone do app (PWA instalado) e limpa quando zerar. */
export function atualizarBadgeApp(unread: number) {
  try {
    const nav = navigator as Navigator & {
      setAppBadge?: (n: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (unread > 0) void nav.setAppBadge?.(unread);
    else void nav.clearAppBadge?.();
  } catch { /* não suportado */ }
}

/**
 * Dispara som/vibração/banner para alertas NOVOS (uma única vez por alerta).
 * Respeita: preferências por tipo, canais e o modo silenciar (que interrompe
 * som e banner sem descartar as notificações).
 */
export function notificarNovos(novos: Alerta[], navigateTo: (rota: string) => void) {
  if (novos.length === 0) return;
  const { canais } = alertStore.getSnapshot();
  const muted = alertStore.isMuted();

  // Som: um único toque por lote (o mais "grave" vence: erro > atencao > sucesso)
  if (!muted && canais.som) {
    const ordem = ['erro', 'atencao', 'sucesso'] as const;
    const sons = new Set(novos.map(a => ALERT_DEFS[a.tipo].som).filter(Boolean));
    const som = ordem.find(s => sons.has(s));
    if (som) playSom(som);
  }

  if (!muted && canais.vibracao) {
    try { navigator.vibrate?.([30, 40, 30]); } catch { /* não suportado */ }
  }

  // Banner (máx. 3 por lote para não spammar o sistema)
  if (!muted && canais.banner && podeBanner() && Notification.permission === 'granted') {
    for (const a of novos.slice(0, 3)) {
      try {
        const n = new Notification(a.titulo, {
          body: a.detalhe ? `${a.descricao}\n${a.detalhe}` : a.descricao,
          tag: a.id,                       // dedupe no sistema operacional
          icon: '/logos/Isotipo-Cores.png',
          badge: '/logos/Isotipo-Preto.png',
          silent: true,                    // o som é nosso (discreto), não o do SO
        });
        // Deep-link: abre exatamente a tela relacionada (nunca a Home)
        n.onclick = () => {
          window.focus();
          navigateTo(a.rota);
          n.close();
        };
      } catch { /* alguns navegadores exigem service worker */ }
    }
  }
}
