# Concrem Connect — Portal do Representante

Portal web corporativo da Concrem Portas Premium para representantes gerenciarem orçamentos, pedidos e comissões.

## Stack

- **Frontend:** React 19 + TypeScript + Vite
- **UI:** Tailwind CSS v4, Radix UI, Lucide Icons, Recharts
- **Estado:** TanStack React Query
- **Roteamento:** React Router v7
- **Backend:** Supabase (PostgreSQL)
- **Auth:** RPC customizado (não usa Supabase Auth)

## Rodar localmente

```bash
npm install
npm run dev
```

Variáveis de ambiente necessárias (`.env`):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_USE_MOCK=false
```

## Autenticação

O sistema **não usa `supabase.auth.signIn`**. O login é feito via RPC customizado:

```ts
supabase.rpc('login', { p_email, p_senha })
// retorna: { id, nome, email, admin, operador, rep_codes }
```

A sessão é persistida em `localStorage` com a chave `concrem_session`. Isso significa que **todas as queries chegam ao Supabase como usuário `anon`**. As tabelas `concremapprep_*` precisam ter RLS desabilitado ou policies liberando o role `anon`.

## Tipos de usuário e permissões

| Tipo | admin | operador | Acesso |
|---|---|---|---|
| Representante | false | false | Orçamentos, Pedidos, Acompanhamento, Clientes, Financeiro |
| Operador | false | true | Aprovações, Pedidos, Dashboard |
| Admin | true | qualquer | Tudo + Gestão de usuários e representantes |

Guardas de rota em `src/App.tsx`: `AdminRoute`, `OperadorRoute`, `RepRoute`.

## Estrutura de pastas

```
src/
├── pages/
│   ├── admin/          # RepresentantesPage, UsuariosPage
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── OrcamentosPage.tsx
│   ├── NovoOrcamentoPage.tsx
│   ├── EditarOrcamentoPage.tsx
│   ├── PedidosPage.tsx
│   ├── AcompanhamentoPage.tsx
│   ├── AprovacoesPage.tsx
│   ├── ClientesPage.tsx
│   ├── FinanceiroPage.tsx
│   └── PerfilPage.tsx
├── services/           # Toda lógica de acesso ao Supabase
├── hooks/              # Custom hooks com React Query
├── contexts/           # AuthContext (sessão do usuário)
├── components/
│   ├── layout/         # Layout, Header, Sidebar, MobileNav
│   └── ui/             # Card, Button, Input, StatusBadge
├── types/index.ts
└── utils/
    ├── formatters.ts   # moeda, data
    └── cn.ts           # Tailwind class merge
```

## Banco de dados (Supabase)

### Tabelas do app (`concremapprep_*`)

| Tabela | Descrição |
|---|---|
| `concremapprep_usuarios` | Usuários do portal |
| `concremapprep_representantes` | Representantes ERP cadastrados |
| `concremapprep_usuario_representantes` | Vínculo N:N usuário ↔ representante |
| `concremapprep_orcamentos` | Orçamentos criados no portal |
| `concremapprep_orcamento_itens` | Itens dos orçamentos |
| `concremapprep_notificacoes` | Notificações por usuário |
| `clientes` | Clientes do representante (cadastro manual) |
| `titulos` | Títulos financeiros dos clientes |

### Tabelas do ERP (somente leitura)

| Tabela | Descrição |
|---|---|
| `concrem_pedidos_venda` | Pedidos do ERP |
| `concrem_pedidos_status` | Status atual de cada pedido no pipeline |
| `concrem_pedidos_status_historico` | Histórico de transições de status |
| `relatorio_entrega_anexos` | Links para NF e boleto |
| `concremprodutos_produtos` | Catálogo de produtos |

### RPCs

| RPC | Parâmetros | Descrição |
|---|---|---|
| `login` | `p_email, p_senha` | Autentica e retorna dados do usuário + rep_codes |
| `criar_usuario` | `p_nome, p_email, p_senha, p_admin` | Cria usuário com senha hash. O campo `operador` é setado após via UPDATE separado |
| `alterar_senha` | `p_id uuid, p_senha text` | Atualiza senha do usuário (parâmetro era `p_usuario_id` na versão anterior — usar DROP antes de recriar) |
| `gerar_numero_orcamento` | — | Gera número sequencial de orçamento |

## Vínculo usuário ↔ representante ERP

O campo `concremapprep_representantes.representante_erp` deve ser **idêntico** ao campo `concrem_pedidos_venda.representante` vindo do ERP. É esse match que filtra os pedidos do representante. Se estiver diferente, o representante não vê nenhum dado.

## Pipeline de pedidos

Estágios em ordem: `aprovado → liberado → mapeamento → ferragem → comercial → producao → faturado → entrega → finalizado`

Mapeamento de status do banco para o app (em `src/services/acompanhamento.ts`):

```
aguardando_avaliacao  → aprovado
(sem mapeamento)      → liberado   ← estágio existe na UI mas sem status DB definido
mapeamento_concluido  → mapeamento
ferragem_recebida     → ferragem
liberado_comercial    → comercial
liberado_producao     → producao
faturado              → faturado
em_entrega            → entrega
entregue / finalizado → finalizado
```

Pedidos sem status em `concrem_pedidos_status` são tratados como `aprovado` (entrada padrão no pipeline).

## Status dos orçamentos

`rascunho → enviado → em_analise → aprovado / rejeitado`

Apenas orçamentos em `rascunho` podem ser editados ou excluídos pelo representante.

## Paginação de pedidos

`PAGE_SIZE = 50` definido em `src/services/pedidosVenda.ts`. Queries são feitas em lotes de 200 para evitar limite de URL do PostgREST ao buscar status.

## Representante excluído dos filtros

```ts
// src/services/pedidosVenda.ts
const REP_EXCLUIDOS = ['40001498 - JANDERSON LEROY MERLIN']
```

Vendas diretas (Leroy Merlin) são excluídas da listagem dos representantes.

## Modo mock

`VITE_USE_MOCK=true` bypassa o Supabase e usa dados simulados de `src/data/mockData.ts`. Útil para desenvolvimento sem conexão com o banco.
