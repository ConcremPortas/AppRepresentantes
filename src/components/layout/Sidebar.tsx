import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  Users,
  DollarSign,
  UserCircle,
  ClipboardCheck,
  ChevronDown,
  ChevronRight,
  LogOut,
  X,
  ShieldCheck,
  UsersRound,
  Layers,
  Briefcase,
  Activity,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useSidebar } from './SidebarContext';
import { useAuth } from '@/hooks/useAuth';
import { perfilDoUsuario, PERFIL_LABEL } from '@/constants/perfis';
import { useAlertas } from '@/hooks/useAlertas';
import ConcremLogo from './ConcremLogo';
import Avatar from '@/components/ui/Avatar';
import { Bell } from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

// ─── Tooltip para itens colapsados ───────────────────────────────────────────
function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group/tip">
      {children}
      <div className={cn(
        'pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50',
        'px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shadow-lg',
        'bg-gray-900 text-white',
        'opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150',
        'before:content-[""] before:absolute before:right-full before:top-1/2 before:-translate-y-1/2',
        'before:border-[5px] before:border-transparent before:border-r-gray-900'
      )}>
        {label}
      </div>
    </div>
  );
}

// ─── Estrutura de navegação ───────────────────────────────────────────────────
const SINGLE_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/alertas',   label: 'Alertas',   icon: Bell },
];

const REP_GROUPS = [
  {
    key: 'operacional',
    label: 'Operacional',
    icon: ShoppingCart,
    items: [
      { to: '/orcamentos',      label: 'Orçamentos',          icon: FileText       },
      { to: '/pedidos',         label: 'Pedidos',              icon: ShoppingCart   },
      { to: '/acompanhamento',  label: 'Acompanhamento',       icon: Activity       },
      { to: '/clientes',        label: 'Carteira de Clientes', icon: Users          },
      { to: '/financeiro',      label: 'Financeiro',           icon: DollarSign     },
    ],
  },
  {
    key: 'cadastro',
    label: 'Cadastro',
    icon: UserCircle,
    items: [
      { to: '/perfil', label: 'Meu Perfil', icon: UserCircle },
    ],
  },
];

const OPERADOR_GROUPS = [
  {
    key: 'operacional',
    label: 'Operacional',
    icon: ClipboardCheck,
    items: [
      { to: '/aprovacoes', label: 'Aprovações', icon: ClipboardCheck },
      { to: '/pedidos',    label: 'Pedidos',    icon: ShoppingCart   },
    ],
  },
  {
    key: 'cadastro',
    label: 'Cadastro',
    icon: UserCircle,
    items: [
      { to: '/perfil', label: 'Meu Perfil', icon: UserCircle },
    ],
  },
];

const ADMIN_GROUPS = [
  {
    key: 'operacional',
    label: 'Operacional',
    icon: ShoppingCart,
    items: [
      { to: '/orcamentos',     label: 'Orçamentos',          icon: FileText       },
      { to: '/aprovacoes',     label: 'Aprovações',           icon: ClipboardCheck },
      { to: '/pedidos',        label: 'Pedidos',              icon: ShoppingCart   },
      { to: '/acompanhamento', label: 'Acompanhamento',       icon: Activity       },
      { to: '/clientes',       label: 'Carteira de Clientes', icon: Users          },
      { to: '/financeiro',     label: 'Financeiro',           icon: DollarSign     },
    ],
  },
  {
    key: 'gestao',
    label: 'Gestão',
    icon: Briefcase,
    items: [
      { to: '/admin/representantes', label: 'Representantes', icon: UsersRound },
      { to: '/admin/usuarios',       label: 'Usuários',       icon: ShieldCheck },
      { to: '/admin/grupos',         label: 'Grupos',         icon: Layers },
    ],
  },
  {
    key: 'cadastro',
    label: 'Cadastro',
    icon: UserCircle,
    items: [
      { to: '/perfil', label: 'Meu Perfil', icon: UserCircle },
    ],
  },
];

// ─── Sidebar ─────────────────────────────────────────────────────────────────
export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const { isCollapsed, toggle } = useSidebar();
  const { user, logout } = useAuth();
  const { unreadCount } = useAlertas();
  const location = useLocation();

  const perfil = perfilDoUsuario(user?.usuario);
  const isAdmin    = perfil === 'admin' || perfil === 'diretor_geral'; // menu completo
  const isOperador = perfil === 'operador';
  const isDiretor  = perfil === 'diretor';
  const rawGroups = isAdmin ? ADMIN_GROUPS : isOperador ? OPERADOR_GROUPS : REP_GROUPS;
  // Seção "Gestão" (Representantes/Usuários/Grupos) é exclusiva do Administrador.
  const GROUPS = perfil === 'admin' ? rawGroups : rawGroups.filter(g => g.key !== 'gestao');

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    operacional: true,
    gestao: true,
    cadastro: true,
  });

  function toggleGroup(key: string) {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function isActive(to: string) {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  }

  function groupHasActive(items: { to: string }[]) {
    return items.some(i => isActive(i.to));
  }

  const nome = user?.usuario?.nome ?? user?.representante?.nome ?? 'Usuário';
  const avatarUrl = user?.usuario?.avatar_url ?? null;
  const avatarBg = isAdmin ? 'bg-amber-600' : isOperador ? 'bg-sky-600' : isDiretor ? 'bg-indigo-600' : 'bg-[#1a4025]';
  const emailLabel = user?.email?.split('@')[0] ?? 'portal';


  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex flex-col',
          'bg-[#0D2012]',
          'transition-all duration-300 ease-in-out overflow-hidden',
          isCollapsed ? 'w-16' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          'lg:relative lg:translate-x-0',
          // No mobile, reserva o espaço da barra inferior (MobileNav, h-16) para
          // que o rodapé com "Sair" não fique escondido atrás dela.
          'pb-[calc(4rem+env(safe-area-inset-bottom,0px))] lg:pb-0',
        )}
      >
        {/* ── Logo + X ── */}
        <div className={cn(
          'flex items-center border-b border-white/8 flex-shrink-0 transition-all duration-300',
          isCollapsed ? 'px-3 py-4 justify-center' : 'px-4 py-4'
        )}>
          <ConcremLogo collapsed={isCollapsed} onClick={toggle} />
          {!isCollapsed && (
            <button
              onClick={onMobileClose}
              className="lg:hidden ml-auto text-white/40 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Badge de papel */}
        {perfil !== 'representante' && !isCollapsed && (
          <div className="px-4 py-2 border-b border-white/8">
            <span className={cn(
              'flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider',
              isAdmin ? 'text-amber-400' : isOperador ? 'text-sky-400' : 'text-indigo-300',
            )}>
              <ShieldCheck className="w-3 h-3" />
              {PERFIL_LABEL[perfil]}
            </span>
          </div>
        )}

        {/* ── Navegação ── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">

          {/* Itens simples (Dashboard) */}
          {SINGLE_ITEMS.map(({ to, label, icon: Icon }) => {
            const active = isActive(to);
            const btn = (
              <NavLink
                key={to}
                to={to}
                onClick={onMobileClose}
                className={cn(
                  'flex items-center w-full text-[13px] font-medium transition-all duration-150 mx-1',
                  isCollapsed
                    ? 'justify-center h-10 w-10 rounded-lg'
                    : 'gap-2.5 px-3 py-2 rounded-lg',
                  active
                    ? 'bg-[#1a4025] text-white'
                    : 'text-white/60 hover:bg-white/8 hover:text-white'
                )}
              >
                <span className="relative flex-shrink-0">
                  <Icon className="w-[18px] h-[18px]" />
                  {to === '/alertas' && unreadCount > 0 && isCollapsed && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </span>
                {!isCollapsed && <span className="truncate flex-1">{label}</span>}
                {!isCollapsed && to === '/alertas' && unreadCount > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center tabular-nums flex-shrink-0">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </NavLink>
            );

            return isCollapsed ? (
              <div key={to} className="px-1.5 py-0.5">
                <Tooltip label={label}>{btn}</Tooltip>
              </div>
            ) : (
              <div key={to} className="px-1 py-0.5">{btn}</div>
            );
          })}

          {/* Grupos colapsáveis */}
          {GROUPS.map(group => {
            const isOpen = openGroups[group.key];
            const hasActive = groupHasActive(group.items);

            return (
              <div key={group.key} className="mt-1">
                {isCollapsed ? (
                  <Tooltip label={group.label}>
                    <div className="px-1.5 py-0.5">
                      <button
                        onClick={() => toggleGroup(group.key)}
                        className={cn(
                          'flex items-center justify-center h-10 w-10 mx-auto rounded-lg transition-all',
                          hasActive ? 'text-white' : 'text-white/35 hover:text-white/60'
                        )}
                      >
                        <group.icon className="w-[18px] h-[18px]" />
                      </button>
                    </div>
                  </Tooltip>
                ) : (
                  <button
                    onClick={() => toggleGroup(group.key)}
                    className={cn(
                      'flex items-center w-full px-4 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                      hasActive ? 'text-white/80' : 'text-white/35 hover:text-white/55'
                    )}
                  >
                    <group.icon className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                    <span className="flex-1 text-left">{group.label}</span>
                    {isOpen
                      ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
                      : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                    }
                  </button>
                )}

                {(isCollapsed || isOpen) && (
                  <div className={cn(isCollapsed ? '' : 'ml-2')}>
                    {group.items.map(({ to, label, icon: Icon }) => {
                      const active = isActive(to);
                      const btn = (
                        <NavLink
                          to={to}
                          onClick={onMobileClose}
                          className={cn(
                            'flex items-center w-full text-[13px] font-medium transition-all duration-150',
                            isCollapsed
                              ? 'justify-center h-10 w-10 mx-auto rounded-lg'
                              : 'gap-2.5 px-3 py-[7px] rounded-lg',
                            active
                              ? 'bg-[#1a4025] text-white'
                              : 'text-white/60 hover:bg-white/8 hover:text-white'
                          )}
                        >
                          <Icon className="w-[17px] h-[17px] flex-shrink-0" />
                          {!isCollapsed && <span className="truncate">{label}</span>}
                        </NavLink>
                      );

                      return isCollapsed ? (
                        <div key={to} className="px-1.5 py-0.5">
                          <Tooltip label={label}>{btn}</Tooltip>
                        </div>
                      ) : (
                        <div key={to} className="px-1 py-0.5">{btn}</div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* ── Rodapé: usuário + logout ── */}
        <div className={cn(
          'border-t border-white/8 flex-shrink-0 transition-all duration-300',
          isCollapsed ? 'px-2 py-3' : 'px-3 py-3'
        )}>
          {isCollapsed ? (
            <Tooltip label={`${nome} · Sair`}>
              <button
                onClick={logout}
                className="flex items-center justify-center w-10 h-10 mx-auto rounded-lg text-white/50 hover:text-white hover:bg-white/8 transition-all"
              >
                <Avatar nome={nome} avatarUrl={avatarUrl} size="sm" bgColor={avatarBg} />
              </button>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-2.5">
              <Avatar nome={nome} avatarUrl={avatarUrl} size="sm" bgColor={avatarBg} className="w-8 h-8" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-[12px] font-semibold leading-tight truncate">
                  {nome.split(' ')[0]}
                </p>
                <p className="text-white/40 text-[10px] leading-tight truncate">
                  {emailLabel}
                </p>
              </div>
              <button
                onClick={logout}
                className="flex-shrink-0 text-white/30 hover:text-white/70 transition-colors p-1 rounded"
                title="Sair"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
