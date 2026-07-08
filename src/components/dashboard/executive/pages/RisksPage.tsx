import RiskPanel from '@/components/dashboard/RiskPanel';
import StrategicActionsPanel from '@/components/dashboard/executive/StrategicActionsPanel';
import RecentExecutiveEvents from '@/components/dashboard/executive/RecentExecutiveEvents';
import type { ExecutivePeriod } from '@/hooks/useExecutiveSummary';

// Página 5 — Riscos: "O que preciso cobrar hoje?"
export default function RisksPage({ period }: { period: ExecutivePeriod }) {
  return (
    <>
      <RiskPanel />
      <div className="grid gap-3 lg:grid-cols-2">
        <StrategicActionsPanel period={period} />
        <RecentExecutiveEvents />
      </div>
    </>
  );
}
