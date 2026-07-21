-- GM Daily Planner: esquema multiusuario con aislamiento estricto por propietario.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.planner_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  data jsonb not null default '{}'::jsonb,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, date),
  check (jsonb_typeof(data) = 'object'),
  check (pg_column_size(data) <= 1048576)
);

create table if not exists public.planner_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(data) = 'object'),
  check (pg_column_size(data) <= 2097152)
);

create index if not exists planner_days_user_date_idx on public.planner_days(user_id, date desc);

alter table public.profiles enable row level security;
alter table public.planner_days enable row level security;
alter table public.planner_workspaces enable row level security;
alter table public.profiles force row level security;
alter table public.planner_days force row level security;
alter table public.planner_workspaces force row level security;

drop policy if exists "profiles_owner_all" on public.profiles;
create policy "profiles_owner_all" on public.profiles for all to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
drop policy if exists "days_owner_all" on public.planner_days;
create policy "days_owner_all" on public.planner_days for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "workspace_owner_all" on public.planner_workspaces;
create policy "workspace_owner_all" on public.planner_workspaces for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.profiles, public.planner_days, public.planner_workspaces from anon;
grant select, insert, update, delete on public.profiles, public.planner_days, public.planner_workspaces to authenticated;

create or replace function public.create_profile_for_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.profiles(id, display_name) values(new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))); return new; end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.create_profile_for_user();

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); new.version = old.version + 1; return new; end;
$$;
drop trigger if exists planner_days_updated_at on public.planner_days;
create trigger planner_days_updated_at before update on public.planner_days for each row execute procedure public.set_updated_at();
drop trigger if exists planner_workspaces_updated_at on public.planner_workspaces;
create trigger planner_workspaces_updated_at before update on public.planner_workspaces for each row execute procedure public.set_updated_at();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'planner_days') then
      alter publication supabase_realtime add table public.planner_days;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'planner_workspaces') then
      alter publication supabase_realtime add table public.planner_workspaces;
    end if;
  end if;
end;
$$;
