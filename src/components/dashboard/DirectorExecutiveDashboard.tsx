import ExecutiveDashboardPager from '@/components/dashboard/executive/ExecutiveDashboardPager';

// Sala de Comando Gerencial (Diretor e — com global=true — Diretor Geral).
// Dashboard executivo PAGINADO: Geral · Representantes · Grupos · Operação · Riscos.
// Cada visão é uma página objetiva; escopo por grupo aplicado nos hooks/DB.
export default function DirectorExecutiveDashboard({ global = false }: { global?: boolean }) {
  return <ExecutiveDashboardPager global={global} />;
}
