import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import PageContainer from '@/components/ui/PageContainer';
import { DirectorFiltersProvider } from '@/components/dashboard/DirectorFilters';
import DirectorFilterBar from '@/components/dashboard/DirectorFilterBar';
import ExecutiveHeader from '@/components/dashboard/executive/ExecutiveHeader';
import ExecutiveSummary from '@/components/dashboard/executive/ExecutiveSummary';
import ManagementDiagnosis from '@/components/dashboard/executive/ManagementDiagnosis';
import StrategicActionsPanel from '@/components/dashboard/executive/StrategicActionsPanel';
import RecentExecutiveEvents from '@/components/dashboard/executive/RecentExecutiveEvents';
import RepPerformancePanel from '@/components/dashboard/RepPerformancePanel';
import GroupPerformancePanel from '@/components/dashboard/GroupPerformancePanel';
import CommercialFunnel from '@/components/dashboard/CommercialFunnel';
import PipelineGargalos from '@/components/dashboard/PipelineGargalos';
import RiskPanel from '@/components/dashboard/RiskPanel';
import PanoramaGlobal from '@/components/dashboard/PanoramaGlobal';
import UFDistributionPanel from '@/components/dashboard/UFDistributionPanel';
import type { ExecutivePeriod } from '@/hooks/useExecutiveSummary';

function Section({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.section>
  );
}

// Sala de Comando Gerencial (Diretor e — com global=true — Diretor Geral).
// Página única: header → KPIs → diagnóstico → performance → funil → operação →
// riscos → ações → eventos. Escopo por grupo é aplicado nos hooks/DB (não no visual).
export default function DirectorExecutiveDashboard({ global = false }: { global?: boolean }) {
  const qc = useQueryClient();
  const [period, setPeriod] = useState<ExecutivePeriod>({ periodo: 'mes', ano: new Date().getFullYear() });
  const [atualizadoEm, setAtualizadoEm] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    await qc.invalidateQueries();
    setAtualizadoEm(new Date());
    setTimeout(() => setRefreshing(false), 600);
  }

  return (
    <PageContainer>
      <DirectorFiltersProvider>
        <div className="space-y-3">
          <Section><ExecutiveHeader period={period} onPeriodChange={setPeriod} onRefresh={refresh} atualizadoEm={atualizadoEm} refreshing={refreshing} global={global} /></Section>
          <Section delay={0.03}><ExecutiveSummary period={period} /></Section>
          <Section delay={0.05}><ManagementDiagnosis period={period} /></Section>

          {/* Performance dos representantes — o centro da visão gerencial */}
          <Section delay={0.07}><RepPerformancePanel /></Section>

          {/* Grupo de cliente + funil comercial */}
          <Section delay={0.09}>
            <div className="grid gap-3 lg:grid-cols-2">
              <GroupPerformancePanel />
              <CommercialFunnel />
            </div>
          </Section>

          {/* Diretor Geral: comparativos globais */}
          {global && (
            <Section delay={0.10}>
              <div className="grid gap-3 lg:grid-cols-2">
                <PanoramaGlobal />
                <UFDistributionPanel />
              </div>
            </Section>
          )}

          {/* Operação (filtrável por grupo/rep/UF dentro do escopo) */}
          <Section delay={0.11}><DirectorFilterBar /></Section>
          <Section delay={0.12}><PipelineGargalos /></Section>
          <Section delay={0.13}><RiskPanel /></Section>

          {/* Ação + eventos */}
          <Section delay={0.14}>
            <div className="grid gap-3 lg:grid-cols-2">
              <StrategicActionsPanel period={period} />
              <RecentExecutiveEvents />
            </div>
          </Section>
        </div>
      </DirectorFiltersProvider>
    </PageContainer>
  );
}
