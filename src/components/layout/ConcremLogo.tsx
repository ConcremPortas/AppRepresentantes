import { cn } from '@/utils/cn';

// Logos servidos de public/logos (case-sensitive na Vercel).
const LOGO_ABERTA  = `${import.meta.env.BASE_URL}logos/Logo-Branco.png`;      // sidebar aberta
const LOGO_FECHADA = `${import.meta.env.BASE_URL}logos/Isotipo-CorBranco.png`; // sidebar fechada

interface ConcremLogoProps {
  collapsed?: boolean;
  onClick?: () => void;
}

export default function ConcremLogo({ collapsed = false, onClick }: ConcremLogoProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center focus:outline-none w-full py-1"
      title="Concrem Connect"
    >
      {/* Aberta: logo completo (branco). Fechada: apenas o isotipo (branco). */}
      <img
        src={collapsed ? LOGO_FECHADA : LOGO_ABERTA}
        alt="Concrem Portas Premium"
        className={cn(
          'object-contain transition-all duration-300',
          collapsed ? 'h-8 w-8' : 'h-10 w-full max-w-[150px]'
        )}
      />
    </button>
  );
}
