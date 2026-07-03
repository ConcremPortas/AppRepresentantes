import { motion, type Variants } from 'framer-motion';
import type { ComponentType, InputHTMLAttributes, ReactNode } from 'react';

export const loginItemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  icon: ComponentType<{ className?: string }>;
  label: string;
  invalid?: boolean;
  trailing?: ReactNode;
}

/** Campo de login com tema escuro (cinematic): ícone interno, glow verde no foco,
 *  estados de erro e autofill escuro (classe .login-input estilizada no index.css). */
export default function LoginField({ icon: Icon, label, invalid, trailing, ...inputProps }: Props) {
  return (
    <motion.div variants={loginItemVariants} className="space-y-2">
      <label className="block text-[11px] font-medium uppercase tracking-[0.16em] text-white/40">
        {label}
      </label>
      <div className="relative group">
        <Icon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 transition-colors duration-300 group-focus-within:text-emerald-300" />
        <input
          {...inputProps}
          className={[
            'login-input w-full h-[52px] pl-11 pr-11 text-[15px] rounded-2xl text-white placeholder:text-white/25',
            'bg-white/[0.04] border transition-all duration-300 outline-none',
            'hover:bg-white/[0.06] focus:bg-white/[0.07]',
            invalid
              ? 'border-red-400/50 focus:ring-4 focus:ring-red-500/15'
              : 'border-white/10 focus:border-emerald-400/60 focus:ring-4 focus:ring-emerald-400/10',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          ].join(' ')}
        />
        {trailing}
      </div>
    </motion.div>
  );
}
