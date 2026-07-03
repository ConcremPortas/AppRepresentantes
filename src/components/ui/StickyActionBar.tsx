import { type ReactNode } from 'react';
import { cn } from '@/utils/cn';

// Barra de ações fixa no rodapé. Posição/safe-area/offset da MobileNav e da
// Sidebar vêm da classe `.app-sticky-bar` (index.css), que usa os tokens
// --nav-h / --sidebar-w / --safe-bottom. Uma única fonte de verdade.
//
// Lembre de reservar espaço no conteúdo: <PageContainer bottomBar>.
export default function StickyActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'app-sticky-bar bg-white/95 backdrop-blur border-t border-gray-200',
        'px-4 sm:px-6 py-3',
        className,
      )}
    >
      <div className="mx-auto w-full max-w-7xl min-w-0">{children}</div>
    </div>
  );
}
