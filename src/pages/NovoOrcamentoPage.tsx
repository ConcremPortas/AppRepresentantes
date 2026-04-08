import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { ChevronDown, Search, Plus, Trash2, Package, X, ArrowLeft, Send, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { cn } from '@/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import { useCarteira } from '@/hooks/useCarteira';
import { useProdutos } from '@/hooks/useProdutos';
import { createOrcamento, type CreateItemPayload } from '@/services/orcamentos';
import type { Produto } from '@/types';
import type { ClienteCarteira } from '@/services/carteira';

// ─── Condições de pagamento ─────────────────────────────
const CONDICOES_PAGAMENTO = [
  '28 DDL', '35 DDL', '28/35 DDL', '28/56 DDL',
  '30/60 dias', '30/60/90 dias', 'À Vista',
];

// ─── Frete ───────────────────────────────────────────────
const TIPOS_FRETE = [
  'FOB - Por conta do Destinatário (Cliente)',
  'CIF - 14 DDL (Faturado direto da Transportadora)',
  'CIF - Valor fixo negociado',
];

// ─── Itens adicionais ────────────────────────────────────
export interface ItemAdicionalLocal {
  id: string;
  nome: string;
  quantidade: number;
  ativo: boolean;
  unidade: string;
}

const ADICIONAIS_CATALOGO: Omit<ItemAdicionalLocal, 'ativo' | 'quantidade'>[] = [
  { id: 'montagem',  nome: 'Montagem',         unidade: 'SRV' },
  { id: 'borracha',  nome: 'Borracha',          unidade: 'UN'  },
  { id: 'frizos',    nome: 'Frizos nas Portas', unidade: 'UN'  },
  { id: 'furo',      nome: 'Furo Universal',    unidade: 'UN'  },
  { id: 'fechadura', nome: 'Fechadura Soprano', unidade: 'UN'  },
];

function initAdicionais(): ItemAdicionalLocal[] {
  return ADICIONAIS_CATALOGO.map(a => ({ ...a, ativo: false, quantidade: 1 }));
}

// ─── Select customizado ─────────────────────────────────
function SelectField({
  label, value, onChange, options, placeholder, disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            'w-full h-9 pl-3 pr-8 text-sm border border-gray-300 rounded-lg appearance-none',
            'focus:outline-none focus:ring-2 focus:ring-[hsl(142,93%,8%)] focus:border-transparent',
            'disabled:bg-gray-50 disabled:text-gray-400',
            !value && 'text-gray-400'
          )}
        >
          <option value="">{placeholder ?? 'Selecionar...'}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

// ─── Input text field ────────────────────────────────────
function InputField({
  label, value, onChange, placeholder, type = 'text', required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 mb-1 block">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(142,93%,8%)] focus:border-transparent"
      />
    </div>
  );
}

// ─── Seletor de cliente ─────────────────────────────────
function ClienteSelector({
  clientes,
  selected,
  onSelect,
}: {
  clientes: ClienteCarteira[];
  selected: ClienteCarteira | null;
  onSelect: (c: ClienteCarteira | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    if (!q) return clientes.slice(0, 40);
    const ql = q.toLowerCase();
    return clientes
      .filter(c =>
        c.cliente_nome.toLowerCase().includes(ql) ||
        (c.cliente_fantasia ?? '').toLowerCase().includes(ql) ||
        c.cliente_cnpj.replace(/\D/g,'').includes(q.replace(/\D/g,''))
      )
      .slice(0, 40);
  }, [clientes, q]);

  if (selected) {
    const nome = selected.cliente_fantasia?.trim() || selected.cliente_nome;
    return (
      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">
          Cliente <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-2 h-9 px-3 border border-gray-300 rounded-lg bg-gray-50">
          <span className="flex-1 text-sm font-medium text-gray-900 truncate">{nome}</span>
          <button
            onClick={() => onSelect(null)}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <label className="text-xs font-semibold text-gray-500 mb-1 block">
        Cliente <span className="text-red-500">*</span>
      </label>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg text-left text-gray-400 hover:border-gray-400 flex items-center justify-between"
      >
        Selecionar cliente
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">Selecionar Cliente</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 py-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  autoFocus
                  type="text"
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Buscar cliente..."
                  className="w-full h-8 pl-8 pr-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(142,93%,8%)]"
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {filtered.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">Nenhum cliente encontrado</p>
              ) : (
                filtered.map(c => {
                  const nome = c.cliente_fantasia?.trim() || c.cliente_nome;
                  return (
                    <button
                      key={c.cliente_cnpj}
                      onClick={() => { onSelect(c); setOpen(false); setQ(''); }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-900 truncate">{nome}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{c.cliente_cidade}/{c.cliente_uf} · {c.cliente_cnpj}</p>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Filtros de produto ──────────────────────────────────
interface FiltrosProduto {
  tipo: string;
  movimento: string;
  enchimento: string;
  linha: string;
  revestimento: string;
  perfil: string;
  cor: string;
  protect: string;
  veneziana: string;
  visor: string;
  altura: string;
  largura: string;
  busca: string;
}

const FILTROS_VAZIO: FiltrosProduto = {
  tipo: '', movimento: '', enchimento: '', linha: '', revestimento: '',
  perfil: '', cor: '', protect: '', veneziana: '', visor: '',
  altura: '', largura: '', busca: '',
};

const CHIPS_DEF: { key: keyof FiltrosProduto; label: string; campo: keyof Produto }[] = [
  { key: 'movimento',    label: 'Movimento',    campo: 'movimento'    },
  { key: 'enchimento',   label: 'Enchimento',   campo: 'enchimento'   },
  { key: 'revestimento', label: 'Revestimento', campo: 'revestimento' },
  { key: 'linha',        label: 'Linha',        campo: 'linha'        },
  { key: 'perfil',       label: 'Liso/Frisado', campo: 'perfil'       },
  { key: 'cor',          label: 'Cor',          campo: 'cor'          },
  { key: 'protect',      label: 'Protect+',     campo: 'protect_plus' },
  { key: 'veneziana',    label: 'Veneziana',    campo: 'veneziana'    },
  { key: 'visor',        label: 'Visor',        campo: 'visor'        },
  { key: 'altura',       label: 'Altura (cm)',  campo: 'altura_cm'    },
  { key: 'largura',      label: 'Largura (cm)', campo: 'largura_cm'   },
];

function getChipsVisiveis(tipo: string): (keyof FiltrosProduto)[] {
  const t = tipo.toUpperCase();
  if (t === 'ALIZAR')  return ['cor', 'altura', 'largura'];
  if (t === 'BATENTE') return ['largura'];
  return ['movimento', 'enchimento', 'revestimento', 'linha', 'perfil', 'cor', 'protect', 'veneziana', 'visor', 'altura', 'largura'];
}

function pStr(p: Produto, campo: keyof Produto): string {
  const v = p[campo];
  return v !== null && v !== undefined ? String(v) : '';
}

function getOpcoes(produtos: Produto[], filtros: FiltrosProduto, campo: keyof Produto) {
  let lista = produtos;
  if (campo !== 'tipo_produto'  && filtros.tipo)        lista = lista.filter(p => p.tipo_produto  === filtros.tipo);
  if (campo !== 'movimento'     && filtros.movimento)   lista = lista.filter(p => p.movimento      === filtros.movimento);
  if (campo !== 'enchimento'    && filtros.enchimento)  lista = lista.filter(p => p.enchimento     === filtros.enchimento);
  if (campo !== 'linha'         && filtros.linha)       lista = lista.filter(p => p.linha          === filtros.linha);
  if (campo !== 'revestimento'  && filtros.revestimento) lista = lista.filter(p => p.revestimento  === filtros.revestimento);
  if (campo !== 'perfil'        && filtros.perfil)      lista = lista.filter(p => p.perfil         === filtros.perfil);
  if (campo !== 'cor'           && filtros.cor)         lista = lista.filter(p => p.cor            === filtros.cor);
  if (campo !== 'protect_plus'  && filtros.protect)     lista = lista.filter(p => p.protect_plus   === filtros.protect);
  if (campo !== 'veneziana'     && filtros.veneziana)   lista = lista.filter(p => p.veneziana      === filtros.veneziana);
  if (campo !== 'visor'         && filtros.visor)       lista = lista.filter(p => p.visor          === filtros.visor);
  if (campo !== 'altura_cm'     && filtros.altura)      lista = lista.filter(p => String(p.altura_cm)  === filtros.altura);
  if (campo !== 'largura_cm'    && filtros.largura)     lista = lista.filter(p => String(p.largura_cm) === filtros.largura);
  return [...new Set(lista.map(p => pStr(p, campo)).filter(Boolean))].sort((a, b) => {
    const na = Number(a); const nb = Number(b);
    return !isNaN(na) && !isNaN(nb) ? na - nb : a.localeCompare(b);
  });
}

// ─── Chip de filtro ──────────────────────────────────────
function FilterChip({ label, value, onChange, options, disabled }: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; disabled?: boolean;
}) {
  if (options.length === 0 && !value) return null;
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled || options.length === 0}
        className={cn(
          'h-8 pl-2.5 pr-7 text-xs border rounded-lg appearance-none cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-[hsl(142,93%,8%)]',
          value
            ? 'border-[hsl(142,93%,8%)] bg-[hsl(142,93%,8%)] text-white font-semibold'
            : 'border-gray-300 bg-white text-gray-600',
          'disabled:opacity-40 disabled:cursor-not-allowed'
        )}
      >
        <option value="">{label}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className={cn(
        'absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none',
        value ? 'text-white' : 'text-gray-400'
      )} />
    </div>
  );
}

// ─── Item do orçamento ────────────────────────────────────
interface OrcItemLocal {
  produto: Produto;
  quantidade: number;
}

// ─── Página principal ─────────────────────────────────────
export default function NovoOrcamentoPage() {
  const navigate  = useNavigate();
  const qc        = useQueryClient();
  const { user }  = useAuth();

  // Dados
  const { data: clientes = [] } = useCarteira();
  const { data: produtos  = [], isLoading: loadingProd } = useProdutos();

  // Formulário — dados da proposta
  const [clienteSel, setClienteSel]   = useState<ClienteCarteira | null>(null);
  const [obra, setObra]               = useState('');
  const [condicao, setCondicao]       = useState('');
  const [validade, setValidade]       = useState('');
  const [endereco, setEndereco]       = useState('');
  const [observacoes, setObs]         = useState('');

  // Itens do orçamento
  const [itens, setItens] = useState<OrcItemLocal[]>([]);

  // Filtros de produto
  const [filtros, setFiltros] = useState<FiltrosProduto>(FILTROS_VAZIO);

  function setFiltro(campo: keyof FiltrosProduto, valor: string) {
    setFiltros(prev => {
      if (campo === 'tipo') return { ...FILTROS_VAZIO, tipo: valor };
      return { ...prev, [campo]: valor };
    });
  }

  // Itens adicionais
  const [adicionais, setAdicionais] = useState<ItemAdicionalLocal[]>(initAdicionais);

  function toggleAdicional(id: string) {
    setAdicionais(prev => prev.map(a => a.id === id ? { ...a, ativo: !a.ativo } : a));
  }
  function setAdicionalQtd(id: string, qtd: number) {
    setAdicionais(prev => prev.map(a => a.id === id ? { ...a, quantidade: Math.max(1, qtd) } : a));
  }
  function setAdicionalPreco(id: string, preco: number) {
    setAdicionais(prev => prev.map(a => a.id === id ? { ...a, preco } : a));
  }

  // Frete
  const [freteTipo, setFreteTipo]   = useState('');
  const [freteValor, setFreteValor] = useState('');

  // Produtos filtrados
  const prodsFiltrados = useMemo(() => {
    let lista = produtos;
    if (filtros.tipo)         lista = lista.filter(p => p.tipo_produto    === filtros.tipo);
    if (filtros.movimento)    lista = lista.filter(p => p.movimento        === filtros.movimento);
    if (filtros.enchimento)   lista = lista.filter(p => p.enchimento       === filtros.enchimento);
    if (filtros.linha)        lista = lista.filter(p => p.linha            === filtros.linha);
    if (filtros.revestimento) lista = lista.filter(p => p.revestimento     === filtros.revestimento);
    if (filtros.perfil)       lista = lista.filter(p => p.perfil           === filtros.perfil);
    if (filtros.cor)          lista = lista.filter(p => p.cor              === filtros.cor);
    if (filtros.protect)      lista = lista.filter(p => p.protect_plus     === filtros.protect);
    if (filtros.veneziana)    lista = lista.filter(p => p.veneziana        === filtros.veneziana);
    if (filtros.visor)        lista = lista.filter(p => p.visor            === filtros.visor);
    if (filtros.altura)       lista = lista.filter(p => String(p.altura_cm)  === filtros.altura);
    if (filtros.largura)      lista = lista.filter(p => String(p.largura_cm) === filtros.largura);
    if (filtros.busca) {
      const q = filtros.busca.toLowerCase();
      lista = lista.filter(p =>
        p.codigo.toLowerCase().includes(q) ||
        p.descricao.toLowerCase().includes(q)
      );
    }
    return lista;
  }, [produtos, filtros]);

  // Adicionar produto ao orçamento
  const addProduto = useCallback((produto: Produto) => {
    setItens(prev => {
      const existe = prev.find(i => i.produto.id === produto.id);
      if (existe) return prev.map(i => i.produto.id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i);
      return [...prev, { produto, quantidade: 1 }];
    });
  }, []);

  const removeItem = (id: string) => setItens(prev => prev.filter(i => i.produto.id !== id));
  const setQtd = (id: string, qtd: number) => {
    if (qtd <= 0) { removeItem(id); return; }
    setItens(prev => prev.map(i => i.produto.id === id ? { ...i, quantidade: qtd } : i));
  };

  // Salvar
  const saveMut = useMutation({
    mutationFn: () => {
      const uid    = user?.usuario?.id!;
      const repErp = user?.repCodes?.[0]?.representante_erp;

      const itensProduto: CreateItemPayload[] = itens.map(i => ({
        produto_id:        i.produto.id,
        produto_codigo:    i.produto.codigo,
        produto_descricao: i.produto.descricao,
        unidade:           i.produto.unidade,
        quantidade:        i.quantidade,
        is_adicional:      false,
      }));

      const itensAdicionaisAtivos: CreateItemPayload[] = adicionais
        .filter(a => a.ativo)
        .map(a => ({
          produto_codigo:    `ADICIONAL.${a.id}`,
          produto_descricao: a.nome,
          unidade:           a.unidade,
          quantidade:        a.quantidade,
          is_adicional:      true,
        }));

      return createOrcamento(
        {
          usuario_id:         uid,
          representante_erp:  repErp,
          cliente_cnpj:       clienteSel!.cliente_cnpj,
          cliente_nome:       clienteSel!.cliente_nome,
          cliente_fantasia:   clienteSel!.cliente_fantasia ?? undefined,
          obra_referencia:    obra        || undefined,
          condicao_pagamento: condicao    || undefined,
          validade:           validade    || undefined,
          endereco_entrega:   endereco    || undefined,
          frete_tipo:         freteTipo   || undefined,
          frete_valor:        freteValor ? Number(freteValor) : undefined,
          observacoes:        observacoes || undefined,
        },
        [...itensProduto, ...itensAdicionaisAtivos],
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orcamentos'] });
      navigate('/orcamentos');
    },
  });

  const canSave       = !!clienteSel && itens.length > 0;
  const freteValorNum = freteValor ? Number(freteValor) : 0;

  // Opções dinâmicas
  const opTipos = getOpcoes(produtos, filtros, 'tipo_produto');
  const chipsVisiveis = getChipsVisiveis(filtros.tipo);

  // Monta descrição de dimensões
  function dims(p: Produto) {
    const parts: string[] = [];
    if (p.altura_cm)    parts.push(`${p.altura_cm}cm`);
    if (p.largura_cm)   parts.push(`${p.largura_cm}cm`);
    if (p.espessura_cm) parts.push(`${p.espessura_cm}cm`);
    return parts.join(' × ');
  }

  return (
    <div className="p-4 space-y-4" style={{ paddingBottom: 'calc(9rem + env(safe-area-inset-bottom, 0px))' }}>

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/orcamentos')}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Novo Orçamento</h1>
          <p className="text-xs text-gray-400 mt-0.5">Pré-orçamento para análise</p>
        </div>
      </div>

      {/* ── Seção 1: Dados da Proposta ── */}
      <Card>
        <CardHeader>
          <CardTitle>Dados da Proposta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ClienteSelector
              clientes={clientes}
              selected={clienteSel}
              onSelect={c => {
                setClienteSel(c);
                if (c) setEndereco(`${c.cliente_cidade} - ${c.cliente_uf}`);
              }}
            />
            <InputField label="Obra / Referência" value={obra} onChange={setObra} placeholder="Nome da obra" />
            <SelectField
              label="Condição de Pagamento"
              value={condicao}
              onChange={setCondicao}
              options={CONDICOES_PAGAMENTO}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InputField label="Validade da Proposta" value={validade} onChange={setValidade} type="date" />
            <InputField
              label="Endereço de Entrega"
              value={endereco}
              onChange={setEndereco}
              placeholder="Rua, número, bairro, cidade - UF"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Observações</label>
            <textarea
              value={observacoes}
              onChange={e => setObs(e.target.value)}
              placeholder="Informações adicionais para a equipe de orçamentos..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(142,93%,8%)] focus:border-transparent resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Seção 2: Seleção de Produtos ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Seleção de Produtos</CardTitle>
            <span className="text-xs text-gray-400">{produtos.length} produtos no catálogo</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Filtros dinâmicos por tipo */}
          <div className="flex gap-2 flex-wrap items-center">
            <FilterChip label="Tipo" value={filtros.tipo} onChange={v => setFiltro('tipo', v)} options={opTipos} />
            {chipsVisiveis.map(key => {
              const def = CHIPS_DEF.find(c => c.key === key)!;
              return (
                <FilterChip
                  key={key}
                  label={def.label}
                  value={filtros[key] as string}
                  onChange={v => setFiltro(key, v)}
                  options={getOpcoes(produtos, filtros, def.campo)}
                />
              );
            })}
            {Object.entries(filtros).some(([k, v]) => k !== 'busca' && !!v) && (
              <button
                onClick={() => setFiltros(FILTROS_VAZIO)}
                className="text-xs text-red-500 hover:text-red-700 transition-colors px-1"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Busca por texto */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={filtros.busca}
              onChange={e => setFiltro('busca', e.target.value)}
              placeholder="Buscar por código ou descrição..."
              className="w-full h-8 pl-9 pr-3 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[hsl(142,93%,8%)]"
            />
          </div>

          {/* Lista de produtos */}
          {loadingProd ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-[hsl(142,93%,8%)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : prodsFiltrados.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nenhum produto com esses filtros</p>
            </div>
          ) : (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              {/* Header — dimensões só em telas maiores */}
              <div className="grid grid-cols-[70px_1fr_36px] sm:grid-cols-[80px_1fr_110px_36px] gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                <span>Código</span>
                <span>Descrição</span>
                <span className="hidden sm:block">Dimensões</span>
                <span></span>
              </div>
              <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                {prodsFiltrados.map(prod => {
                  const noCarrinho = itens.find(i => i.produto.id === prod.id);
                  const d = dims(prod);
                  return (
                    <div
                      key={prod.id}
                      className={cn(
                        'grid grid-cols-[70px_1fr_36px] sm:grid-cols-[80px_1fr_110px_36px] gap-2 px-3 py-2.5 items-center transition-colors',
                        noCarrinho ? 'bg-green-50' : 'hover:bg-gray-50'
                      )}
                    >
                      <span className="font-mono text-[11px] text-gray-500 leading-tight">{prod.codigo}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-900 leading-snug">{prod.descricao}</p>
                        {/* Dimensões aparecem aqui em mobile, tags sempre visíveis */}
                        <div className="flex gap-1 mt-0.5 flex-wrap items-center">
                          {prod.tipo_produto && <span className="text-[9px] bg-gray-100 text-gray-500 px-1 rounded">{prod.tipo_produto}</span>}
                          {prod.linha       && <span className="text-[9px] bg-blue-50 text-blue-600 px-1 rounded">{prod.linha}</span>}
                          {prod.movimento   && <span className="text-[9px] bg-purple-50 text-purple-600 px-1 rounded">{prod.movimento}</span>}
                          {d && <span className="sm:hidden text-[9px] text-gray-400">{d}</span>}
                        </div>
                      </div>
                      {/* Dimensões em coluna — só sm+ */}
                      <span className="hidden sm:block text-xs text-gray-400 leading-tight">{d || '—'}</span>
                      <button
                        onClick={() => addProduto(prod)}
                        className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0',
                          noCarrinho
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-[hsl(142,93%,8%)] text-white hover:bg-[hsl(142,93%,15%)]'
                        )}
                        title={noCarrinho ? `Adicionar mais (atual: ${noCarrinho.quantidade})` : 'Adicionar'}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400">
                {prodsFiltrados.length} produto(s)
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Seção 3: Itens do Orçamento ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Itens do Orçamento</CardTitle>
            <span className={cn(
              'text-xs font-semibold px-2 py-0.5 rounded-full',
              itens.length > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
            )}>
              {itens.length} item(s)
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {itens.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">
              <Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              Adicione produtos acima para compor o orçamento
            </div>
          ) : (
            <div className="space-y-2">
              {itens.map((item, idx) => (
                <div key={item.produto.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-400 w-4 flex-shrink-0">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{item.produto.descricao}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{item.produto.codigo} · {item.produto.unidade}</p>
                  </div>
                  {/* Quantidade */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setQtd(item.produto.id, item.quantidade - 1)}
                      className="w-6 h-6 rounded border border-gray-200 text-gray-500 hover:bg-gray-100 flex items-center justify-center text-sm font-bold leading-none"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={item.quantidade}
                      onChange={e => setQtd(item.produto.id, Number(e.target.value))}
                      className="w-14 h-6 text-center text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[hsl(142,93%,8%)]"
                    />
                    <button
                      onClick={() => setQtd(item.produto.id, item.quantidade + 1)}
                      className="w-6 h-6 rounded border border-gray-200 text-gray-500 hover:bg-gray-100 flex items-center justify-center text-sm font-bold leading-none"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.produto.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Seção 4: Itens Adicionais ── */}
      <Card>
        <CardHeader>
          <CardTitle>Itens Adicionais</CardTitle>
          <p className="text-xs text-gray-400 mt-0.5">Serviços e acessórios complementares por porta</p>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {adicionais.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                <button
                  onClick={() => toggleAdicional(a.id)}
                  className={cn(
                    'w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors',
                    a.ativo ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300'
                  )}
                >
                  {a.ativo && <span className="text-[10px] font-bold">✓</span>}
                </button>
                <span className="flex-1 text-sm font-medium text-gray-800">{a.nome}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-xs text-gray-400">Qtd.</span>
                  <input
                    type="number"
                    min={1}
                    value={a.quantidade}
                    onChange={e => setAdicionalQtd(a.id, Number(e.target.value))}
                    disabled={!a.ativo}
                    className="w-14 h-7 text-center text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[hsl(142,93%,8%)] disabled:opacity-40"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Seção 5: Frete ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-gray-500" />
            <CardTitle>Frete</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <SelectField
            label="Tipo de Frete"
            value={freteTipo}
            onChange={setFreteTipo}
            options={TIPOS_FRETE}
            placeholder="Selecionar tipo de frete..."
          />
          {freteTipo === 'CIF - Valor fixo negociado' && (
            <InputField
              label="Valor do Frete (R$)"
              value={freteValor}
              onChange={setFreteValor}
              placeholder="0,00"
              type="number"
            />
          )}
        </CardContent>
      </Card>

      {/* ── Barra inferior fixa — fica acima do MobileNav no mobile ── */}
      <div
        className="fixed left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between gap-3 z-40 lg:left-64"
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="text-sm text-gray-600 min-w-0 flex-1">
          <div className="truncate">
            {itens.length > 0
              ? <span><strong>{itens.length}</strong> prod. · <strong>{itens.reduce((s,i)=>s+i.quantidade,0)}</strong> un.</span>
              : <span className="text-gray-400 text-xs">Nenhum item adicionado</span>
            }
          </div>
          {freteValorNum > 0 && (
            <div className="text-xs text-gray-400">
              Frete: <span className="text-gray-700 font-semibold">R$ {freteValorNum.toFixed(2).replace('.',',')}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => navigate('/orcamentos')}
            className="h-9 px-3 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            Cancelar
          </button>
          <button
            onClick={() => saveMut.mutate()}
            disabled={!canSave || saveMut.isPending}
            className="h-9 px-4 text-sm bg-[hsl(142,93%,8%)] text-white rounded-lg hover:bg-[hsl(142,93%,15%)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 whitespace-nowrap"
          >
            {saveMut.isPending
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Send className="w-3.5 h-3.5" />
            }
            Salvar Rascunho
          </button>
        </div>
      </div>

      {/* Erro */}
      {saveMut.isError && (
        <div className="fixed bottom-20 right-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg shadow-lg z-50">
          Erro ao salvar. Verifique os dados e tente novamente.
        </div>
      )}
    </div>
  );
}
