import { motion } from 'framer-motion';

const variants = {
  enter:  (dir: number) => ({ opacity: 0, x: dir >= 0 ? 28 : -28 }),
  center: { opacity: 1, x: 0 },
  exit:   (dir: number) => ({ opacity: 0, x: dir >= 0 ? -28 : 28 }),
};

// Invólucro animado de uma página executiva (fade + slide leve, direcional).
export default function ExecutivePageShell({ direction, children }: { direction: number; children: React.ReactNode }) {
  return (
    <motion.div
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-3"
    >
      {children}
    </motion.div>
  );
}
