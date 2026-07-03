// ─────────────────────────────────────────────────────────────────────────────
// Helpers da Central de Pedidos: mapeia os 9 status do pipeline em 5 etapas
// da jornada (Aprovado → Produção → Faturado → Em rota → Entregue), calcula
// situação documental (NF/boleto) e derivações usadas por KPIs, filtros e views.
// ─────────────────────────────────────────────────────────────────────────────
import { CheckCircle2, Factory, FileCheck2, Truck, PackageCheck, type LucideIcon } from 'lucide-react';
import type { PedidoVenda } from '@/types';
import { getPedidoItens } from '@/services/pedidosVenda';

export type Etapa = 'aprovado' | 'producao' | 'faturado' | 'rota' | 'entregue';

export const ETAPAS: { key: Etapa; label: string; icon: LucideIcon; color: string }[] = [
  { key: 'aprovado', label: 'Aprovado',  icon: CheckCircle2, color: '#3b82f6' },
  { key: 'producao', label: 'Produção',  icon: Factory,      color: '#f59e0b' },
  { key: 'faturado', label: 'Faturado',  icon: FileCheck2,   color: '#14b8a6' },
  { key: 'rota',     label: 'Em rota',   icon: Truck,        color: '#0ea5e9' },
  { key: 'entregue', label: 'Entregue',  icon: PackageCheck, color: '#22c55e' },
];

export const ETAPA_META = Object.fromEntries(
  ETAPAS.map((e, i) => [e.key, { ...e, index: i }]),
) as Record<Etapa, { key: Etapa; label: string; icon: LucideIcon; color: string; index: number }>;

// Mapeia o status_pipeline (9 estágios) → etapa da jornada (5)
const STATUS_TO_ETAPA: Record<string, Etapa> = {
  aprovado: 'aprovado', liberado: 'aprovado',
  mapeamento: 'producao', ferragem: 'producao', comercial: 'producao', producao: 'producao',
  faturado: 'faturado',
  entrega: 'rota',
  finalizado: 'entregue',
};

export function etapaDe(pedido: PedidoVenda): Etapa {
  return STATUS_TO_ETAPA[pedido.status_pipeline ?? ''] ?? 'aprovado';
}

// ─── Documentos ──────────────────────────────────────────────────────────────
export function classifyAnexo(tipo: string): 'nf' | 'boleto' | 'outro' {
  const t = (tipo ?? '').toLowerCase();
  if (t.includes('boleto')) return 'boleto';
  if (t.includes('nota') || t.includes('nf') || t.includes('fiscal')) return 'nf';
  return 'outro';
}

export function temNF(p: PedidoVenda): boolean {
  return (p.anexos ?? []).some(a => classifyAnexo(a.tipo) === 'nf') || !!p.numero_nota;
}
export function temBoleto(p: PedidoVenda): boolean {
  return (p.anexos ?? []).some(a => classifyAnexo(a.tipo) === 'boleto');
}

/** Está numa etapa em que os documentos JÁ deveriam existir (faturado ou depois). */
export function faturadoOuAlem(p: PedidoVenda): boolean {
  return ETAPA_META[etapaDe(p)].index >= ETAPA_META.faturado.index;
}

/** Documentos pendentes: já faturado mas falta NF e/ou boleto. */
export function docsPendentes(p: PedidoVenda): boolean {
  return faturadoOuAlem(p) && (!temNF(p) || !temBoleto(p));
}

// ─── Atenção / atraso ────────────────────────────────────────────────────────
export function parseData(d?: string | null): Date | null {
  if (!d) return null;
  const s = d.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T12:00:00`) : new Date(d);
}

/** Previsão de embarque no passado e pedido ainda não entregue. */
export function emAtraso(p: PedidoVenda, hoje: Date): boolean {
  if (etapaDe(p) === 'entregue') return false;
  const emb = parseData(p.previsao_embarque);
  return !!emb && emb < hoje;
}

export function numItens(p: PedidoVenda): number {
  return getPedidoItens(p).length;
}

export function nomeCliente(p: PedidoVenda): string {
  return p.cliente_fantasia?.trim() || p.cliente_nome || 'Cliente';
}
