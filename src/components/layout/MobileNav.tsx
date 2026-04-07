import { NavLink } from 'react-router-dom';
import {
  LayoutGrid,
  ClipboardList,
  PackageSearch,
  Building2,
  Banknote,
} from 'lucide-react';
import { cn } from '@/utils/cn';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard',  icon: LayoutGrid    },
  { to: '/orcamentos', label: 'Orçamentos', icon: ClipboardList },
  { to: '/pedidos',    label: 'Pedidos',    icon: PackageSearch },
  { to: '/clientes',   label: 'Carteira',   icon: Building2     },
  { to: '/financeiro', label: 'Financeiro', icon: Banknote      },
];

export default function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 safe-area-pb"
         style={{ background: 'hsl(142,93%,8%)' }}>
      <div className="flex items-stretch h-16">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center flex-1 gap-1 text-[10px] font-medium transition-all',
                isActive
                  ? 'text-white opacity-100'
                  : 'text-white opacity-50'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-xl transition-all',
                  isActive ? 'bg-white/20' : '',
                )}>
                  <Icon className={cn('w-5 h-5', isActive ? 'stroke-[2.5]' : 'stroke-[1.5]')} />
                </div>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
