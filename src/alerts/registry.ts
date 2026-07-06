// ─────────────────────────────────────────────────────────────────────────────
// Registro central de tipos de alerta.
// Para adicionar um NOVO tipo: (1) adicione a chave em AlertTipo, (2) registre
// a definição em ALERT_DEFS e (3) escreva o gerador em engine.ts. Nada mais
// precisa mudar — tela, preferências, sons, badges e push funcionam sozinhos.
// ─────────────────────────────────────────────────────────────────────────────
import {
  CheckCircle2, XCircle, Hourglass, CalendarClock, UserX, Truck,
  FileText, Receipt, Target, Award, Megaphone, Sparkles,
  type LucideIcon,
} from 'lucide-react';

export type Prioridade = 'critica' | 'alta' | 'media' | 'baixa';
export type SomTipo = 'sucesso' | 'atencao' | 'erro';

export type AlertTipo =
  | 'orcamento_aprovado'
  | 'orcamento_recusado'
  | 'orcamento_parado'      // aguardando aprovação há mais de 30 dias
  | 'orcamento_expirando'   // validade próxima
  | 'cliente_recompra'      // ultrapassou a previsão média de recompra
  | 'pedido_faturado'       // NF + boleto anexados
  | 'nf_disponivel'
  | 'boleto_disponivel'
  | 'meta_atingida'
  | 'comissao_liberada'
  | 'aviso_sistema'
  | 'atualizacao';

export interface AlertDef {
  label: string;            // nome do tipo (tela de preferências)
  descricao: string;        // explicação curta (tela de preferências)
  icon: LucideIcon;
  prioridade: Prioridade;   // prioridade padrão do tipo
  som: SomTipo | null;      // som ao chegar (null = silencioso)
}

export const ALERT_DEFS: Record<AlertTipo, AlertDef> = {
  orcamento_aprovado:  { label: 'Orçamento aprovado',    descricao: 'Quando um orçamento seu é aprovado',                 icon: CheckCircle2,  prioridade: 'alta',    som: 'sucesso' },
  orcamento_recusado:  { label: 'Orçamento recusado',    descricao: 'Quando um orçamento seu é recusado',                 icon: XCircle,       prioridade: 'alta',    som: 'erro' },
  orcamento_parado:    { label: 'Orçamento aguardando',  descricao: 'Aguardando aprovação há mais de 30 dias',            icon: Hourglass,     prioridade: 'critica', som: 'atencao' },
  orcamento_expirando: { label: 'Orçamento expirando',   descricao: 'Validade da proposta próxima do fim',                icon: CalendarClock, prioridade: 'critica', som: 'atencao' },
  cliente_recompra:    { label: 'Cliente sem comprar',   descricao: 'Cliente ultrapassou o prazo padrão de recompra (30 dias)', icon: UserX,     prioridade: 'critica', som: 'atencao' },
  pedido_faturado:     { label: 'Pedido faturado',       descricao: 'Pedido com NF e boleto disponíveis',                 icon: Truck,         prioridade: 'critica', som: 'sucesso' },
  nf_disponivel:       { label: 'Nota Fiscal',           descricao: 'Nova nota fiscal disponível para download',          icon: FileText,      prioridade: 'media',   som: null },
  boleto_disponivel:   { label: 'Boleto',                descricao: 'Novo boleto disponível para download',               icon: Receipt,       prioridade: 'media',   som: null },
  meta_atingida:       { label: 'Metas',                 descricao: 'Progresso e conquista de metas',                     icon: Target,        prioridade: 'media',   som: 'sucesso' },
  comissao_liberada:   { label: 'Comissão',              descricao: 'Comissões previstas e liberadas',                    icon: Award,         prioridade: 'media',   som: 'sucesso' },
  aviso_sistema:       { label: 'Avisos',                descricao: 'Comunicados da equipe Concrem',                      icon: Megaphone,     prioridade: 'baixa',   som: null },
  atualizacao:         { label: 'Atualizações',          descricao: 'Novidades e melhorias do portal',                    icon: Sparkles,      prioridade: 'baixa',   som: null },
};

export const ALERT_TIPOS = Object.keys(ALERT_DEFS) as AlertTipo[];

// Estilo visual por prioridade (identidade Concrem: poucas cores vibrantes)
export const PRIO_META: Record<Prioridade, {
  label: string; dot: string; chip: string; border: string;
}> = {
  critica: { label: 'Crítica', dot: '#ef4444', chip: 'bg-red-50 text-red-600',    border: '#ef4444' },
  alta:    { label: 'Alta',    dot: '#f97316', chip: 'bg-orange-50 text-orange-600', border: '#f97316' },
  media:   { label: 'Média',   dot: '#3b82f6', chip: 'bg-blue-50 text-blue-600',   border: '#3b82f6' },
  baixa:   { label: 'Baixa',   dot: '#9ca3af', chip: 'bg-gray-100 text-gray-500',  border: '#d1d5db' },
};

// ─── O alerta em si (produzido pelo engine) ──────────────────────────────────
export interface Alerta {
  id: string;               // ESTÁVEL entre reloads — base p/ lida/excluída
  tipo: AlertTipo;
  prioridade: Prioridade;   // normalmente ALERT_DEFS[tipo].prioridade
  titulo: string;
  descricao: string;
  detalhe?: string;         // linha extra (valor, motivo, frequência...)
  data: string;             // ISO — quando o fato aconteceu
  rota: string;             // deep-link interno (react-router)
  acao: string;             // rótulo do botão de ação
  agrupado?: number;        // nº de itens agrupados (ex.: 4 clientes)
}
