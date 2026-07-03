# Documento de Especificação de Software (SSD)

## Concrem Connect — Portal do Representante

| | |
|---|---|
| **Produto** | Concrem Connect — Portal do Representante |
| **Organização** | Concrem Portas Premium |
| **Versão do documento** | 1.0 |
| **Data** | 30/06/2026 |
| **Tipo** | Documento de Especificação de Software |

---

## 1. Visão Geral

O **Concrem Connect** é um portal web corporativo que permite aos representantes comerciais da Concrem Portas Premium gerenciarem orçamentos, acompanharem pedidos de venda ao longo do pipeline de produção/entrega, consultarem informações financeiras (títulos e comissões) e gerirem sua carteira de clientes.

O sistema integra dados de **duas origens**:

1. **Dados do próprio portal** (tabelas `concremapprep_*`) — usuários, representantes cadastrados, orçamentos e notificações criados dentro da aplicação.
2. **Dados do ERP** (tabelas `concrem_*`, somente leitura) — pedidos de venda, status do pipeline, anexos (NF/boleto) e catálogo de produtos importados do sistema de gestão da empresa.

O elo entre o representante do portal e os dados do ERP é o campo `representante`, que deve coincidir exatamente entre os dois mundos (ver §8).

### 1.1 Objetivos

- Centralizar a operação comercial do representante em uma única interface web.
- Dar visibilidade em tempo real do andamento de cada pedido no pipeline de produção.
- Permitir a criação e o ciclo de aprovação de orçamentos.
- Expor indicadores de desempenho (vendas, ticket médio, faturamento) via dashboard.

### 1.2 Escopo

Estão **dentro** do escopo: autenticação, dashboard de KPIs, gestão de orçamentos, acompanhamento de pedidos, consulta financeira, carteira de clientes, fluxo de aprovações (operador) e administração de usuários/representantes (admin).

Estão **fora** do escopo: criação/edição de pedidos de venda (provêm do ERP, somente leitura), gestão de estoque, emissão fiscal e processos internos de fábrica.

---

## 2. Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Linguagem | TypeScript |
| Framework de UI | React 19 |
| Build / Dev server | Vite 8 |
| Estilização | Tailwind CSS v4, Radix UI (primitivos acessíveis), Lucide (ícones) |
| Gráficos | Recharts |
| Estado servidor / cache | TanStack React Query 5 |
| Roteamento | React Router DOM v7 |
| Formulários / Validação | React Hook Form + Zod |
| Geração de PDF | @react-pdf/renderer |
| Datas | date-fns |
| Proteção anti-bot | Cloudflare Turnstile (`react-turnstile`) |
| Backend / Banco | Supabase (PostgreSQL + PostgREST + Edge Functions) |

### 2.1 Scripts

| Script | Comando | Descrição |
|---|---|---|
| `dev` | `vite` | Servidor de desenvolvimento (porta 5173) |
| `build` | `tsc && vite build` | Type-check + build de produção |
| `lint` | `eslint …` | Lint sem tolerância a warnings |
| `preview` | `vite preview` | Pré-visualização do build |

### 2.2 Variáveis de ambiente (`.env`)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `VITE_SUPABASE_URL` | Sim | URL do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Sim | Chave pública (`anon`) do Supabase |
| `VITE_USE_MOCK` | Não | `true` ativa dados mock e bypassa o Supabase |
| `VITE_TURNSTILE_SITE_KEY` | Não | Chave pública do Cloudflare Turnstile |

> **Nota operacional:** mudanças no `.env` exigem reinício do servidor Vite — não são aplicadas via hot reload.

---

## 3. Arquitetura

A aplicação é uma **SPA (Single Page Application)** organizada em camadas:

```
┌──────────────────────────────────────────────┐
│  Pages (telas) — src/pages/                    │  Apresentação
├──────────────────────────────────────────────┤
│  Components (layout + ui) — src/components/     │
├──────────────────────────────────────────────┤
│  Hooks (React Query) — src/hooks/               │  Estado / cache
├──────────────────────────────────────────────┤
│  Services — src/services/                       │  Lógica de acesso a dados
├──────────────────────────────────────────────┤
│  Supabase client — src/lib/supabase/            │  Integração
└──────────────────────────────────────────────┘
        ▲                          ▲
        │ AuthContext              │ React Query Cache
   (sessão do usuário)        (staleTime 5min, retry 1)
```

### 3.1 Princípios de design

- **Toda lógica de acesso a dados fica em `src/services/`.** As páginas nunca chamam o Supabase diretamente — consomem hooks que encapsulam React Query, que por sua vez chamam os serviços.
- **Cache de queries:** `staleTime` de 5 minutos e `retry` 1 (configurado globalmente em [App.tsx](src/App.tsx)).
- **Estado de sessão** vive no `AuthContext` e é persistido em `localStorage`.

### 3.2 Estrutura de pastas

```
src/
├── pages/              # Telas (uma por rota)
│   └── admin/          # RepresentantesPage, UsuariosPage
├── services/           # Acesso ao Supabase (1 arquivo por domínio)
├── hooks/              # Custom hooks com React Query (1 por serviço)
├── contexts/           # AuthContext (sessão)
├── components/
│   ├── layout/         # Layout, Header, Sidebar, MobileNav
│   └── ui/             # Card, Button, Input, StatusBadge
├── lib/supabase/       # Cliente Supabase
├── types/index.ts      # Tipos de domínio
├── data/mockData.ts    # Dados simulados (modo mock)
└── utils/              # formatters (moeda, data), cn (merge de classes)
```

---

## 4. Autenticação e Sessão

### 4.1 Modelo de autenticação

O sistema **não usa o Supabase Auth** (`supabase.auth.signIn`). A autenticação é feita por uma **RPC customizada**:

```ts
supabase.rpc('login', { p_email, p_senha })
// retorna: { id, nome, email, admin, operador, rep_codes }
```

**Consequência arquitetural crítica:** como não há sessão autenticada do Supabase, **todas as queries chegam ao banco como o role `anon`**. Portanto as tabelas `concremapprep_*` e as tabelas do ERP precisam ter **RLS desabilitado** ou *policies* liberando o role `anon`.

### 4.2 Fluxo de login

1. Usuário preenche e-mail e senha em [LoginPage](src/pages/LoginPage.tsx).
2. Antes do login, o token do **Cloudflare Turnstile** é verificado via Edge Function `verificar-turnstile`.
3. Em caso de sucesso na verificação, chama-se a RPC `login`.
4. A resposta é convertida em uma sessão e persistida.

### 4.3 Gestão de sessão (`AuthContext`)

- **Chave de persistência:** `localStorage["concrem_session"]`.
- **Duração:** 8 horas (`SESSION_DURATION`).
- **Renovação por atividade:** eventos de `mousemove`/`keydown`/`click` renovam a sessão, com *throttle* de 5 minutos.
- **Verificação de expiração:** a cada 60 segundos; sessão expirada → logout automático.
- **Modo mock:** com `VITE_USE_MOCK=true`, um usuário fixo (`MOCK_USER`) é injetado e o Supabase é totalmente bypassado.

---

## 5. Perfis de Usuário e Permissões

| Perfil | `admin` | `operador` | Acesso |
|---|:---:|:---:|---|
| **Representante** | false | false | Dashboard, Orçamentos, Acompanhamento, Pedidos, Clientes, Financeiro, Perfil |
| **Operador** | false | true | Dashboard, Aprovações, Pedidos, Perfil |
| **Admin** | true | qualquer | Tudo + Gestão de usuários e representantes |

### 5.1 Guardas de rota ([App.tsx](src/App.tsx))

| Guarda | Regra | Redirecionamento se negado |
|---|---|---|
| `AdminRoute` | Exige `usuario.admin` | `/dashboard` |
| `OperadorRoute` | Exige `admin` **ou** `operador` | `/dashboard` |
| `RepRoute` | Bloqueia operador puro (operador sem admin) | `/aprovacoes` |

Usuários não autenticados são sempre redirecionados para `/login`; autenticados que acessem `/login` vão para `/dashboard`.

---

## 6. Rotas e Funcionalidades

| Rota | Página | Acesso | Descrição |
|---|---|---|---|
| `/login` | LoginPage | Público | Login com Turnstile |
| `/dashboard` | DashboardPage | Todos | KPIs, pipeline e gráfico de vendas |
| `/pedidos` | PedidosPage | Todos | Listagem paginada de pedidos do ERP |
| `/perfil` | PerfilPage | Todos | Dados do usuário e troca de senha |
| `/aprovacoes` | AprovacoesPage | Operador + Admin | Análise e aprovação de orçamentos |
| `/orcamentos` | OrcamentosPage | Representante | Lista de orçamentos do usuário |
| `/orcamentos/novo` | NovoOrcamentoPage | Representante | Criação de orçamento |
| `/orcamentos/:id/editar` | EditarOrcamentoPage | Representante | Edição de rascunho |
| `/acompanhamento` | AcompanhamentoPage | Representante | Acompanhamento de pedidos no pipeline |
| `/clientes` | ClientesPage | Representante | Carteira de clientes |
| `/financeiro` | FinanceiroPage | Representante | Títulos e comissões |
| `/admin/representantes` | RepresentantesPage | Admin | Cadastro de representantes ERP |
| `/admin/usuarios` | UsuariosPage | Admin | Gestão de usuários e vínculos |

---

## 7. Modelo de Dados (Supabase)

### 7.1 Tabelas do portal (`concremapprep_*`)

| Tabela | Descrição |
|---|---|
| `concremapprep_usuarios` | Usuários do portal (login, perfis) |
| `concremapprep_representantes` | Códigos de representante do ERP cadastrados |
| `concremapprep_usuario_representantes` | Vínculo N:N usuário ↔ representante |
| `concremapprep_orcamentos` | Orçamentos criados no portal |
| `concremapprep_orcamento_itens` | Itens dos orçamentos |
| `concremapprep_notificacoes` | Notificações por usuário |
| `clientes` | Clientes do representante (cadastro manual) |
| `titulos` | Títulos financeiros dos clientes |

### 7.2 Tabelas do ERP (somente leitura)

| Tabela | Descrição |
|---|---|
| `concrem_pedidos_venda` | Pedidos do ERP |
| `concrem_pedidos_status` | Status atual de cada pedido no pipeline |
| `concrem_pedidos_status_historico` | Histórico de transições de status |
| `relatorio_entrega_anexos` | Links para NF e boleto |
| `concremprodutos_produtos` | Catálogo de produtos |

### 7.3 Entidades principais (tipos de domínio)

- **`Usuario`** — `id`, `nome`, `email`, `admin`, `operador`, `ativo`, `created_at`.
- **`RepresentanteERP`** — código ERP do representante; o campo `representante_erp` deve dar match exato com `concrem_pedidos_venda.representante`. Um usuário pode ter **N** códigos (ex.: faixas de comissão distintas) e cada código tem seu `comissao_percentual`.
- **`Orcamento`** — cabeçalho do orçamento (cliente, condições, frete, status) + `OrcamentoItem[]`.
- **`PedidoVenda`** — pedido do ERP, com `dados_tabela` (JSON com os itens), enriquecido em tempo de consulta com `status_pipeline`, `anexos` e `numero_nota`.
- **`TituloCliente`** — título financeiro do cliente, com flags `has_boleto` / `has_nota_fiscal`.

### 7.4 RPCs

| RPC | Parâmetros | Descrição |
|---|---|---|
| `login` | `p_email, p_senha` | Autentica e retorna dados do usuário + `rep_codes` |
| `criar_usuario` | `p_nome, p_email, p_senha, p_admin` | Cria usuário com hash de senha (o campo `operador` é setado depois via UPDATE) |
| `alterar_senha` | `p_id, p_senha` | Atualiza a senha do usuário |
| `gerar_numero_orcamento` | — | Gera número sequencial de orçamento |

### 7.5 Edge Functions

| Function | Descrição |
|---|---|
| `verificar-turnstile` | Valida o token do Cloudflare Turnstile no login |

---

## 8. Regra de Vínculo Usuário ↔ Representante ERP

O campo `concremapprep_representantes.representante_erp` deve ser **idêntico** ao `concrem_pedidos_venda.representante` vindo do ERP. É esse match que filtra os pedidos do representante.

> ⚠️ **Se os valores divergirem, o representante não verá nenhum pedido.** Esta é a causa raiz mais comum de "dados sumidos" no portal.

Na consulta, o filtro aplicado é `representante IN (repCodes do usuário)`. Para **admin**, o filtro é omitido (vê todos).

### 8.1 Representantes excluídos

Vendas diretas são removidas de todas as consultas via constante em [pedidosVenda.ts](src/services/pedidosVenda.ts):

```ts
const REP_EXCLUIDOS = ['40001498 - JANDERSON LEROY MERLIN'];
```

---

## 9. Regras de Negócio

### 9.1 Ciclo de vida do Orçamento

```
rascunho → enviado → em_analise → aprovado
                                 ↘ rejeitado
```

| Transição | Quem | Regra |
|---|---|---|
| Criar (`rascunho`) | Representante | Número gerado por `gerar_numero_orcamento` |
| Editar / Excluir | Representante | **Apenas** orçamentos em `rascunho` |
| Enviar (`enviado`) | Representante | — |
| Marcar `em_analise` | Operador | Só a partir de `enviado` |
| Aprovar / Rejeitar | Operador | Rejeição exige motivo (gravado em `observacoes`) |

> A edição de um rascunho **substitui todos os itens** (delete + insert), não faz merge incremental.

### 9.2 Pipeline de Pedidos

Estágios em ordem:

```
aprovado → liberado → mapeamento → ferragem → comercial
         → producao → faturado → entrega → finalizado
```

Mapeamento de status do banco (`concrem_pedidos_status.status_atual`) → estágio do app, definido em [acompanhamento.ts](src/services/acompanhamento.ts):

| Status no banco | Estágio no app |
|---|---|
| `aguardando_avaliacao` | aprovado |
| `mapeamento_concluido` | mapeamento |
| `ferragem_recebida` | ferragem |
| `liberado_comercial`, `aguardando_gerencia`, `confirmado_gerencia` | comercial |
| `liberado_producao`, `producao_finalizada` | producao |
| `faturado` | faturado |
| `em_entrega` | entrega |
| `entregue`, `finalizado` | finalizado |
| *(sem status / não mapeado)* | **aprovado** (entrada padrão) |

**Resolução de status:** o histórico (`concrem_pedidos_status_historico`) tem **prioridade** — a transição mais recente define o status atual; o fallback é o `status_atual` de `concrem_pedidos_status`.

### 9.3 Comissão

```ts
comissao = pedido.total_pedido_venda × (percentual / 100)
```

O percentual vem do `RepresentanteERP` correspondente ao código do pedido.

### 9.4 Indicadores do Dashboard ([dashboard.ts](src/services/dashboard.ts))

- **Total vendido no mês** / mês anterior (por `data_emissao`).
- **Faturado no mês:** pedidos do mês com status `faturado`, `entrega` ou `finalizado`.
- **Ticket médio:** total geral ÷ número de pedidos.
- **Contagem por estágio do pipeline.**
- **Vendas mensais:** série dos últimos 6 meses para o gráfico.

---

## 10. Paginação e Performance

- **`PAGE_SIZE = 50`** — tamanho da página na listagem de pedidos ([pedidosVenda.ts](src/services/pedidosVenda.ts)).
- **Consultas de status/histórico em lotes de 200** (`chunk`) — evita estourar o limite de tamanho de URL do PostgREST ao usar o filtro `IN`.
- **Filtros disponíveis na listagem de pedidos:** nº do pedido, CNPJ, nome/fantasia do cliente, representante, intervalo de datas, ano/mês e situação de entrega.

---

## 11. Modo Mock

Com `VITE_USE_MOCK=true`:

- O Supabase é totalmente bypassado.
- Dados simulados vêm de [mockData.ts](src/data/mockData.ts).
- Um usuário fixo (`João Silva (Mock)`, representante) é injetado no `AuthContext`.

Útil para desenvolvimento de UI sem conexão com o banco.

> ⚠️ Mesmo em modo mock, o cliente Supabase é instanciado em [client.ts](src/lib/supabase/client.ts); por isso `VITE_SUPABASE_URL` precisa de pelo menos um valor de placeholder válido para o `createClient` não falhar na inicialização.

---

## 12. Requisitos Não-Funcionais

| Categoria | Requisito |
|---|---|
| **Segurança** | Senhas com hash via RPC; verificação anti-bot (Turnstile) no login; sessão com expiração de 8h. |
| **Disponibilidade de dados** | Tabelas do ERP em modo somente leitura; portal não altera o ERP. |
| **Usabilidade** | Layout responsivo (desktop + mobile com `MobileNav`); componentes acessíveis via Radix UI. |
| **Manutenibilidade** | Separação estrita de camadas (page → hook → service); tipos centralizados; lint sem warnings. |
| **Internacionalização** | Interface em português (pt-BR); formatação de moeda e datas em `utils/formatters`. |

### 12.1 Considerações de segurança conhecidas

- Como a autenticação não usa o Supabase Auth, **todo o acesso ao banco ocorre como `anon`**. A segurança de dados depende inteiramente da lógica de filtragem na camada de serviços (filtro por `repCodes`) — **não há RLS por usuário**. Qualquer endpoint exposto com a chave `anon` pode, em tese, consultar dados além do escopo do representante.
- Recomenda-se avaliar a migração para RLS real ou um backend autenticado em evolução futura.

---

## 13. Glossário

| Termo | Significado |
|---|---|
| **ERP** | Sistema de gestão da empresa, origem dos pedidos de venda (somente leitura no portal). |
| **Rep code / código de representante** | Identificador do representante no ERP; chave de match entre portal e pedidos. |
| **Pipeline** | Sequência de estágios pelos quais um pedido passa, da aprovação à entrega. |
| **Rascunho** | Estado inicial e editável de um orçamento. |
| **Operador** | Perfil que analisa e aprova orçamentos, sem acesso às telas de representante. |
| **RLS** | *Row Level Security* — segurança em nível de linha do PostgreSQL/Supabase. |

---

*Documento gerado a partir da análise do código-fonte em 30/06/2026. Para detalhes de implementação, consultar os arquivos referenciados e o `CLAUDE.md` na raiz do projeto.*
