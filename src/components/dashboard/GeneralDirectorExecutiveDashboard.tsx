import DirectorExecutiveDashboard from '@/components/dashboard/DirectorExecutiveDashboard';

// Diretor Geral: mesma Sala de Comando, com visão global (todos os grupos/reps)
// + comparativos globais (Panorama, distribuição por UF).
export default function GeneralDirectorExecutiveDashboard() {
  return <DirectorExecutiveDashboard global />;
}
