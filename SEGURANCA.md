# SEGURANCA.md — Concrem Connect

Leia este arquivo antes de qualquer alteração no projeto.
Ele documenta as decisões de segurança, os padrões obrigatórios e os anti-patterns específicos deste sistema.
Itens marcados com `[ A IMPLEMENTAR ]` ainda não existem no código e devem ser desenvolvidos.

---

## 1. Visão Geral do Projeto

**Concrem Connect** é um portal web corporativo para representantes da Concrem Portas Premium
gerenciarem orçamentos, pedidos e comissões. O acesso é restrito por login com controle de
permissões granular por perfil de usuário, e operações privilegiadas isoladas em Edge Functions.

**Funcionalidades do sistema:**
- Dashboard com KPIs de vendas, pedidos ativos, comissões e taxa de conversão
- Gestão completa de orçamentos (criar, editar, enviar para análise, aprovar/rejeitar)
- Visualização de pedidos do ERP com pipeline de 9 estágios de acompanhamento
- Carteira de clientes com histórico de compras e métricas
- Títulos financeiros com links para NF e boleto
- Fila de aprovações de orçamentos (operador)
- Gestão de usuários e representantes ERP (admin)

---

## 2. Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| UI | Tailwind CSS v4, Radix UI, Lucide Icons, Recharts |
| Estado assíncrono | TanStack React Query |
| Roteamento | React Router v7 |
| Backend | Supabase (PostgreSQL) com RLS |
| Autenticação | RPC customizado — **não usa Supabase Auth** |
| Edge Functions | Deno/TypeScript no Supabase |
| Proteção de login | Cloudflare Turnstile (modo Managed) `[ A IMPLEMENTAR ]` |
| Deploy frontend | Vercel |

---

## 3. Estrutura de Arquivos

```
.env                              ← VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY (nunca commitar)
vercel.json                       ← headers de segurança e config de deploy
SEGURANCA.md                      ← este arquivo

src/
  contexts/
    AuthContext.tsx               ← sessão, login, logout, guards de autenticação
  pages/
    LoginPage.tsx                 ← tela de login com Turnstile [ A IMPLEMENTAR ]
    admin/
      UsuariosPage.tsx            ← CRUD de usuários (somente admin)
      RepresentantesPage.tsx      ← CRUD de representantes ERP (somente admin)
  services/                       ← toda lógica de acesso ao Supabase
  hooks/                          ← custom hooks com React Query
  components/
    layout/                       ← Layout, Header, Sidebar, MobileNav
    ui/                           ← Card, Button, Input, StatusBadge

supabase/
  functions/
    criar-usuario/                ← cria usuário na tabela com senha hasheada (requer admin)
    alterar-senha/                ← atualiza senha + histórico de hashes [ A IMPLEMENTAR ]
    excluir-usuario/              ← exclui usuário da tabela (requer admin)
```

---

## 4. Autenticação e Login

### RPC customizado (não usa Supabase Auth)

O login é feito via RPC PostgreSQL, não via `supabase.auth.signIn`. Consequências diretas:

- **Todas as queries chegam ao Supabase como role `anon`**, independente do usuário logado
- Não há JWT de sessão do Supabase — a sessão é gerenciada manualmente no `localStorage`
- As tabelas `concremapprep_*` precisam ter RLS desabilitado **ou** policies liberando o role `anon`
- A segurança real dos dados depende das RPCs e das policies do banco, não de token de sessão

```ts
// AuthContext.tsx — login via RPC
const { data } = await supabase.rpc('login', { p_email, p_senha })
// retorna: { id, nome, email, admin, operador, rep_codes }
```

### Sessão no localStorage

A sessão é persistida com a chave `concrem_session`. O objeto armazenado deve ser:

```ts
interface StoredSession {
  id: string
  nome: string
  email: string
  admin: boolean
  operador: boolean
  repCodes: RepresentanteERP[]
  expires_at: number   // timestamp Unix — OBRIGATÓRIO [ A IMPLEMENTAR ]
}
```

**Regras:**
- Toda sessão gravada deve incluir `expires_at = Date.now() + 8 * 60 * 60 * 1000` (8 horas)
- No boot do `AuthProvider`, verificar `Date.now() > expires_at` e fazer logout automático se vencida `[ A IMPLEMENTAR ]`
- Atividade do usuário deve renovar o `expires_at` silenciosamente `[ A IMPLEMENTAR ]`

### Proteção de login com Cloudflare Turnstile `[ A IMPLEMENTAR ]`

- **Turnstile obrigatório** no `LoginPage.tsx`: o botão de submit deve ficar desabilitado até `onTurnstileSuccess` ser chamado pelo widget
- Site Key pública (`VITE_TURNSTILE_SITE_KEY`): pode ficar no `.env` e ser injetada via Vite
- Secret Key (`TURNSTILE_SECRET_KEY`): **somente** como Supabase Secret — jamais no frontend
- A Edge Function `verificar-turnstile` deve ser deployada com `--no-verify-jwt` (é chamada antes do login, sem sessão)

```tsx
// LoginPage.tsx — estrutura com Turnstile
import Turnstile from 'react-turnstile'

const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

<Turnstile
  sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
  onSuccess={(token) => setTurnstileToken(token)}
  onExpire={() => setTurnstileToken(null)}
/>

<button type="submit" disabled={loading || !turnstileToken}>
  Entrar
</button>
```

---

## 5. Senhas

- Mínimo **8 caracteres** — validar no frontend antes de enviar e revalidar na Edge Function
- **Bloqueio das últimas 5 senhas** — tabela `concremapprep_senha_historico`, comparação via SHA-256 `[ A IMPLEMENTAR ]`
- Senhas são hasheadas no banco pelas RPCs `login` e `criar_usuario` — **nunca armazenar texto plano**
- A RPC `alterar_senha` recebe a nova senha e faz o hash internamente — nunca hashear no frontend antes de enviar
- Troca de senha obrigatória no primeiro login controlada pelo campo `trocar_senha BOOLEAN` na tabela `concremapprep_usuarios` `[ A IMPLEMENTAR ]`
- Admin pode ativar/desativar a obrigatoriedade individualmente por usuário `[ A IMPLEMENTAR ]`

```sql
-- Tabela de histórico de senhas [ A IMPLEMENTAR ]
CREATE TABLE concremapprep_senha_historico (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id   UUID REFERENCES concremapprep_usuarios(id) ON DELETE CASCADE,
  senha_hash   TEXT NOT NULL,   -- SHA-256 da senha
  criado_em    TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. Tipos de Usuário e Permissões

| Tipo | admin | operador | Páginas acessíveis |
|------|-------|----------|--------------------|
| Representante | false | false | Dashboard, Orçamentos, Pedidos, Acompanhamento, Clientes, Financeiro, Perfil |
| Operador | false | true | Dashboard, Aprovações, Pedidos, Perfil |
| Admin | true | qualquer | Tudo + Admin › Usuários, Admin › Representantes |

### Guards de rota (App.tsx)

```tsx
// Guard: somente admin
function AdminRoute({ children }) {
  const { user } = useAuth()
  if (!user?.usuario?.admin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

// Guard: operador ou admin
function OperadorRoute({ children }) {
  const { user } = useAuth()
  const ok = user?.usuario?.admin || user?.usuario?.operador
  if (!ok) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

// Guard: bloqueia operador puro de acessar páginas de representante
function RepRoute({ children }) {
  const { user } = useAuth()
  const isOperadorOnly = user?.usuario?.operador && !user?.usuario?.admin
  if (isOperadorOnly) return <Navigate to="/aprovacoes" replace />
  return <>{children}</>
}
```

**Atenção:** os guards protegem a navegação no frontend. A proteção real dos dados é responsabilidade do banco (policies RLS ou lógica nas RPCs). Um usuário que edite o `localStorage` via DevTools pode contornar os guards visuais, mas não deve conseguir dados que o banco não permitiria.

### Regra para adicionar uma nova permissão

1. Definir quais perfis têm acesso (representante / operador / admin)
2. Adicionar o guard adequado na rota em `App.tsx`
3. Esconder o item de menu correspondente no `Sidebar` e `MobileNav` para perfis sem acesso
4. Validar o perfil também na Edge Function ou RPC para operações de escrita
5. Nunca verificar permissão apenas no frontend para operações destrutivas

---

## 7. Chaves e Secrets

- `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` → somente no `.env` (Vite injeta no build)
- `VITE_TURNSTILE_SITE_KEY` → somente no `.env` (chave pública, seguro expor no bundle)
- `SUPABASE_SERVICE_ROLE_KEY` → somente em Edge Functions via `Deno.env.get()`
- `TURNSTILE_SECRET_KEY` → somente como Supabase Secret, nunca no frontend
- **Nunca** expor `service_role` em qualquer arquivo do frontend, mesmo que ofuscado ou em variável de build

---

## 8. Padrões de Edge Functions

Como o sistema não usa Supabase Auth, a verificação de identidade nas Edge Functions é feita consultando `concremapprep_usuarios` com o `id` recebido como parâmetro, em vez de `auth.getUser()`.

### Estrutura padrão

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { solicitante_id, ...payload } = await req.json()

    // 1. Criar cliente com service_role para verificar identidade no banco
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Verificar identidade e permissão (NUNCA pular este passo)
    const { data: solicitante } = await supabase
      .from('concremapprep_usuarios')
      .select('admin, operador, ativo')
      .eq('id', solicitante_id)
      .single()

    if (!solicitante || !solicitante.ativo || !solicitante.admin) {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 3. Executar operação privilegiada
    // ...

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
```

### Regras
- **Sempre** incluir `x-client-info` e `apikey` no `corsHeaders`
- **Sempre** verificar `ativo === true` além do perfil — usuário inativo não deve operar
- **Sempre** responder ao método `OPTIONS` com `corsHeaders` (preflight CORS)
- Nunca confiar no `solicitante_id` passado pelo frontend como prova de identidade sem consultar o banco
- Funções públicas (sem sessão, ex: verificar-turnstile): deploy com `--no-verify-jwt`
- Funções privadas: não usar `--no-verify-jwt`
- Nunca usar `service_role` diretamente no cliente — sempre via Edge Function

---

## 9. Banco de Dados

### Prefixo de tabelas

Todas as tabelas do app usam o prefixo `concremapprep_`. Tabelas do ERP usam `concrem_` e são **somente leitura**.

| Tabela | Finalidade |
|--------|-----------|
| `concremapprep_usuarios` | Usuários do portal (id, nome, email, admin, operador, ativo, trocar_senha) |
| `concremapprep_representantes` | Representantes ERP (codigo, nome, comissao_percentual, ativo) |
| `concremapprep_usuario_representantes` | Vínculo N:N usuário ↔ representante |
| `concremapprep_orcamentos` | Orçamentos criados no portal |
| `concremapprep_orcamento_itens` | Itens dos orçamentos |
| `concremapprep_notificacoes` | Notificações por usuário |
| `concremapprep_senha_historico` | Hashes SHA-256 das últimas senhas usadas `[ A IMPLEMENTAR ]` |
| `concremapprep_audit_*` | Tabelas de auditoria de operações sensíveis `[ A IMPLEMENTAR ]` |

### Convenções SQL obrigatórias

```sql
-- Chave primária
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- Timestamps
criado_em     TIMESTAMPTZ DEFAULT NOW()
atualizado_em TIMESTAMPTZ DEFAULT NOW()

-- Foreign keys com cascade
usuario_id UUID REFERENCES concremapprep_usuarios(id) ON DELETE CASCADE

-- UNIQUE onde aplicável
email TEXT UNIQUE
```

### Vínculo representante ↔ ERP

O campo `concremapprep_representantes.representante_erp` deve ser **idêntico** ao campo `concrem_pedidos_venda.representante` do ERP. É esse match que filtra os pedidos visíveis para cada representante. Qualquer divergência faz o representante não ver nenhum dado.

### RPCs disponíveis

| RPC | Parâmetros | Descrição |
|-----|------------|-----------|
| `login` | `p_email, p_senha` | Autentica e retorna dados do usuário + rep_codes |
| `criar_usuario` | `p_nome, p_email, p_senha, p_admin` | Cria usuário com senha hasheada |
| `alterar_senha` | `p_id uuid, p_senha text` | Atualiza senha do usuário |
| `gerar_numero_orcamento` | — | Gera número sequencial de orçamento |

---

## 10. Deploy

### Frontend — Vercel

Variáveis de ambiente obrigatórias no painel da Vercel:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_TURNSTILE_SITE_KEY=
VITE_USE_MOCK=false
```

`vercel.json` deve conter headers de segurança para todas as rotas:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options",        "value": "SAMEORIGIN" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy",        "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy",     "value": "camera=(), microphone=(), geolocation=()" },
        { "key": "Content-Security-Policy","value": "default-src 'self'; connect-src 'self' *.supabase.co wss://*.supabase.co challenges.cloudflare.com; script-src 'self' 'unsafe-inline' challenges.cloudflare.com; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src fonts.gstatic.com; frame-src challenges.cloudflare.com; img-src 'self' data: blob:; worker-src blob:;" }
      ]
    }
  ]
}
```

**CSP mínima para este stack:**

| Diretiva | Domínios obrigatórios |
|----------|-----------------------|
| `script-src` | `'self'`, `'unsafe-inline'`, `challenges.cloudflare.com` |
| `style-src` | `'self'`, `'unsafe-inline'`, `fonts.googleapis.com` |
| `connect-src` | `*.supabase.co`, `wss://*.supabase.co`, `challenges.cloudflare.com` |
| `frame-src` | `challenges.cloudflare.com` |
| `font-src` | `fonts.gstatic.com` |
| `worker-src` | `blob:` |

Ao adicionar novos scripts ou iframes externos, atualizar `vercel.json` antes do deploy.

### Edge Functions — Supabase

```bash
# Deploy com JWT (funções privadas — padrão)
supabase functions deploy <nome> --project-ref <PROJECT_REF>

# Deploy sem JWT (funções públicas, ex: verificar-turnstile)
supabase functions deploy verificar-turnstile --project-ref <PROJECT_REF> --no-verify-jwt
```

### Cloudflare Turnstile `[ A IMPLEMENTAR ]`

1. Cadastrar o hostname do site no painel da Cloudflare
2. Adicionar `VITE_TURNSTILE_SITE_KEY` no `.env` e na Vercel
3. Configurar a Secret Key como Supabase Secret:
   ```bash
   supabase secrets set TURNSTILE_SECRET_KEY=<valor> --project-ref <PROJECT_REF>
   ```
4. Fazer deploy da Edge Function `verificar-turnstile` com `--no-verify-jwt`

---

## 11. Comandos Úteis

```bash
# Desenvolvimento local
npm install
npm run dev

# Build para produção
npm run build

# Deploy de Edge Function (com JWT — padrão)
supabase functions deploy <nome> --project-ref <PROJECT_REF>

# Deploy de Edge Function (sem JWT — funções públicas)
supabase functions deploy <nome> --project-ref <PROJECT_REF> --no-verify-jwt

# Configurar secret
supabase secrets set CHAVE=valor --project-ref <PROJECT_REF>

# Listar secrets configurados
supabase secrets list --project-ref <PROJECT_REF>

# Ver logs de Edge Function em tempo real
supabase functions logs <nome> --project-ref <PROJECT_REF>
```

---

## 12. O Que NUNCA Fazer (Anti-patterns)

### Frontend
- **Nunca** expor `SUPABASE_SERVICE_ROLE_KEY` em qualquer arquivo do frontend, mesmo que ofuscado ou em variável de build Vite
- **Nunca** confiar nos dados do `localStorage` como prova de permissão para operações destrutivas — validar sempre no banco
- **Nunca** fazer INSERT/UPDATE/DELETE nas tabelas do ERP (`concrem_pedidos_*`, `concremprodutos_*`) — são somente leitura
- **Nunca** sobrescrever dados originais em memória — cálculos derivados (comissões, totais) são aplicados na exibição, os dados base permanecem intocados
- **Nunca** deixar campos de formulário habilitados durante envio — sempre usar `disabled` no estado de loading

### Segurança
- **Nunca** chamar `service_role` diretamente do frontend — sempre via Edge Function
- **Nunca** pular a verificação de identidade na Edge Function antes de operações privilegiadas
- **Nunca** remover o Turnstile do fluxo de login após implementado
- **Nunca** armazenar senhas em texto plano — usar hash no banco via RPC
- **Nunca** gravar sessão no `localStorage` sem `expires_at`
- **Nunca** permitir que um usuário exclua ou altere conta alheia sem verificar perfil na Edge Function
- **Nunca** permitir que um admin exclua a própria conta
- **Nunca** usar `VITE_USE_MOCK=true` em produção

### Deploy
- **Nunca** commitar o arquivo `.env`
- **Nunca** usar `--no-verify-jwt` em funções que requerem usuário autenticado
- **Nunca** adicionar domínio externo (script, iframe, fonte, API) sem atualizar o `Content-Security-Policy` no `vercel.json`

### Banco de dados
- **Nunca** criar tabelas do app sem o prefixo `concremapprep_`
- **Nunca** desabilitar RLS em tabelas de produção sem uma policy `anon` cuidadosamente revisada
- **Nunca** usar `ON DELETE SET NULL` em foreign keys críticas — preferir `CASCADE` ou proteger no nível da aplicação
- **Nunca** fazer operações de escrita sensíveis (criar/excluir usuário, alterar senha de outro) diretamente do frontend — sempre via Edge Function