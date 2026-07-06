import { type ReactNode } from 'react';
import { cn } from '@/utils/cn';

// Rodapé de ações do card: chips/documentos à esquerda, ação principal à direita.
// Fica com um separador sutil no topo. Botões devem ter área de toque confortável.
export default function CardActionFooter({
  left, right, className,
}: {
  left?: ReactNode;    // chips de documentos / status
  right?: ReactNode;   // botão principal / secundário
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50/40', className)}>
      <div className="flex items-center gap-1.5 flex-wrap min-w-0">{left}</div>
      <div className="flex items-center gap-2 flex-shrink-0">{right}</div>
    </div>
  );
}
