import { type ReactNode, type CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { CARD_BASE, CARD_HOVER } from './tokens';

// Card de entidade (pedido, cliente, orçamento, aprovação…) — o "resumo executivo"
// clicável que abre a drawer/detalhe. Header + corpo + rodapé são passados como
// children; `accent` pinta a borda esquerda (status/etapa). Entrada animada com
// stagger leve (respeita prefers-reduced-motion).
export default function EntityCard({
  children, accent, onClick, index = 0, selected = false, layout = false, className, style,
}: {
  children: ReactNode;
  accent?: string;         // cor da borda esquerda (ex.: etapa/status)
  onClick?: () => void;
  index?: number;
  selected?: boolean;
  layout?: boolean;        // true = anima reordenação suave (listas filtráveis)
  className?: string;
  style?: CSSProperties;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      layout={layout && !reduce ? true : undefined}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.25), ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      style={{ ...(accent ? { borderLeft: `3px solid ${accent}` } : null), ...style }}
      className={cn(
        'group flex flex-col',
        CARD_BASE, CARD_HOVER,
        onClick && 'cursor-pointer',
        selected && 'ring-2 ring-emerald-500/60 ring-offset-1',
        className,
      )}
    >
      {children}
    </motion.div>
  );
}
