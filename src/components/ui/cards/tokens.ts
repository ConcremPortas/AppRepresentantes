// ─────────────────────────────────────────────────────────────────────────────
// Design tokens do sistema de cards do Concrem Connect.
// Extraídos do card APROVADO da Central de Pedidos — fonte única de verdade para
// que todos os cards do app falem a mesma língua visual (Stripe/Linear-like).
// ─────────────────────────────────────────────────────────────────────────────

/** Verde institucional Concrem (botão primário, destaques). */
export const CONCREM = 'hsl(142,93%,8%)';

/** Card base: branco, cantos arredondados, borda e sombra suaves. */
export const CARD_BASE =
  'rounded-2xl bg-white border border-gray-200/70 shadow-sm min-w-0 overflow-hidden';

/** Elevação/translação sutil no hover. */
export const CARD_HOVER = 'transition-all duration-200 hover:shadow-md hover:-translate-y-0.5';

/** Card clicável (resumo executivo → abre drawer/detalhe). */
export const CARD_INTERACTIVE = `${CARD_BASE} ${CARD_HOVER} cursor-pointer`;

/** Botão primário verde escuro institucional. */
export const PRIMARY_BTN =
  'inline-flex items-center justify-center gap-1.5 rounded-xl bg-[hsl(142,93%,8%)] text-white font-semibold ' +
  'hover:brightness-125 active:scale-[0.98] transition-all disabled:opacity-50';

/** Botão secundário (fundo branco, borda suave). */
export const SECONDARY_BTN =
  'inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold ' +
  'hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-50';

// ─── Cores semânticas de status ──────────────────────────────────────────────
// positive=verde · warning=laranja/âmbar · danger=vermelho · info=azul · neutral=cinza
export type Tone = 'positive' | 'warning' | 'danger' | 'info' | 'neutral';

/** Chip/badge por tom: fundo suave + texto legível + borda sutil. */
export const TONE_CHIP: Record<Tone, string> = {
  positive: 'bg-green-50 text-green-700 border-green-200',
  warning:  'bg-amber-50 text-amber-700 border-amber-200',
  danger:   'bg-red-50 text-red-600 border-red-200',
  info:     'bg-blue-50 text-blue-700 border-blue-200',
  neutral:  'bg-gray-100 text-gray-600 border-gray-200',
};

/** Cor de texto por tom (para valores/KPIs). */
export const TONE_TEXT: Record<Tone, string> = {
  positive: 'text-emerald-700',
  warning:  'text-amber-600',
  danger:   'text-red-600',
  info:     'text-blue-700',
  neutral:  'text-gray-900',
};

/** Ponto/dot por tom. */
export const TONE_DOT: Record<Tone, string> = {
  positive: 'bg-emerald-500',
  warning:  'bg-amber-500',
  danger:   'bg-red-500',
  info:     'bg-blue-500',
  neutral:  'bg-gray-400',
};
