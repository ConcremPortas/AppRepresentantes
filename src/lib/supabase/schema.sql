-- ============================================================
-- CONCREM CONNECT — Schema Supabase
-- Autenticação própria (sem Supabase Auth)
-- Prefixo das tabelas da aplicação: concremapprep_
-- Tabelas externas existentes (sem prefixo): concrem_pedidos_venda
-- ============================================================

create extension if not exists pgcrypto;

-- ─── concremapprep_usuarios ───────────────────────────────
create table if not exists concremapprep_usuarios (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  email       text not null unique,
  senha       text not null,   -- bcrypt hash
  admin       boolean default false,
  ativo       boolean default true,
  created_at  timestamptz default now()
);

-- ─── concremapprep_representantes ─────────────────────────
-- Códigos ERP cadastrados pelo admin.
-- representante_erp deve bater exato com concrem_pedidos_venda.representante
create table if not exists concremapprep_representantes (
  id                  uuid primary key default gen_random_uuid(),
  codigo              text not null,          -- "40054603"
  nome_erp            text not null,          -- "DISTRIBUIDORA / MKT LILLIAN 15"
  representante_erp   text not null unique,   -- "40054603 - DISTRIBUIDORA / MKT LILLIAN 15"
  comissao_percentual numeric(5,2) default 0,
  ativo               boolean default true,
  created_at          timestamptz default now()
);

-- ─── concremapprep_usuario_representantes ─────────────────
-- Vínculo N:N: um usuário → vários rep codes ERP
create table if not exists concremapprep_usuario_representantes (
  usuario_id        uuid not null references concremapprep_usuarios(id) on delete cascade,
  representante_id  uuid not null references concremapprep_representantes(id) on delete cascade,
  primary key (usuario_id, representante_id)
);

-- ─── concremapprep_notificacoes ───────────────────────────
create table if not exists concremapprep_notificacoes (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references concremapprep_usuarios(id) on delete cascade,
  tipo        text not null check (tipo in ('pedido','financeiro','sistema')),
  titulo      text not null,
  mensagem    text not null,
  lida        boolean default false,
  link        text,
  created_at  timestamptz default now()
);

-- ─── FUNÇÃO: login ────────────────────────────────────────
create or replace function login(p_email text, p_senha text)
returns json
language plpgsql
security definer
as $$
declare
  v_user   concremapprep_usuarios%rowtype;
  v_reps   json;
begin
  select * into v_user
  from concremapprep_usuarios
  where email = lower(trim(p_email))
    and ativo = true;

  if not found then
    return json_build_object('error', 'Usuário não encontrado ou inativo');
  end if;

  if not (v_user.senha = crypt(p_senha, v_user.senha)) then
    return json_build_object('error', 'Senha incorreta');
  end if;

  select json_agg(r.*)
  into v_reps
  from concremapprep_representantes r
  join concremapprep_usuario_representantes ur on r.id = ur.representante_id
  where ur.usuario_id = v_user.id
    and r.ativo = true;

  return json_build_object(
    'id',        v_user.id,
    'nome',      v_user.nome,
    'email',     v_user.email,
    'admin',     v_user.admin,
    'rep_codes', coalesce(v_reps, '[]'::json)
  );
end;
$$;

-- ─── FUNÇÃO: criar_usuario ────────────────────────────────
create or replace function criar_usuario(
  p_nome   text,
  p_email  text,
  p_senha  text,
  p_admin  boolean default false
)
returns json
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  insert into concremapprep_usuarios (nome, email, senha, admin)
  values (p_nome, lower(trim(p_email)), crypt(p_senha, gen_salt('bf')), p_admin)
  returning id into v_id;

  return json_build_object('id', v_id, 'ok', true);
exception
  when unique_violation then
    return json_build_object('error', 'E-mail já cadastrado');
end;
$$;

-- ─── FUNÇÃO: alterar_senha ────────────────────────────────
create or replace function alterar_senha(p_usuario_id uuid, p_senha_nova text)
returns void
language sql
security definer
as $$
  update concremapprep_usuarios
  set senha = crypt(p_senha_nova, gen_salt('bf'))
  where id = p_usuario_id;
$$;

-- ─── ACESSO ANON ──────────────────────────────────────────
-- Leitura geral
grant select                on concremapprep_usuarios                to anon;
grant select                on concremapprep_representantes           to anon;
grant select                on concremapprep_usuario_representantes   to anon;
grant select                on concremapprep_notificacoes             to anon;
grant select                on concrem_pedidos_venda                  to anon;

-- Operações do painel admin (representantes)
grant insert, update, delete on concremapprep_representantes          to anon;

-- Vínculos usuário ↔ representante
grant insert, delete         on concremapprep_usuario_representantes  to anon;

-- Atualização de usuários pelo admin (nome, admin, ativo)
grant update (nome, admin, ativo) on concremapprep_usuarios           to anon;

-- Notificações
grant update (lida)          on concremapprep_notificacoes            to anon;

-- Funções RPC
grant execute on function login(text, text)                           to anon;
grant execute on function criar_usuario(text, text, text, boolean)    to anon;
grant execute on function alterar_senha(uuid, text)                   to anon;

-- ─── ORÇAMENTOS ───────────────────────────────────────────

create table if not exists concremapprep_orcamentos (
  id                  uuid primary key default gen_random_uuid(),
  numero              text not null unique,               -- "ORC-2026-0001"
  usuario_id          uuid not null references concremapprep_usuarios(id),
  representante_erp   text,                               -- snapshot do rep code
  cliente_cnpj        text not null,
  cliente_nome        text not null,
  cliente_fantasia    text,
  obra_referencia     text,
  condicao_pagamento  text,
  validade            date,
  endereco_entrega    text,
  status              text not null default 'rascunho'
                        check (status in ('rascunho','enviado','em_analise','aprovado','rejeitado')),
  observacoes         text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create table if not exists concremapprep_orcamento_itens (
  id                uuid primary key default gen_random_uuid(),
  orcamento_id      uuid not null references concremapprep_orcamentos(id) on delete cascade,
  produto_id        uuid references concremprodutos_produtos(id),
  produto_codigo    text not null,
  produto_descricao text not null,
  unidade           text default 'UN',
  quantidade        numeric(10,2) not null default 1,
  preco_unitario    numeric(12,2),                        -- preenchido pelo depto de orçamentos
  created_at        timestamptz default now()
);

-- Número automático por ano: ORC-2026-0001
create or replace function gerar_numero_orcamento()
returns text
language plpgsql
security definer
as $$
declare
  v_ano  text := to_char(now(), 'YYYY');
  v_seq  int;
begin
  select coalesce(max(cast(split_part(numero, '-', 3) as int)), 0) + 1
  into   v_seq
  from   concremapprep_orcamentos
  where  numero like 'ORC-' || v_ano || '-%';

  return 'ORC-' || v_ano || '-' || lpad(v_seq::text, 4, '0');
end;
$$;

-- Atualiza updated_at automaticamente
create or replace function touch_orcamento_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_orc_updated_at on concremapprep_orcamentos;
create trigger trg_orc_updated_at
  before update on concremapprep_orcamentos
  for each row execute function touch_orcamento_updated_at();

-- Grants orçamentos
grant select, insert, update on concremapprep_orcamentos      to anon;
grant select, insert, delete  on concremapprep_orcamento_itens to anon;
grant select                  on concremprodutos_produtos       to anon;
grant execute on function gerar_numero_orcamento()             to anon;

-- ─── ALTERAÇÕES EM TABELAS EXISTENTES ────────────────────
-- Novos campos nos itens do orçamento
alter table concremapprep_orcamento_itens
  add column if not exists is_adicional boolean default false;

-- Frete no cabeçalho do orçamento
alter table concremapprep_orcamentos
  add column if not exists frete_tipo  text,
  add column if not exists frete_valor numeric(12,2);

-- ─── HISTÓRICO DE STATUS DE PEDIDOS ──────────────────────
-- Cada linha = uma mudança de status. Status atual = entrada mais recente.
-- Liga com concrem_pedidos_venda.numero_pedido
create table if not exists pedidos_status_historico (
  id            uuid primary key default gen_random_uuid(),
  numero_pedido text not null,
  status        text not null
                  check (status in ('aprovado','liberado','mapeamento','ferragem','comercial','producao','faturado','entrega','finalizado')),
  observacao    text,
  responsavel   text,
  created_at    timestamptz default now()
);

-- Grants
grant select        on pedidos_status_historico to anon;
grant insert        on pedidos_status_historico to anon;
grant select        on pedidos_status           to anon;
grant select        on entregas                 to anon;
grant select        on relatorio_entrega_anexos to anon;

-- ─── ÍNDICES ──────────────────────────────────────────────
create index if not exists idx_orc_usuario    on concremapprep_orcamentos(usuario_id);
create index if not exists idx_orc_status     on concremapprep_orcamentos(status);
create index if not exists idx_orc_cnpj       on concremapprep_orcamentos(cliente_cnpj);
create index if not exists idx_orc_itens      on concremapprep_orcamento_itens(orcamento_id);
create index if not exists idx_usuarios_email on concremapprep_usuarios(email);
create index if not exists idx_ur_usuario        on concremapprep_usuario_representantes(usuario_id);
create index if not exists idx_ur_representante  on concremapprep_usuario_representantes(representante_id);
create index if not exists idx_rep_erp           on concremapprep_representantes(representante_erp);
create index if not exists idx_pedidos_rep       on concrem_pedidos_venda(representante);
create index if not exists idx_pedidos_emissao   on concrem_pedidos_venda(data_emissao);
create index if not exists idx_notif_usuario     on concremapprep_notificacoes(usuario_id);
create index if not exists idx_ped_historico on pedidos_status_historico(numero_pedido);
create index if not exists idx_ped_hist_dt   on pedidos_status_historico(created_at desc);

-- ─── PRIMEIRO ADMIN ───────────────────────────────────────
-- Rode após executar o schema:
--
--   select criar_usuario('Admin Concrem', 'admin@concrem.com.br', 'senha123', true);
--
-- Cadastrar rep code e vincular a um usuário:
--
--   insert into concremapprep_representantes (codigo, nome_erp, representante_erp, comissao_percentual)
--   values ('40054603', 'LILLIAN 15', '40054603 - DISTRIBUIDORA / MKT LILLIAN 15', 15.0);
--
--   insert into concremapprep_usuario_representantes (usuario_id, representante_id)
--   select u.id, r.id
--   from concremapprep_usuarios u, concremapprep_representantes r
--   where u.email = 'lillian@concrem.com.br'
--     and r.codigo = '40054603';
