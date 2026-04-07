import { supabase } from '@/lib/supabase/client';

export interface ClienteCarteira {
  cliente_codigo: string;
  cliente_cnpj: string;
  cliente_nome: string;
  cliente_fantasia: string | null;
  cliente_cidade: string;
  cliente_uf: string;
  cliente_telefone: string;
  cliente_email: string | null;
  total_pedidos: number;
  total_comprado: number;
  ultimo_pedido: string; // data_emissao ISO
}

export interface FetchCarteiraParams {
  repCodes?: string[];
  admin?: boolean;
  representante?: string; // filtro extra para admin
}

const CAMPOS = [
  'cliente_codigo',
  'cliente_cnpj',
  'cliente_nome',
  'cliente_fantasia',
  'cliente_cidade',
  'cliente_uf',
  'cliente_telefone',
  'cliente_email',
  'data_emissao',
  'total_pedido_venda',
].join(',');

export async function fetchCarteira(params: FetchCarteiraParams): Promise<ClienteCarteira[]> {
  const { repCodes = [], admin = false, representante } = params;

  if (!admin && repCodes.length === 0) return [];

  let query = supabase
    .from('concrem_pedidos_venda')
    .select(CAMPOS)
    .limit(5000);

  if (!admin) {
    query = query.in('representante', repCodes);
  } else if (representante) {
    query = query.ilike('representante', `%${representante}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Deduplica por CNPJ, acumulando métricas
  const map = new Map<string, ClienteCarteira>();

  for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
    const cnpj: string = (row.cliente_cnpj as string) ?? '';
    const existing = map.get(cnpj);
    const valor: number = (row.total_pedido_venda as number) ?? 0;
    const data_emissao: string = (row.data_emissao as string) ?? '';

    if (!existing) {
      map.set(cnpj, {
        cliente_codigo:   (row.cliente_codigo as string) ?? '',
        cliente_cnpj:     cnpj,
        cliente_nome:     (row.cliente_nome as string) ?? '',
        cliente_fantasia: (row.cliente_fantasia as string | null) ?? null,
        cliente_cidade:   (row.cliente_cidade as string) ?? '',
        cliente_uf:       (row.cliente_uf as string) ?? '',
        cliente_telefone: (row.cliente_telefone as string) ?? '',
        cliente_email:    (row.cliente_email as string | null) ?? null,
        total_pedidos:    1,
        total_comprado:   valor,
        ultimo_pedido:    data_emissao,
      });
    } else {
      existing.total_pedidos  += 1;
      existing.total_comprado += valor;
      if (data_emissao > existing.ultimo_pedido) {
        existing.ultimo_pedido = data_emissao;
      }
    }
  }

  return Array.from(map.values())
    .sort((a, b) => {
      const nomeA = (a.cliente_fantasia?.trim() || a.cliente_nome).toLowerCase();
      const nomeB = (b.cliente_fantasia?.trim() || b.cliente_nome).toLowerCase();
      return nomeA.localeCompare(nomeB, 'pt-BR');
    });
}
