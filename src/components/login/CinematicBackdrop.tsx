import { motion } from 'framer-motion';

// Feixes de luz (god-rays) descendo pelo "dossel"
const BEAMS = [
  { left: '12%', rotate: -18, width: 150, delay: 0 },
  { left: '38%', rotate: -12, width: 220, delay: 1.5 },
  { left: '64%', rotate: -22, width: 170, delay: 0.8 },
];

// Partículas de luz (pólen) flutuando
const MOTES = [
  { top: '22%', left: '20%', size: 3, dur: 9, delay: 0 },
  { top: '30%', left: '70%', size: 2, dur: 11, delay: 1.2 },
  { top: '55%', left: '30%', size: 4, dur: 8, delay: 0.6 },
  { top: '62%', left: '78%', size: 2, dur: 12, delay: 1.8 },
  { top: '40%', left: '52%', size: 3, dur: 10, delay: 0.9 },
  { top: '74%', left: '44%', size: 2, dur: 9.5, delay: 1.4 },
  { top: '18%', left: '58%', size: 2, dur: 13, delay: 0.3 },
  { top: '68%', left: '14%', size: 3, dur: 8.5, delay: 2 },
];

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** Fundo cinematográfico do login: wallpaper institucional (otimizada) como base,
 *  com overlays de legibilidade (gradiente escuro + tinta verde + vinheta + glow
 *  central) e, por cima, iluminação volumétrica animada (aurora, feixes, pólen,
 *  grão). O movimento é lento/discreto e respeita prefers-reduced-motion. */
export default function CinematicBackdrop({ reduce }: { reduce: boolean }) {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {/* Base: wallpaper com fade-in + Ken Burns muito lento */}
      <motion.div
        className="absolute inset-0 bg-cover bg-center will-change-transform"
        style={{ backgroundImage: 'url(/login-bg.jpg)' }}
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: reduce ? 1 : [1.04, 1.09, 1.04] }}
        transition={{
          opacity: { duration: 1.4, ease: [0.22, 1, 0.36, 1] },
          scale: reduce ? undefined : { duration: 34, repeat: Infinity, ease: 'easeInOut' },
        }}
      />

      {/* Overlay escuro em gradiente — legibilidade do conteúdo central */}
      <div
        className="absolute inset-0"
        style={{ backgroundImage: 'linear-gradient(180deg, rgba(4,16,10,0.74) 0%, rgba(5,20,12,0.52) 42%, rgba(3,14,9,0.88) 100%)' }}
      />

      {/* Camada de cor verde institucional (unifica a paleta) */}
      <div className="absolute inset-0 bg-[#04120a]/35 mix-blend-multiply" />

      {/* Brilho central (atrás do painel) — respira lentamente */}
      <motion.div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(46% 40% at 50% 40%, rgba(46,175,105,0.22), transparent 70%)' }}
        animate={reduce ? undefined : { opacity: [0.65, 1, 0.65], scale: [1, 1.04, 1] }}
        transition={reduce ? undefined : { duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Aurora superior — deslize diagonal muito lento */}
      <motion.div
        className="absolute -top-[30%] left-1/2 w-[150%] h-[80%] blur-3xl opacity-30"
        style={{
          translateX: '-50%',
          background: 'conic-gradient(from 130deg at 50% 50%, transparent, rgba(40,150,90,0.28), transparent 42%)',
        }}
        animate={reduce ? undefined : { rotate: [0, 6, 0], x: ['-51%', '-49%', '-51%'] }}
        transition={reduce ? undefined : { duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Feixes de luz (god-rays) */}
      {!reduce && BEAMS.map((b, i) => (
        <motion.div
          key={i}
          className="absolute -top-[15%] h-[95%] blur-2xl"
          style={{
            left: b.left,
            width: b.width,
            rotate: `${b.rotate}deg`,
            transformOrigin: 'top center',
            background: 'linear-gradient(to bottom, rgba(150,230,180,0.14), rgba(60,160,100,0.05) 45%, transparent 75%)',
          }}
          animate={{ opacity: [0.3, 0.6, 0.3], x: [0, 10, 0] }}
          transition={{ duration: 10 + i * 2, repeat: Infinity, ease: 'easeInOut', delay: b.delay }}
        />
      ))}

      {/* Partículas de luz (pólen) */}
      {!reduce && MOTES.map((m, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-emerald-100/50 blur-[1px]"
          style={{ top: m.top, left: m.left, width: m.size, height: m.size }}
          animate={{ y: [0, -16, 0], opacity: [0.12, 0.6, 0.12] }}
          transition={{ duration: m.dur, repeat: Infinity, ease: 'easeInOut', delay: m.delay }}
        />
      ))}

      {/* Névoa/chão luminoso */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(60% 40% at 50% 118%, rgba(31,122,67,0.4), transparent 70%)' }}
      />

      {/* Grão fílmico */}
      <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay" style={{ backgroundImage: NOISE }} />

      {/* Vinheta — foca o conteúdo central sobre a foto */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(125% 125% at 50% 35%, transparent 38%, rgba(0,0,0,0.72))' }}
      />
    </div>
  );
}
