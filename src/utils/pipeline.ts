import type { PedidoAcompanhamento } from '@/services/acompanhamento';

const DAY = 86_400_000;
export const FATURADO_ALEM = new Set(['faturado', 'entrega', 'finalizado']);

/** Converte 'YYYY-MM-DD...' em Date (meio-dia local p/ evitar fuso). */
export function parseAppDate(d?: string | null): Date | null {
  if (!d) return null;
  const s = d.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T12:00:00`) : null;
}

export function classifyAnexo(t: string): 'nf' | 'boleto' | 'outro' {
  const s = (t ?? '').toLowerCase();
  if (s.includes('boleto')) return 'boleto';
  if (s.includes('nota') || s.includes('nf') || s.includes('fiscal')) return 'nf';
  return 'outro';
}

export interface Gargalos {
  counts: Record<string, number>;  // pedidos por etapa (status app)
  parados: number;                 // > 7 dias na etapa atual (exceto finalizado)
  atrasados: number;               // previsão de embarque vencida (exceto finalizado)
  docs: number;                    // faturado+ sem NF ou sem boleto
}

// Gargalos operacionais de um conjunto de pedidos (já escopados/filtrados).
export function computeGargalos(pedidos: PedidoAcompanhamento[]): Gargalos {
  const counts: Record<string, number> = {};
  let parados = 0, atrasados = 0, docs = 0;
  const hoje = new Date();
  for (const p of pedidos) {
    counts[p.status] = (counts[p.status] ?? 0) + 1;
    if (p.status !== 'finalizado') {
      const base = parseAppDate(p.status_updated_at ?? p.data_emissao);
      if (base && (hoje.getTime() - base.getTime()) / DAY > 7) parados++;
      const emb = parseAppDate(p.previsao_embarque);
      if (emb && emb < hoje) atrasados++;
    }
    if (FATURADO_ALEM.has(p.status)) {
      const anexos = p.anexos ?? [];
      const nf = anexos.some(a => classifyAnexo(a.tipo) === 'nf');
      const bol = anexos.some(a => classifyAnexo(a.tipo) === 'boleto');
      if (!nf || !bol) docs++;
    }
  }
  return { counts, parados, atrasados, docs };
}
