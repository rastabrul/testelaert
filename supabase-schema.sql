create table if not exists public.products (
  id text primary key,
  nome text not null,
  sku text,
  categoria text,
  localizacao text,
  estoque_inicial numeric not null default 0,
  estoque_atual numeric not null default 0,
  estoque_minimo numeric not null default 0,
  preco_custo numeric not null default 0,
  preco_venda numeric not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.app_users (
  id text primary key,
  nome text not null,
  usuario text not null unique,
  senha_hash text not null,
  papel text not null default 'vendedor',
  permissoes jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.movements (
  id text primary key,
  tipo text not null check (tipo in ('entrada', 'saida', 'devolucao', 'ajuste')),
  produto_id text not null references public.products(id) on update cascade,
  quantidade numeric not null check (quantidade > 0),
  custo_unitario numeric not null default 0,
  venda_unitario numeric not null default 0,
  usuario_id text,
  vendedor_id text,
  os text,
  observacao text,
  criado_em timestamptz not null default now()
);

create table if not exists public.app_logs (
  id text primary key,
  usuario_id text,
  usuario_nome text,
  acao text not null,
  entidade text not null,
  entidade_id text,
  detalhes jsonb not null default '{}'::jsonb,
  ip text,
  criado_em timestamptz not null default now()
);

create table if not exists public.settings (
  chave text primary key,
  valor text,
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_products_ativo on public.products(ativo);
create index if not exists idx_products_nome on public.products(nome);
create index if not exists idx_movements_produto_id on public.movements(produto_id);
create index if not exists idx_movements_criado_em on public.movements(criado_em desc);
create index if not exists idx_logs_criado_em on public.app_logs(criado_em desc);

create or replace function public.set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists trg_products_atualizado_em on public.products;
create trigger trg_products_atualizado_em
before update on public.products
for each row execute function public.set_atualizado_em();

drop trigger if exists trg_app_users_atualizado_em on public.app_users;
create trigger trg_app_users_atualizado_em
before update on public.app_users
for each row execute function public.set_atualizado_em();

drop trigger if exists trg_settings_atualizado_em on public.settings;
create trigger trg_settings_atualizado_em
before update on public.settings
for each row execute function public.set_atualizado_em();

alter table public.products enable row level security;
alter table public.app_users enable row level security;
alter table public.movements enable row level security;
alter table public.app_logs enable row level security;
alter table public.settings enable row level security;

create or replace view public.financial_summary
with (security_invoker = true) as
select
  coalesce(sum(case when tipo = 'saida' then quantidade * venda_unitario else 0 end), 0) as receita,
  coalesce(sum(case when tipo = 'saida' then quantidade * custo_unitario else 0 end), 0) as custo_saidas,
  coalesce(sum(case when tipo = 'saida' then quantidade * (venda_unitario - custo_unitario) else 0 end), 0) as lucro_bruto
from public.movements;
