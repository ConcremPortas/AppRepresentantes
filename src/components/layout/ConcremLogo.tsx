import { cn } from '@/utils/cn';
import logoCompleto from '@/assets/logo-concrem-new.png';

interface ConcremLogoProps {
  collapsed?: boolean;
  onClick?: () => void;
}

export default function ConcremLogo({ collapsed = false, onClick }: ConcremLogoProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center justify-center focus:outline-none w-full py-1',
        collapsed ? 'px-0' : 'px-0'
      )}
      title="Concrem Connect"
    >
      {/* Quando expandido: logo completo. Quando colapsado: apenas o ícone (lado esquerdo do logo) */}
      <img
        src={logoCompleto}
        alt="Concrem Portas Premium"
        className={cn(
          'object-contain transition-all duration-300',
          collapsed
            ? 'h-8 w-8 object-left'   // só o ícone da folha
            : 'h-10 w-full max-w-[140px]'  // logo inteiro
        )}
        style={collapsed ? { objectPosition: 'left center' } : undefined}
      />
    </button>
  );
}
