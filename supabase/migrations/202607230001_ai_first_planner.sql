-- AI-first planner: esquema aditivo, auditable y aislado por usuario.
create table if not exists public.planning_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now()
);
create table if not exists public.planning_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  status text not null default 'draft' check (status in ('draft','reviewed','accepted','rejected','applied')),
  completion_probability smallint not null check (completion_probability between 0 and 100),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.planning_proposal_changes (
  id uuid primary key,
  proposal_id uuid not null references public.planning_proposals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('proposed','accepted','modified','rejected','applied','failed','reverted')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now()
);
create table if not exists public.planning_decisions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.planning_proposals(id) on delete cascade,
  change_id uuid references public.planning_proposal_changes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  decision text not null check (decision in ('accepted','modified','rejected')),
  created_at timestamptz not null default now()
);
create table if not exists public.applied_plans (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.planning_proposals(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null,
  status text not null check (status in ('applied','reverted','failed')),
  before_state jsonb not null,
  after_state jsonb not null,
  applied_at timestamptz not null default now(),
  unique(user_id, idempotency_key)
);
create table if not exists public.planning_outcomes (
  id uuid primary key default gen_random_uuid(),
  applied_plan_id uuid not null references public.applied_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now()
);
create table if not exists public.context_snapshots (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.planning_proposals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists planning_proposals_user_date_idx on public.planning_proposals(user_id, plan_date desc);
create index if not exists proposal_changes_proposal_idx on public.planning_proposal_changes(proposal_id);
create index if not exists planning_decisions_proposal_idx on public.planning_decisions(proposal_id);
create index if not exists applied_plans_user_date_idx on public.applied_plans(user_id, applied_at desc);
create index if not exists planning_outcomes_plan_idx on public.planning_outcomes(applied_plan_id);
create index if not exists context_snapshots_proposal_idx on public.context_snapshots(proposal_id);

do $$
declare table_name text;
begin
  foreach table_name in array array['planning_preferences','planning_proposals','planning_proposal_changes','planning_decisions','applied_plans','planning_outcomes','context_snapshots']
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_owner_all', table_name);
    execute format('create policy %I on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name || '_owner_all', table_name);
    execute format('revoke all on public.%I from anon', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
  end loop;
end $$;
