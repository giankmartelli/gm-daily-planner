-- GM Control Center: RBAC, operaciones y telemetría administrativa.
-- Migración aditiva. No modifica ni elimina datos del producto.
create type public.admin_role as enum ('super_admin', 'admin', 'beta_manager', 'support', 'viewer');

create table if not exists public.admin_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.admin_role not null,
  active boolean not null default true,
  granted_by uuid references auth.users(id),
  granted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  before_state jsonb,
  after_state jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.feature_flags (
  key text primary key,
  description text not null default '',
  enabled boolean not null default false,
  rollout_percentage smallint not null default 0 check (rollout_percentage between 0 and 100),
  allowed_roles public.admin_role[] not null default '{}',
  config jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.feature_flag_overrides (
  id uuid primary key default gen_random_uuid(),
  flag_key text not null references public.feature_flags(key) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  group_key text,
  enabled boolean not null,
  expires_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check ((user_id is not null) <> (group_key is not null))
);

create table if not exists public.beta_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text,
  status text not null default 'pending' check (status in ('pending','accepted','expired','revoked')),
  tags text[] not null default '{}',
  internal_notes text,
  expires_at timestamptz,
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_access_status (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','suspended','revoked','waitlist')),
  reason text,
  tags text[] not null default '{}',
  internal_notes text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.feedback_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('error','idea','solicitud','experiencia')),
  status text not null default 'nuevo' check (status in ('nuevo','en_revision','aceptado','descartado','resuelto')),
  title text not null,
  body text not null,
  attachment_url text,
  diagnostic jsonb not null default '{}'::jsonb,
  admin_response text,
  assigned_to uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('announcement','release','maintenance','survey','tip')),
  audience text not null check (audience in ('all','beta','premium','admins')),
  title text not null,
  body text not null,
  status text not null default 'draft' check (status in ('draft','scheduled','published','archived')),
  publish_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.error_events (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null,
  source text not null check (source in ('frontend','backend','supabase','pwa')),
  severity text not null check (severity in ('low','medium','high','critical')),
  message text not null,
  stack text,
  user_id uuid references auth.users(id) on delete set null,
  app_version text,
  device jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open','investigating','resolved','ignored')),
  occurrences integer not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique(fingerprint)
);

create table if not exists public.activity_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  feature text,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_created_idx on public.admin_audit_log(created_at desc);
create index if not exists beta_invitation_status_idx on public.beta_invitations(status, created_at desc);
create index if not exists feedback_status_idx on public.feedback_items(status, created_at desc);
create index if not exists errors_status_idx on public.error_events(status, last_seen_at desc);
create index if not exists activity_user_created_idx on public.activity_events(user_id, created_at desc);
create index if not exists activity_feature_created_idx on public.activity_events(feature, created_at desc);

create or replace function public.has_admin_permission(required_permission text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admin_memberships membership
    where membership.user_id = auth.uid() and membership.active
      and case membership.role
        when 'super_admin' then true
        when 'admin' then required_permission <> 'manage_super_admins'
        when 'beta_manager' then required_permission = any(array['admin.read','beta.manage','users.read','feedback.manage'])
        when 'support' then required_permission = any(array['admin.read','users.read','feedback.manage','errors.read'])
        when 'viewer' then required_permission = any(array['admin.read','analytics.read'])
        else false
      end
  );
$$;

create or replace function public.admin_dashboard_metrics()
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when not public.has_admin_permission('admin.read') then
    jsonb_build_object('forbidden', true)
  else jsonb_build_object(
    'users', (select count(*) from auth.users),
    'activeUsers', (select count(distinct user_id) from public.activity_events where created_at >= now() - interval '30 days'),
    'dau', (select count(distinct user_id) from public.activity_events where created_at >= now() - interval '1 day'),
    'wau', (select count(distinct user_id) from public.activity_events where created_at >= now() - interval '7 days'),
    'mau', (select count(distinct user_id) from public.activity_events where created_at >= now() - interval '30 days'),
    'betaUsers', (select count(*) from public.beta_invitations where status = 'accepted'),
    'suspendedUsers', (select count(*) from public.user_access_status where status = 'suspended'),
    'sessions', (select count(*) from public.activity_events where event_name = 'login' and created_at >= now() - interval '30 days'),
    'errors', (select coalesce(sum(occurrences), 0) from public.error_events where status <> 'resolved'),
    'feedback', (select count(*) from public.feedback_items where status in ('nuevo','en_revision')),
    'featureUsage', (select coalesce(jsonb_object_agg(feature, total), '{}'::jsonb) from
      (select feature, count(*) total from public.activity_events where feature is not null and created_at >= now() - interval '30 days' group by feature) usage)
  ) end;
$$;

create or replace function public.admin_record_audit(
  action_name text, resource_name text, resource_identifier text, previous jsonb, current jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare audit_id uuid;
begin
  if not public.has_admin_permission('admin.read') then raise exception 'forbidden'; end if;
  insert into public.admin_audit_log(actor_id, action, resource_type, resource_id, before_state, after_state)
  values(auth.uid(), action_name, resource_name, resource_identifier, previous, current) returning id into audit_id;
  return audit_id;
end;
$$;

alter table public.admin_memberships enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.feature_flags enable row level security;
alter table public.feature_flag_overrides enable row level security;
alter table public.beta_invitations enable row level security;
alter table public.user_access_status enable row level security;
alter table public.feedback_items enable row level security;
alter table public.announcements enable row level security;
alter table public.error_events enable row level security;
alter table public.activity_events enable row level security;
alter table public.admin_memberships force row level security;
alter table public.admin_audit_log force row level security;
alter table public.feature_flags force row level security;
alter table public.feature_flag_overrides force row level security;
alter table public.beta_invitations force row level security;
alter table public.user_access_status force row level security;
alter table public.feedback_items force row level security;
alter table public.announcements force row level security;
alter table public.error_events force row level security;
alter table public.activity_events force row level security;

create policy admin_memberships_read on public.admin_memberships for select to authenticated using (public.has_admin_permission('admin.read'));
create policy admin_memberships_manage on public.admin_memberships for all to authenticated using (public.has_admin_permission('roles.manage')) with check (public.has_admin_permission('roles.manage'));
create policy admin_audit_read on public.admin_audit_log for select to authenticated using (public.has_admin_permission('audit.read'));
create policy flags_admin_all on public.feature_flags for all to authenticated using (public.has_admin_permission('flags.manage')) with check (public.has_admin_permission('flags.manage'));
create policy flag_overrides_admin_all on public.feature_flag_overrides for all to authenticated using (public.has_admin_permission('flags.manage')) with check (public.has_admin_permission('flags.manage'));
create policy beta_admin_all on public.beta_invitations for all to authenticated using (public.has_admin_permission('beta.manage')) with check (public.has_admin_permission('beta.manage'));
create policy access_admin_all on public.user_access_status for all to authenticated using (public.has_admin_permission('users.manage')) with check (public.has_admin_permission('users.manage'));
create policy feedback_owner_insert on public.feedback_items for insert to authenticated with check (auth.uid() = user_id);
create policy feedback_owner_read on public.feedback_items for select to authenticated using (auth.uid() = user_id or public.has_admin_permission('feedback.manage'));
create policy feedback_admin_update on public.feedback_items for update to authenticated using (public.has_admin_permission('feedback.manage')) with check (public.has_admin_permission('feedback.manage'));
create policy announcements_authenticated_read on public.announcements for select to authenticated using (status = 'published' or public.has_admin_permission('admin.read'));
create policy announcements_admin_all on public.announcements for all to authenticated using (public.has_admin_permission('announcements.manage')) with check (public.has_admin_permission('announcements.manage'));
create policy errors_admin_read on public.error_events for select to authenticated using (public.has_admin_permission('errors.read'));
create policy activity_owner_insert on public.activity_events for insert to authenticated with check (auth.uid() = user_id);
create policy activity_admin_read on public.activity_events for select to authenticated using (public.has_admin_permission('analytics.read'));

revoke all on function public.admin_dashboard_metrics() from public, anon;
grant execute on function public.admin_dashboard_metrics() to authenticated;
revoke all on function public.admin_record_audit(text,text,text,jsonb,jsonb) from public, anon;
grant execute on function public.admin_record_audit(text,text,text,jsonb,jsonb) to authenticated;
revoke all on public.admin_memberships, public.admin_audit_log, public.feature_flags,
  public.feature_flag_overrides, public.beta_invitations, public.user_access_status,
  public.feedback_items, public.announcements, public.error_events, public.activity_events from anon;
grant select, insert, update, delete on public.admin_memberships, public.feature_flags,
  public.feature_flag_overrides, public.beta_invitations, public.user_access_status,
  public.feedback_items, public.announcements, public.error_events, public.activity_events to authenticated;
grant select on public.admin_audit_log to authenticated;

insert into public.feature_flags(key, description, enabled, rollout_percentage) values
('morning_brief','Resumen inteligente matinal',true,100),
('learning_engine','Aprendizaje transparente',true,100),
('prediction_engine','Predicciones deterministas',true,100),
('ai_planner','Planificador inteligente',true,100),
('dark_mode','Modo oscuro',true,100),
('focus_mode','Centro de enfoque',true,100),
('calendar','Calendario',true,100),
('finance','Módulo financiero futuro',false,0),
('health','Módulo de salud futuro',false,0),
('projects','Módulo de proyectos futuro',false,0)
on conflict (key) do nothing;

-- El primer super_admin se asigna manualmente con un UUID verificado:
-- insert into public.admin_memberships(user_id, role) values ('UUID', 'super_admin');
