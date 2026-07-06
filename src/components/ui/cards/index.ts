// ─────────────────────────────────────────────────────────────────────────────
// Sistema de cards do Concrem Connect — barrel de exportação.
// Fonte visual: card aprovado da Central de Pedidos. Use estes componentes em
// TODAS as telas para manter uma identidade única (branco, cantos 2xl, sombra
// suave, badges semânticos, rodapé de ações, botão verde institucional).
// ─────────────────────────────────────────────────────────────────────────────
export * from './tokens';
export { default as Badge } from './Badge';
export { default as DocumentBadge } from './DocumentBadge';
export { default as CardMetaItem } from './CardMetaItem';
export { default as MetricCard } from './MetricCard';
export { default as ProgressSteps, type ProgressStep } from './ProgressSteps';
export { default as CardActionFooter } from './CardActionFooter';
export { default as EntityCard } from './EntityCard';
export { CardSkeleton, EmptyCard, ErrorCard } from './CardStates';
