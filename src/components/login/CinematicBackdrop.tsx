import { useEffect, useState, type ReactNode, type CSSProperties } from 'react';
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion';

// ─── Partículas (poeira de luz) em duas profundidades ─────────────────────────
// FAR: pequenas e discretas · NEAR: maiores e mais brilhantes (só desktop)
const FAR = [
  { top: '20%', left: '16%', s: 2, d: 11, dl: 0 },
  { top: '32%', left: '72%', s: 1.5, d: 13, dl: 1.2 },
  { top: '58%', left: '26%', s: 2.5, d: 10, dl: 0.6 },
  { top: '66%', left: '80%', s: 2, d: 14, dl: 1.8 },
  { top: '44%', left: '50%', s: 1.5, d: 12, dl: 0.9 },
  { top: '76%', left: '40%', s: 2, d: 11, dl: 1.4 },
  { top: '16%', left: '60%', s: 1.5, d: 15, dl: 0.3 },
  { top: '70%', left: '12%', s: 2, d: 10, dl: 2 },
];
const NEAR = [
  { top: '28%', left: '30%', s: 4, d: 9, dl: 0.2 },
  { top: '50%', left: '66%', s: 5, d: 10.5, dl: 1 },
  { top: '72%', left: '52%', s: 3.5, d: 8.5, dl: 0.5 },
  { top: '36%', left: '84%', s: 4, d: 11, dl: 1.6 },
  { top: '60%', left: '18%', s: 3.5, d: 9.5, dl: 0.8 },
];
const BEAMS = [
  { left: '14%', rotate: -18, width: 160, delay: 0 },
  { left: '40%', rotate: -12, width: 230, delay: 1.5 },
  { left: '66%', rotate: -22, width: 180, delay: 0.8 },
];
const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

// Camada com deslocamento de parallax proporcional à profundidade.
function ParallaxLayer({ sx, sy, depth, className, style, children }: {
  sx: MotionValue<number>; sy: MotionValue<number>; depth: number;
  className?: string; style?: CSSProperties; children?: ReactNode;
}) {
  const x = useTransform(sx, v => v * depth);
  const y = useTransform(sy, v => v * depth);
  return <motion.div className={className} style={{ x, y, ...style }}>{children}</motion.div>;
}

/** Fundo cinematográfico do login em camadas com profundidade:
 *  wallpaper (Ken Burns) → glow ambiente → linhas da marca → partículas →
 *  feixes de luz, tudo com leve parallax ao mover o mouse (desktop). Overlays de
 *  legibilidade e vinheta são fixos. Respeita prefers-reduced-motion. */
export default function CinematicBackdrop({ reduce }: { reduce: boolean }) {
  const [rich, setRich] = useState(false); // desktop → camadas extras (near/linhas/beams)

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 45, damping: 18, mass: 0.6 });
  const sy = useSpring(my, { stiffness: 45, damping: 18, mass: 0.6 });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fine = window.matchMedia('(pointer: fine)').matches;
    const desk = window.matchMedia('(min-width: 768px)').matches;
    setRich(desk);
    if (reduce || !fine) return; // sem parallax de mouse no mobile / reduced-motion
    const onMove = (e: PointerEvent) => {
      mx.set((e.clientX / window.innerWidth - 0.5) * 2);
      my.set((e.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [reduce, mx, my]);

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {/* Base: wallpaper — parallax + fade-in + Ken Burns lento */}
      <ParallaxLayer sx={sx} sy={sy} depth={-16} className="absolute -inset-6">
        <motion.div
          className="absolute inset-0 bg-cover bg-center will-change-transform"
          style={{ backgroundImage: 'url(/logos/Wallpaper-Concrem-Op1.jpg)' }}
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: reduce ? 1 : [1.05, 1.11, 1.05] }}
          transition={{
            opacity: { duration: 1.5, ease: [0.22, 1, 0.36, 1] },
            scale: reduce ? undefined : { duration: 32, repeat: Infinity, ease: 'easeInOut' },
          }}
        />
      </ParallaxLayer>

      {/* Overlay escuro em gradiente — legibilidade + máscara da marca gravada
          na faixa inferior da imagem (fica opaco a partir de ~70% da altura). */}
      <div
        className="absolute inset-0"
        style={{ backgroundImage: 'linear-gradient(180deg, rgba(4,16,10,0.72) 0%, rgba(5,20,12,0.5) 40%, rgba(3,14,9,0.9) 58%, rgba(2,11,7,1) 70%, rgba(2,10,6,1) 100%)' }}
      />
      {/* Tinta verde institucional (fixo) */}
      <div className="absolute inset-0 bg-[#04120a]/35 mix-blend-multiply" />

      {/* Glow ambiente — respira de forma perceptível, com leve parallax */}
      <ParallaxLayer sx={sx} sy={sy} depth={14} className="absolute inset-0">
        <motion.div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(50% 44% at 50% 42%, rgba(46,175,105,0.32), rgba(46,175,105,0.08) 55%, transparent 72%)' }}
          animate={reduce ? undefined : { opacity: [0.55, 1, 0.55], scale: [1, 1.07, 1] }}
          transition={reduce ? undefined : { duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Halo central mais concentrado atrás do conteúdo */}
        <motion.div
          className="absolute left-1/2 top-[38%] w-[420px] h-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(52,190,120,0.28), transparent 68%)' }}
          animate={reduce ? undefined : { opacity: [0.5, 0.85, 0.5], scale: [0.92, 1.06, 0.92] }}
          transition={reduce ? undefined : { duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
      </ParallaxLayer>

      {/* Linhas geométricas da marca — fluxo lento (desktop) */}
      {rich && !reduce && (
        <ParallaxLayer sx={sx} sy={sy} depth={20} className="absolute inset-0">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1600 900" preserveAspectRatio="none" fill="none">
            <path d="M-100 300 C 380 190, 900 520, 1720 300" stroke="rgba(120,220,160,0.16)" strokeWidth="1.1" className="login-line" style={{ strokeDasharray: '6 18', animationDuration: '26s' }} />
            <path d="M-100 540 C 480 430, 1020 660, 1720 470" stroke="rgba(120,220,160,0.11)" strokeWidth="1" className="login-line" style={{ strokeDasharray: '4 20', animationDuration: '34s' }} />
            <path d="M-100 150 C 320 70, 820 250, 1720 120" stroke="rgba(120,220,160,0.09)" strokeWidth="0.8" className="login-line" style={{ strokeDasharray: '3 22', animationDuration: '42s' }} />
          </svg>
        </ParallaxLayer>
      )}

      {/* Aurora superior — deslize diagonal muito lento */}
      {!reduce && (
        <motion.div
          className="absolute -top-[30%] left-1/2 w-[150%] h-[80%] blur-3xl opacity-35"
          style={{ translateX: '-50%', background: 'conic-gradient(from 130deg at 50% 50%, transparent, rgba(40,150,90,0.3), transparent 42%)' }}
          animate={{ rotate: [0, 6, 0], x: ['-51%', '-49%', '-51%'] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Feixes de luz (god-rays) — desktop */}
      {rich && !reduce && (
        <ParallaxLayer sx={sx} sy={sy} depth={10} className="absolute inset-0">
          {BEAMS.map((b, i) => (
            <motion.div
              key={i}
              className="absolute -top-[15%] h-[95%] blur-2xl"
              style={{
                left: b.left, width: b.width, rotate: `${b.rotate}deg`, transformOrigin: 'top center',
                background: 'linear-gradient(to bottom, rgba(150,230,180,0.16), rgba(60,160,100,0.05) 45%, transparent 75%)',
              }}
              animate={{ opacity: [0.3, 0.65, 0.3], x: [0, 10, 0] }}
              transition={{ duration: 10 + i * 2, repeat: Infinity, ease: 'easeInOut', delay: b.delay }}
            />
          ))}
        </ParallaxLayer>
      )}

      {/* Partículas distantes — sempre (leves) */}
      {!reduce && (
        <ParallaxLayer sx={sx} sy={sy} depth={12} className="absolute inset-0">
          {FAR.map((m, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full bg-emerald-100/40 blur-[1px]"
              style={{ top: m.top, left: m.left, width: m.s, height: m.s }}
              animate={{ y: [0, -18, 0], opacity: [0.1, 0.5, 0.1] }}
              transition={{ duration: m.d, repeat: Infinity, ease: 'easeInOut', delay: m.dl }}
            />
          ))}
        </ParallaxLayer>
      )}

      {/* Partículas próximas — maiores/brilhantes (desktop) */}
      {rich && !reduce && (
        <ParallaxLayer sx={sx} sy={sy} depth={30} className="absolute inset-0">
          {NEAR.map((m, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full bg-emerald-50/80"
              style={{ top: m.top, left: m.left, width: m.s, height: m.s, boxShadow: '0 0 8px 1px rgba(120,230,170,0.5)' }}
              animate={{ y: [0, -26, 0], x: [0, 6, 0], opacity: [0.25, 0.85, 0.25] }}
              transition={{ duration: m.d, repeat: Infinity, ease: 'easeInOut', delay: m.dl }}
            />
          ))}
        </ParallaxLayer>
      )}

      {/* Névoa/chão luminoso (fixo) */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(60% 40% at 50% 118%, rgba(31,122,67,0.42), transparent 70%)' }} />
      {/* Grão fílmico (fixo) */}
      <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay" style={{ backgroundImage: NOISE }} />
      {/* Vinheta (fixo) */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(125% 125% at 50% 35%, transparent 38%, rgba(0,0,0,0.72))' }} />
    </div>
  );
}
