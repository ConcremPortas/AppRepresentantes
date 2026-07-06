-- ============================================================================
-- Perfis Diretor / Diretor Geral + Grupos de Cliente (escopo por grupo_cliente)
-- Concrem Connect — aplicar no Supabase (SQL Editor). Idempotente onde possível.
--
-- Decisões: grupo_cliente vive em concrem_pedidos_venda; perfil é coluna única
-- em concremapprep_usuarios; enforcement por RLS no banco.
-- ============================================================================

-- 1) PERFIL (coluna única) ----------------------------------------------------
alter table concremapprep_usuarios add column if not exists perfil text;

-- Backfill a partir dos flags atuais (não quebra usuários existentes)
update concremapprep_usuarios
set perfil = case when admin then 'admin'
                  when operador then 'operador'
                  else 'representante' end
where perfil is null;

alter table concremapprep_usuarios drop constraint if exists usuarios_perfil_chk;
alter table concremapprep_usuarios add constraint usuarios_perfil_chk
  check (perfil in ('representante','operador','admin','diretor','diretor_geral'));

-- 2) GRUPOS DE CLIENTE --------------------------------------------------------
create table if not exists client_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  normalized_name text generated always as (upper(btrim(name))) stored,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into client_groups (name) values
  ('LEROY MERLIN'), ('ENGENHARIA'), ('DISTRIBUIDORA CONCREM'), ('REVENDA'),
  ('OUTROS'), ('ENGENHARIA JANDERSON'), ('DAG COMERCIO'), ('SEM GRUPO'),
  ('SIGNATURE'), ('ENGENHARIA KRIZIA')
on conflict (name) do nothing;

-- 3) VÍNCULO DIRETOR ↔ GRUPO (N:N) -------------------------------------------
create table if not exists user_client_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references concremapprep_usuarios(id) on delete cascade,
  client_group_id uuid not null references client_groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, client_group_id)
);
create index if not exists idx_ucg_user on user_client_groups(user_id);

-- 4) FUNÇÕES DE ESCOPO (SECURITY DEFINER) ------------------------------------
create or replace function app_perfil()
returns text language sql stable security definer set search_path = public as $$
  select perfil from concremapprep_usuarios where id = auth.uid()
$$;

-- Normaliza grupo (null/vazio -> 'SEM GRUPO')
create or replace function app_norm_grupo(g text)
returns text language sql immutable as $$
  select coalesce(nullif(btrim(g), ''), 'SEM GRUPO')
$$;

-- true se o pedido está num grupo vinculado ao diretor logado
create or replace function app_diretor_ve_grupo(g text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from user_client_groups ucg
    join client_groups cg on cg.id = ucg.client_group_id
    where ucg.user_id = auth.uid()
      and cg.normalized_name = upper(app_norm_grupo(g))
  )
$$;

-- 5) RLS DAS TABELAS DE GRUPO -------------------------------------------------
alter table client_groups enable row level security;
drop policy if exists cg_read on client_groups;
create policy cg_read on client_groups for select using (true);
-- escrita (criar/renomear/ativar grupo pela tela de gestão): só admin/diretor geral
drop policy if exists cg_admin_write on client_groups;
create policy cg_admin_write on client_groups for all
  using (app_perfil() in ('admin','diretor_geral'))
  with check (app_perfil() in ('admin','diretor_geral'));

alter table user_client_groups enable row level security;
drop policy if exists ucg_self on user_client_groups;
create policy ucg_self on user_client_groups for select
  using (user_id = auth.uid() or app_perfil() in ('admin','diretor_geral'));
drop policy if exists ucg_admin_write on user_client_groups;
create policy ucg_admin_write on user_client_groups for all
  using (app_perfil() in ('admin','diretor_geral'))
  with check (app_perfil() in ('admin','diretor_geral'));

-- 6) RLS DE concrem_pedidos_venda  ⚠️ LER ANTES DE APLICAR --------------------
-- RLS SÓ funciona em TABELA normal do Postgres. Se concrem_pedidos_venda for
-- tabela regular, habilite e crie a policy abaixo. Se for VIEW ou FOREIGN TABLE
-- (FDW), RLS NÃO se aplica — nesse caso mantenha o filtro na camada de service
-- (já implementado no app) e/ou crie uma VIEW SEGURA que embuta este filtro.
--
--   alter table concrem_pedidos_venda enable row level security;
--   drop policy if exists pv_scope on concrem_pedidos_venda;
--   create policy pv_scope on concrem_pedidos_venda for select using (
--     app_perfil() in ('admin','diretor_geral')                 -- visão global
--     or (app_perfil() = 'diretor' and app_diretor_ve_grupo(grupo_cliente))
--     or (app_perfil() in ('representante','operador')          -- escopo de rep
--         and representante in (
--           select r.representante_erp
--           from concremapprep_usuario_representantes ur
--           join concremapprep_representantes r on r.id = ur.representante_id
--           where ur.usuario_id = auth.uid()
--         ))
--   );
--
-- Observação: hoje o app concede `select ... to anon` em concrem_pedidos_venda
-- e filtra na camada de service. Para RLS valer, o app precisa consultar como o
-- usuário autenticado (Supabase Auth) — o que já ocorre após a migração de auth.
-- ============================================================================
