import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import OrcamentosPage from '@/pages/OrcamentosPage';
import PedidosPage from '@/pages/PedidosPage';
import ClientesPage from '@/pages/ClientesPage';
import FinanceiroPage from '@/pages/FinanceiroPage';
import PerfilPage from '@/pages/PerfilPage';
import AlertasPage from '@/pages/AlertasPage';
import AprovacoesPage from '@/pages/AprovacoesPage';
import NovoOrcamentoPage from '@/pages/NovoOrcamentoPage';
import EditarOrcamentoPage from '@/pages/EditarOrcamentoPage';
import AdminRepresentantesPage from '@/pages/admin/RepresentantesPage';
import AdminUsuariosPage from '@/pages/admin/UsuariosPage';
import AcompanhamentoPage from '@/pages/AcompanhamentoPage';
import Layout from '@/components/layout/Layout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

// ─── Guard: só admins ────────────────────────────────────
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user?.usuario?.admin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// ─── Guard: operadores e admins (página de aprovações) ───
function OperadorRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const ok = user?.usuario?.admin || user?.usuario?.operador;
  if (!ok) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// ─── Guard: representantes (não acessível para operador puro) ─
function RepRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isOperadorOnly = user?.usuario?.operador && !user?.usuario?.admin;
  if (isOperadorOnly) return <Navigate to="/aprovacoes" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Login renderiza em qualquer caminho SEM redirecionar para /login —
    // a URL permanece limpa (ex.: raiz do domínio) e o caminho de destino
    // é preservado até depois do login.
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* Compartilhadas */}
        <Route path="dashboard"  element={<DashboardPage />} />
        <Route path="pedidos"    element={<PedidosPage />} />
        <Route path="perfil"     element={<PerfilPage />} />
        <Route path="alertas"    element={<AlertasPage />} />

        {/* Operador + Admin */}
        <Route path="aprovacoes" element={<OperadorRoute><AprovacoesPage /></OperadorRoute>} />

        {/* Apenas representantes */}
        <Route path="orcamentos"       element={<RepRoute><OrcamentosPage /></RepRoute>} />
        <Route path="orcamentos/novo"       element={<RepRoute><NovoOrcamentoPage /></RepRoute>} />
        <Route path="orcamentos/:id/editar" element={<RepRoute><EditarOrcamentoPage /></RepRoute>} />
        <Route path="acompanhamento" element={<RepRoute><AcompanhamentoPage /></RepRoute>} />
        <Route path="clientes"   element={<RepRoute><ClientesPage /></RepRoute>} />
        <Route path="financeiro" element={<RepRoute><FinanceiroPage /></RepRoute>} />

        {/* Apenas admin */}
        <Route path="admin/representantes" element={<AdminRoute><AdminRepresentantesPage /></AdminRoute>} />
        <Route path="admin/usuarios"       element={<AdminRoute><AdminUsuariosPage /></AdminRoute>} />
      </Route>
      {/* Já autenticado: qualquer rota desconhecida (inclusive /login) → dashboard */}
      <Route path="*"      element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* MemoryRouter: navegação em memória — a barra de endereço não expõe as
          telas (fica só o domínio). Trade-off: voltar/atualizar do navegador não
          navegam dentro do app e não há deep-link externo por URL. */}
      <MemoryRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
