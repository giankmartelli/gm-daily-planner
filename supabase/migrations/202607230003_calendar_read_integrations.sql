-- Calendarios externos de solo lectura. Tokens únicamente accesibles desde backend.
create table if not exists public.calendar_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google','outlook')),
  provider_account_id text not null,
  email text not null,
  status text not null default 'active' check (status in ('active','expired','revoked','error','disconnected')),
  scopes text[] not null default '{}',
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, provider, provider_account_id),
  unique(id, user_id)
);
create table if not exists public.external_calendars (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  external_id text not null,
  name text not null,
  timezone text,
  color text,
  selected boolean not null default true,
  read_only boolean not null default true,
  unique(account_id, external_id),
  unique(id, user_id),
  foreign key(account_id, user_id) references public.calendar_accounts(id, user_id) on delete cascade
);
create table if not exists public.external_calendar_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  calendar_id uuid,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google','outlook')),
  external_event_id text not null,
  title text not null default 'Ocupado',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text,
  all_day boolean not null default false,
  recurring_event_id text,
  status text not null default 'confirmed',
  etag text,
  raw_hash text,
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique(account_id, external_event_id),
  unique(id, user_id),
  foreign key(account_id, user_id) references public.calendar_accounts(id, user_id) on delete cascade,
  foreign key(calendar_id, user_id) references public.external_calendars(id, user_id) on delete cascade
);
create table if not exists public.calendar_sync_state (
  account_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  cursor text,
  delta_link text,
  last_synced_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  consecutive_failures integer not null default 0,
  updated_at timestamptz not null default now(),
  foreign key(account_id, user_id) references public.calendar_accounts(id, user_id) on delete cascade
);
create table if not exists public.calendar_event_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  external_event_id uuid not null,
  planner_task_id text,
  planner_block_id text,
  created_at timestamptz not null default now(),
  unique(user_id, external_event_id),
  foreign key(external_event_id, user_id) references public.external_calendar_events(id, user_id) on delete cascade
);
create table if not exists public.calendar_oauth_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google','outlook')),
  state_hash text not null unique,
  code_verifier_encrypted text not null,
  redirect_uri text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists calendar_accounts_user_idx on public.calendar_accounts(user_id,status);
create index if not exists external_events_user_time_idx on public.external_calendar_events(user_id,starts_at,ends_at);
create index if not exists external_calendars_user_idx on public.external_calendars(user_id,selected);
create index if not exists calendar_links_user_idx on public.calendar_event_links(user_id,created_at desc);
create index if not exists oauth_states_expiry_idx on public.calendar_oauth_states(expires_at);

alter table public.calendar_accounts enable row level security;
alter table public.external_calendars enable row level security;
alter table public.external_calendar_events enable row level security;
alter table public.calendar_sync_state enable row level security;
alter table public.calendar_event_links enable row level security;
alter table public.calendar_oauth_states enable row level security;
alter table public.calendar_accounts force row level security;
alter table public.external_calendars force row level security;
alter table public.external_calendar_events force row level security;
alter table public.calendar_sync_state force row level security;
alter table public.calendar_event_links force row level security;
alter table public.calendar_oauth_states force row level security;

drop policy if exists calendar_accounts_owner on public.calendar_accounts;
create policy calendar_accounts_owner on public.calendar_accounts for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists external_calendars_owner_read on public.external_calendars;
create policy external_calendars_owner_read on public.external_calendars for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists external_events_owner_read on public.external_calendar_events;
create policy external_events_owner_read on public.external_calendar_events for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists calendar_sync_owner on public.calendar_sync_state;
create policy calendar_sync_owner on public.calendar_sync_state for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists event_links_owner_all on public.calendar_event_links;
create policy event_links_owner_all on public.calendar_event_links for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists oauth_states_owner on public.calendar_oauth_states;
create policy oauth_states_owner on public.calendar_oauth_states for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.calendar_accounts, public.external_calendars, public.external_calendar_events,
  public.calendar_sync_state, public.calendar_event_links, public.calendar_oauth_states from anon;
revoke all on public.calendar_accounts, public.calendar_sync_state, public.calendar_oauth_states from authenticated;
grant select on public.external_calendars, public.external_calendar_events to authenticated;
grant select,insert,update,delete on public.calendar_event_links to authenticated;

create or replace function public.touch_calendar_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists calendar_accounts_touch_updated_at on public.calendar_accounts;
create trigger calendar_accounts_touch_updated_at before update on public.calendar_accounts for each row execute procedure public.touch_calendar_updated_at();
drop trigger if exists external_events_touch_updated_at on public.external_calendar_events;
create trigger external_events_touch_updated_at before update on public.external_calendar_events for each row execute procedure public.touch_calendar_updated_at();
drop trigger if exists calendar_sync_touch_updated_at on public.calendar_sync_state;
create trigger calendar_sync_touch_updated_at before update on public.calendar_sync_state for each row execute procedure public.touch_calendar_updated_at();

create or replace function public.list_calendar_connections()
returns table(id uuid, provider text, email text, status text, scopes text[], token_expires_at timestamptz, last_synced_at timestamptz, last_error text)
language sql stable security definer set search_path = '' as $$
  select account.id, account.provider, account.email, account.status, account.scopes,
    account.token_expires_at, sync.last_synced_at, sync.last_error
  from public.calendar_accounts account
  left join public.calendar_sync_state sync on sync.account_id = account.id
  where account.user_id = auth.uid();
$$;
revoke all on function public.list_calendar_connections() from public, anon;
grant execute on function public.list_calendar_connections() to authenticated;
