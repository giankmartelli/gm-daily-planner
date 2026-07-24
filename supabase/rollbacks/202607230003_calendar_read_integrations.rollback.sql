-- Rollback manual protegido. NO ejecutar durante una operación normal.
-- Falla si existen conexiones o eventos para impedir pérdida silenciosa.
do $$
begin
  if exists(select 1 from public.calendar_accounts limit 1)
    or exists(select 1 from public.external_calendar_events limit 1) then
    raise exception 'Rollback cancelado: desconecta/exporta las cuentas y elimina los datos mediante un proceso aprobado.';
  end if;
end $$;

drop function if exists public.list_calendar_connections();
drop trigger if exists calendar_sync_touch_updated_at on public.calendar_sync_state;
drop trigger if exists external_events_touch_updated_at on public.external_calendar_events;
drop trigger if exists calendar_accounts_touch_updated_at on public.calendar_accounts;
drop function if exists public.touch_calendar_updated_at();
drop table if exists public.calendar_oauth_states;
drop table if exists public.calendar_event_links;
drop table if exists public.calendar_sync_state;
drop table if exists public.external_calendar_events;
drop table if exists public.external_calendars;
drop table if exists public.calendar_accounts;
