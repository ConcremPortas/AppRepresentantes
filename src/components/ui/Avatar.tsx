import { useState, useEffect } from 'react';
import { cn } from '@/utils/cn';

interface AvatarProps {
  nome: string;                   // gera as iniciais e o alt
  avatarUrl?: string | null;      // URL da foto, se houver
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  bgColor?: string;               // cor de fundo das iniciais (classe Tailwind)
}

const SIZES: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-20 h-20 text-2xl',
};

/**
 * Avatar do usuário: mostra a foto se houver `avatarUrl`, senão cai para as
 * iniciais do nome. Se a imagem falhar ao carregar (onError), também cai para
 * as iniciais — fallback robusto usado em Perfil, Sidebar, Header e cards.
 */
export default function Avatar({
  nome,
  avatarUrl,
  size = 'md',
  className,
  bgColor = 'bg-[hsl(142,93%,8%)]',
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  // Reseta o erro quando a URL muda (ex.: após trocar a foto).
  useEffect(() => { setImgError(false); }, [avatarUrl]);

  const initials =
    (nome || 'U')
      .split(' ')
      .filter(Boolean)
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={nome}
        onError={() => setImgError(true)}
        className={cn('rounded-full object-cover flex-shrink-0', SIZES[size], className)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={nome}
      className={cn(
        'rounded-full flex items-center justify-center text-white font-bold flex-shrink-0',
        SIZES[size],
        bgColor,
        className,
      )}
    >
      {initials}
    </div>
  );
}
