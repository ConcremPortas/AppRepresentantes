import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { loginItemVariants } from './LoginField';

interface Ripple { id: number; x: number; y: number }

/** Botão premium: gradiente verde, elevação/glow no hover, brilho que cruza,
 *  ripple no toque, seta deslizante e spinner de loading. */
export default function PremiumButton({
  loading, disabled, reduce, label = 'Entrar',
}: { loading: boolean; disabled: boolean; reduce: boolean; label?: string }) {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (disabled || reduce) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const id = Date.now();
    setRipples(r => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    window.setTimeout(() => setRipples(r => r.filter(x => x.id !== id)), 600);
  }

  return (
    <motion.button
      variants={loginItemVariants}
      type="submit"
      disabled={disabled}
      onPointerDown={handlePointerDown}
      whileHover={disabled || reduce ? undefined : { y: -2 }}
      whileTap={disabled || reduce ? undefined : { scale: 0.99 }}
      className="group relative w-full h-[52px] rounded-2xl text-white text-[15px] font-semibold flex items-center justify-center gap-2 overflow-hidden transition-shadow duration-300 shadow-[0_12px_40px_-10px_rgba(46,157,83,0.55)] hover:shadow-[0_18px_50px_-10px_rgba(46,157,83,0.72)] disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none"
      style={{ backgroundImage: 'linear-gradient(120deg, #123D22, #1F7A43 55%, #2FA457)' }}
    >
      {/* Ripples */}
      {ripples.map(r => (
        <motion.span
          key={r.id}
          className="pointer-events-none absolute rounded-full bg-white/25"
          style={{ left: r.x, top: r.y, width: 12, height: 12, translateX: '-50%', translateY: '-50%' }}
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: 14, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      ))}

      {/* Brilho que cruza no hover */}
      {!reduce && (
        <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      )}

      <span className="relative flex items-center gap-2">
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Entrando...
          </>
        ) : (
          <>
            {label}
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </>
        )}
      </span>
    </motion.button>
  );
}
