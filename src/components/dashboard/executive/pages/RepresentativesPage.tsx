import RepPerformancePanel from '@/components/dashboard/RepPerformancePanel';
import type { ExecutivePeriod } from '@/hooks/useExecutiveSummary';

// Página 2 — Representantes: "Quem está performando e quem precisa de cobrança?"
// O RepPerformancePanel já entrega Top Performance + Atenção Necessária +
// scoreboard filtrável + drawer de detalhe (desktop/mobile).
export default function RepresentativesPage({ period }: { period: ExecutivePeriod }) {
  return <RepPerformancePanel period={period} />;
}
