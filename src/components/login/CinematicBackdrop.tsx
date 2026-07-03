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

/** Cena cinematográfica (Conceito B): profundidade verde-floresta, iluminação
 *  volumétrica, feixes de luz, névoa, partículas, grão fílmico e vinheta. */
export default function CinematicBackdrop({ reduce }: { reduce: boolean }) {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {/* Profundidade base — gradiente vertical (dossel escuro -> chão verde) */}
      <div
        className="absolute inset-0"
        style={{ backgroundImage: 'linear-gradient(180deg, #04100A 0%, #071A0F 45%, #0B2416 100%)' }}
      />

      {/* Brilho central (atrás do painel) — respira lentamente */}
      <motion.div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(48% 42% at 50% 40%, rgba(46,175,105,0.20), transparent 70%)' }}
        animate={reduce ? undefined : { opacity: [0.7, 1, 0.7], scale: [1, 1.04, 1] }}
        transition={reduce ? undefined : { duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Aurora superior — deslize diagonal muito lento */}
      <motion.div
        className="absolute -top-[30%] left-1/2 w-[150%] h-[80%] blur-3xl opacity-40"
        style={{
          translateX: '-50%',
          background: 'conic-gradient(from 130deg at 50% 50%, transparent, rgba(40,150,90,0.28), transparent 42%)',
        }}
        animate={reduce ? undefined : { rotate: [0, 6, 0], x: ['-51%', '-49%', '-51%'] }}
        transition={reduce ? undefined : { duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Feixes de luz (god-rays) */}
      {BEAMS.map((b, i) => (
        <motion.div
          key={i}
          className="absolute -top-[15%] h-[95%] blur-2xl"
          style={{
            left: b.left,
            width: b.width,
            rotate: `${b.rotate}deg`,
            transformOrigin: 'top center',
            background: 'linear-gradient(to bottom, rgba(150,230,180,0.16), rgba(60,160,100,0.05) 45%, transparent 75%)',
          }}
          animate={reduce ? undefined : { opacity: [0.35, 0.7, 0.35], x: [0, 10, 0] }}
          transition={reduce ? undefined : { duration: 10 + i * 2, repeat: Infinity, ease: 'easeInOut', delay: b.delay }}
        />
      ))}

      {/* Silhueta orgânica (veios de folha) — moldura sutil no topo */}
      <svg className="absolute inset-x-0 top-0 w-full h-[45%] opacity-[0.07]" preserveAspectRatio="none">
        <defs>
          <linearGradient id="vein" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bfeecf" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#bfeecf" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M-40 10 C 220 120, 380 40, 640 150" stroke="url(#vein)" strokeWidth="1.2" fill="none" />
        <path d="M120 -10 C 300 100, 520 60, 820 170" stroke="url(#vein)" strokeWidth="1" fill="none" />
        <path d="M-20 -20 C 160 90, 300 30, 520 120" stroke="url(#vein)" strokeWidth="0.8" fill="none" />
      </svg>

      {/* Partículas de luz */}
      {MOTES.map((m, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-emerald-200/50 blur-[1px]"
          style={{ top: m.top, left: m.left, width: m.size, height: m.size }}
          animate={reduce ? undefined : { y: [0, -16, 0], opacity: [0.15, 0.65, 0.15] }}
          transition={reduce ? undefined : { duration: m.dur, repeat: Infinity, ease: 'easeInOut', delay: m.delay }}
        />
      ))}

      {/* Névoa/chão luminoso */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(60% 40% at 50% 118%, rgba(31,122,67,0.45), transparent 70%)' }}
      />

      {/* Grão fílmico */}
      <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay" style={{ backgroundImage: NOISE }} />

      {/* Vinheta */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(120% 120% at 50% 35%, transparent 42%, rgba(0,0,0,0.6))' }}
      />
    </div>
  );
}
