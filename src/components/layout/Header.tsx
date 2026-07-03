import { Menu, Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAlertas } from '@/hooks/useAlertas';
import { useSidebar } from './SidebarContext';
import { useLocation, Link } from 'react-router-dom';
import Avatar from '@/components/ui/Avatar';

interface HeaderProps {
  onMenuClick: () => void;
}

// Mapeia rota para o título exibido no header (como no sistema de faturamento)
const ROUTE_TITLES: Record<string, string> = {
  '/dashboard':   'Dashboard',
  '/orcamentos':  'Orçamentos',
  '/aprovacoes':  'Aprovações',
  '/pedidos':     'Pedidos',
  '/clientes':    'Carteira de Clientes',
  '/financeiro':  'Financeiro',
  '/perfil':      'Meu Perfil',
  '/alertas':     'Alertas',
};

export default function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuth();
  const { isCollapsed } = useSidebar();
  const location = useLocation();

  // O Header é o "dono" das notificações: detecta novos alertas, dispara
  // som/vibração/banner (notificar: true) e mantém o badge do app atualizado.
  const { unreadCount } = useAlertas({ notificar: true });

  const nome = user?.usuario?.nome ?? user?.representante?.nome ?? 'Usuário';
  const avatarUrl = user?.usuario?.avatar_url ?? null;

  // Título baseado na rota atual
  const currentTitle = Object.entries(ROUTE_TITLES).find(([path]) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  )?.[1] ?? 'Portal do Representante';

  void isCollapsed;

  return (
    <header
      className="bg-[#0D2012] lg:bg-white border-b border-[#1a4025] lg:border-gray-200 flex-shrink-0"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Hamburger mobile */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-1 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Título: "PORTAL DO REPRESENTANTE · Página" */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold tracking-[0.12em] text-white/50 lg:text-gray-400 uppercase hidden sm:block">
              Portal do Representante
            </span>
            <span className="text-white/30 lg:text-gray-300 hidden sm:block">·</span>
            <span className="text-[13px] font-semibold text-white lg:text-gray-800 tracking-tight">
              {currentTitle}
            </span>
          </div>
        </div>

        {/* Sino (indica novos alertas — a gestão acontece em /alertas) + avatar */}
        <div className="flex items-center gap-2">
          <Link
            to="/alertas"
            title="Alertas"
            className="relative p-1.5 rounded-lg text-white/60 hover:bg-white/10 hover:text-white lg:text-gray-400 lg:hover:bg-gray-100 lg:hover:text-gray-600 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center tabular-nums">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          {/* Avatar */}
          <Avatar nome={nome} avatarUrl={avatarUrl} size="sm" bgColor="bg-white/20 lg:bg-[#0D2012]" />
        </div>
      </div>
    </header>
  );
}
