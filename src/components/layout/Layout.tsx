import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileNav from './MobileNav';
import { SidebarProvider } from './SidebarContext';
import { useState } from 'react';

function LayoutInner() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    // h-dvh: usa a altura REAL da viewport no mobile (sem o bug da barra do navegador)
    <div className="flex h-dvh bg-gray-50 overflow-hidden">
      {/* Sidebar (gerencia próprio overlay mobile) */}
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main className="app-main-scroll flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileNav />
    </div>
  );
}

export default function Layout() {
  return (
    <SidebarProvider>
      <LayoutInner />
    </SidebarProvider>
  );
}
