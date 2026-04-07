import { Menu, Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { mockNotificacoes } from '@/data/mockData';
import { useState } from 'react';
import { formatDate } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import { useSidebar } from './SidebarContext';
import { useLocation } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
}

const TIPO_COLORS: Record<string, string> = {
  orcamento: 'bg-blue-100 text-blue-700',
  pedido: 'bg-green-100 text-green-700',
  financeiro: 'bg-yellow-100 text-yellow-700',
  sistema: 'bg-gray-100 text-gray-700',
  cliente: 'bg-purple-100 text-purple-700',
};

// Mapeia rota para o título exibido no header (como no sistema de faturamento)
const ROUTE_TITLES: Record<string, string> = {
  '/dashboard':   'Dashboard',
  '/orcamentos':  'Orçamentos',
  '/aprovacoes':  'Aprovações',
  '/pedidos':     'Pedidos',
  '/clientes':    'Carteira de Clientes',
  '/financeiro':  'Financeiro',
  '/perfil':      'Meu Perfil',
};

export default function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuth();
  const { isCollapsed } = useSidebar();
  const location = useLocation();
  const [showNotifs, setShowNotifs] = useState(false);

  const notifs = mockNotificacoes.filter(n => n.representante_id === user?.id);
  const unread = notifs.filter(n => !n.lida).length;

  const rep = user?.representante;
  const initials = rep?.nome
    ? rep.nome.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  // Título baseado na rota atual
  const currentTitle = Object.entries(ROUTE_TITLES).find(([path]) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  )?.[1] ?? 'Portal do Representante';

  return (
    <header className="bg-[#0D2012] lg:bg-white border-b border-[#1a4025] lg:border-gray-200 flex-shrink-0">
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

        {/* Notificações + avatar */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-1.5 rounded-lg text-white/60 hover:bg-white/10 hover:text-white lg:text-gray-400 lg:hover:bg-gray-100 lg:hover:text-gray-600 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unread > 0 && (
                <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {showNotifs && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowNotifs(false)} />
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-gray-900">Notificações</h3>
                    {unread > 0 && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                        {unread} novas
                      </span>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                    {notifs.length === 0 ? (
                      <p className="text-sm text-gray-400 px-4 py-8 text-center">Nenhuma notificação</p>
                    ) : (
                      notifs.slice(0, 8).map(n => (
                        <div
                          key={n.id}
                          className={cn(
                            'px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer',
                            !n.lida && 'bg-blue-50/40'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-semibold mt-0.5 flex-shrink-0 uppercase', TIPO_COLORS[n.tipo])}>
                              {n.tipo.slice(0, 3)}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className={cn('text-xs text-gray-900', !n.lida ? 'font-semibold' : 'font-medium')}>
                                {n.titulo}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.mensagem}</p>
                              <p className="text-[10px] text-gray-400 mt-1">{formatDate(n.created_at)}</p>
                            </div>
                            {!n.lida && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 flex-shrink-0" />}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Avatar */}
          <div className="w-7 h-7 rounded-full bg-white/20 lg:bg-[#0D2012] flex items-center justify-center text-white text-[10px] font-bold">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
