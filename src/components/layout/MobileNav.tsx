import { NavLink } from 'react-router-dom';
import {
  LayoutGrid,
  ClipboardList,
  PackageSearch,
  Building2,
  UserCircle,
  ClipboardCheck,
  Bell,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import { useAlertas } from '@/hooks/useAlertas';

// Itens por perfil. A aba Alertas é o centro de notificações inteligentes;
// o Perfil (com o Sair) segue acessível pela própria aba Perfil.
const REP_ITEMS = [
  { to: '/dashboard',  label: 'Início',     icon: LayoutGrid    },
  { to: '/orcamentos', label: 'Orçamentos', icon: ClipboardList },
  { to: '/pedidos',    label: 'Pedidos',    icon: PackageSearch },
  { to: '/clientes',   label: 'Carteira',   icon: Building2     },
  { to: '/alertas',    label: 'Alertas',    icon: Bell          },
  { to: '/perfil',     label: 'Perfil',     icon: UserCircle    },
];

const OPERADOR_ITEMS = [
  { to: '/dashboard',  label: 'Início',     icon: LayoutGrid     },
  { to: '/aprovacoes', label: 'Aprovações', icon: ClipboardCheck },
  { to: '/pedidos',    label: 'Pedidos',    icon: PackageSearch  },
  { to: '/alertas',    label: 'Alertas',    icon: Bell           },
  { to: '/perfil',     label: 'Perfil',     icon: UserCircle     },
];

export default function MobileNav() {
  const { user } = useAuth();
  const { unreadCount } = useAlertas();
  const isOperadorOnly = !!user?.usuario?.operador && !user?.usuario?.admin;
  const NAV_ITEMS = isOperadorOnly ? OPERADOR_ITEMS : REP_ITEMS;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30"
         style={{ background: 'hsl(142,93%,8%)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-stretch h-16">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center flex-1 gap-1 text-[10px] font-medium transition-all min-w-0',
                isActive
                  ? 'text-white opacity-100'
                  : 'text-white opacity-50'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  'relative flex items-center justify-center w-8 h-8 rounded-xl transition-all',
                  isActive ? 'bg-white/20' : '',
                )}>
                  <Icon className={cn('w-5 h-5', isActive ? 'stroke-[2.5]' : 'stroke-[1.5]')} />
                  {to === '/alertas' && unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-1 min-w-[15px] h-[15px] px-0.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center tabular-nums border border-[hsl(142,93%,8%)]">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className="truncate max-w-full px-0.5">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
