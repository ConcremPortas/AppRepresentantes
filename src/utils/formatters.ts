export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

export const formatCurrencyK = (value: number) =>
  value >= 1000
    ? `R$ ${(value / 1000).toFixed(1).replace('.', ',')}k`
    : formatCurrency(value);

/**
 * Formata data para pt-BR no fuso de Brasília (America/Sao_Paulo).
 * Strings "YYYY-MM-DD" são tratadas como data local para evitar
 * a interpretação como UTC midnight (que causaria d-1 em UTC-3).
 */
export const formatDate = (date: string | Date): string => {
  if (!date) return '';
  let d: Date;
  if (typeof date === 'string') {
    // "YYYY-MM-DD" sem hora → adiciona T12:00 para evitar UTC offset
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      d = new Date(`${date}T12:00:00`);
    } else {
      d = new Date(date);
    }
  } else {
    d = date;
  }
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
  }).format(d);
};

export const formatDateLong = (date: Date) =>
  new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);

export const formatPercent = (value: number, decimals = 0) =>
  `${value.toFixed(decimals).replace('.', ',')}%`;

export const STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  em_analise: 'Em Análise',
  aprovado: 'Aprovado',
  devolvido: 'Devolvido',
  perdido: 'Perdido',
  liberado:   'Liberado',
  mapeamento: 'Mapeamento',
  ferragem:   'Ferragem',
  comercial:  'Comercial',
  producao:   'Produção',
  faturado:   'Faturado',
  entrega:    'Entrega',
  finalizado: 'Finalizado',
};

export const PEDIDO_STATUS_STEPS = [
  'aprovado', 'mapeamento', 'ferragem',
  'producao', 'faturado', 'entrega', 'finalizado'
] as const;

export type PedidoStatusStep = typeof PEDIDO_STATUS_STEPS[number];
