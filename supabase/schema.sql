-- ============================================================
-- HoldWallet · esquema do banco (Supabase / Postgres)
-- Cole tudo no SQL Editor do Supabase e clique em "Run".
-- Pode rodar mais de uma vez: os comandos são idempotentes.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- tabelas ----------
create table if not exists public.requests (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references auth.users (id) on delete set null,
  item        text not null check (char_length(item) between 1 and 80),
  price       numeric(12, 2) not null check (price >= 0),
  reason      text not null check (char_length(reason) between 1 and 500),
  owns        text not null default '' check (char_length(owns) <= 160),
  alternative text not null default '' check (char_length(alternative) <= 120),
  image_url   text not null default '' check (char_length(image_url) <= 500),
  author      text not null default 'Anônimo' check (char_length(author) <= 30),
  scope       text not null default 'mural' check (scope in ('mural', 'amigos')),
  deadline    timestamptz not null,
  decision    text check (decision in ('bought', 'held')),
  created_at  timestamptz not null default now()
);

create table if not exists public.votes (
  request_id uuid not null references public.requests (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  side       text not null check (side in ('buy', 'hold')),
  created_at timestamptz not null default now(),
  primary key (request_id, user_id)
);

create table if not exists public.questions (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  user_id    uuid references auth.users (id) on delete set null,
  author     text not null default 'Anônimo' check (char_length(author) <= 30),
  text       text not null check (char_length(text) between 1 and 200),
  answer     text not null default '' check (char_length(answer) <= 300),
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  user_id    uuid references auth.users (id) on delete set null,
  author     text not null default 'Anônimo' check (char_length(author) <= 30),
  side       text not null check (side in ('buy', 'hold')),
  text       text not null check (char_length(text) between 1 and 280),
  created_at timestamptz not null default now()
);

create index if not exists votes_request_idx     on public.votes (request_id);
create index if not exists questions_request_idx on public.questions (request_id, created_at);
create index if not exists comments_request_idx  on public.comments (request_id, created_at);
create index if not exists requests_mural_idx    on public.requests (scope, created_at desc);
create index if not exists requests_owner_idx    on public.requests (owner_id);

-- ---------- view com a contagem de votos ----------
-- security_invoker: a view respeita as regras (RLS) da tabela requests.
create or replace view public.requests_with_votes
  with (security_invoker = true) as
select
  r.*,
  (count(v.*) filter (where v.side = 'buy'))::int  as buy_votes,
  (count(v.*) filter (where v.side = 'hold'))::int as hold_votes,
  count(v.*)::int                                   as total_votes
from public.requests r
left join public.votes v on v.request_id = r.id
group by r.id;

-- ---------- funções auxiliares (rodam como dono, ignorando RLS) ----------
create or replace function public.request_is_open(rid uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.requests
    where id = rid and decision is null and deadline > now()
  );
$$;

create or replace function public.is_request_owner(rid uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.requests
    where id = rid and owner_id = auth.uid()
  );
$$;

-- Abre um pedido pelo link, inclusive os "só com link" (scope = amigos).
create or replace function public.request_by_id(rid uuid)
returns setof public.requests_with_votes language sql security definer stable
set search_path = public as $$
  select * from public.requests_with_votes where id = rid;
$$;

grant execute on function public.request_is_open(uuid)  to authenticated;
grant execute on function public.is_request_owner(uuid) to authenticated;
grant execute on function public.request_by_id(uuid)    to authenticated;

-- ---------- segurança (Row Level Security) ----------
alter table public.requests  enable row level security;
alter table public.votes     enable row level security;
alter table public.questions enable row level security;
alter table public.comments  enable row level security;

drop policy if exists "requests: ler mural ou os meus" on public.requests;
create policy "requests: ler mural ou os meus" on public.requests
  for select to authenticated
  using (scope = 'mural' or owner_id = auth.uid());

drop policy if exists "requests: criar o meu" on public.requests;
create policy "requests: criar o meu" on public.requests
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "requests: editar o meu" on public.requests;
create policy "requests: editar o meu" on public.requests
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "votes: ler" on public.votes;
create policy "votes: ler" on public.votes
  for select to authenticated using (true);

drop policy if exists "votes: votar" on public.votes;
create policy "votes: votar" on public.votes
  for insert to authenticated
  with check (user_id = auth.uid() and public.request_is_open(request_id));

drop policy if exists "votes: mudar o voto" on public.votes;
create policy "votes: mudar o voto" on public.votes
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.request_is_open(request_id));

drop policy if exists "questions: ler" on public.questions;
create policy "questions: ler" on public.questions
  for select to authenticated using (true);

drop policy if exists "questions: perguntar" on public.questions;
create policy "questions: perguntar" on public.questions
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "questions: dono responde" on public.questions;
create policy "questions: dono responde" on public.questions
  for update to authenticated
  using (public.is_request_owner(request_id))
  with check (public.is_request_owner(request_id));

drop policy if exists "comments: ler" on public.comments;
create policy "comments: ler" on public.comments
  for select to authenticated using (true);

drop policy if exists "comments: comentar" on public.comments;
create policy "comments: comentar" on public.comments
  for insert to authenticated
  with check (user_id = auth.uid());

-- ---------- tempo real ----------
do $$
begin
  alter publication supabase_realtime add table public.requests;
exception when duplicate_object then null; end $$;
do $$
begin
  alter publication supabase_realtime add table public.votes;
exception when duplicate_object then null; end $$;
do $$
begin
  alter publication supabase_realtime add table public.questions;
exception when duplicate_object then null; end $$;
do $$
begin
  alter publication supabase_realtime add table public.comments;
exception when duplicate_object then null; end $$;
