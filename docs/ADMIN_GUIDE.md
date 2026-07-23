# GM Control Center

El panel vive en `/admin` y se carga en un bundle separado de GM Daily Planner.
Una sesión válida no concede acceso por sí sola: el usuario debe tener una
membresía activa en `admin_memberships`.

## Activación inicial

1. Aplicar `202607230002_admin_control_center.sql`.
2. Obtener el UUID verificado del administrador.
3. Ejecutar desde el SQL Editor:

```sql
insert into public.admin_memberships(user_id, role)
values ('UUID_VERIFICADO', 'super_admin');
```

Este bootstrap es deliberadamente manual para impedir que el primer usuario
registrado se convierta en administrador.

## Operación

- Acceso: `/admin`.
- El 403 no revela si existe una cuenta o qué roles posee.
- Los cambios de flags escriben una entrada en `admin_audit_log`.
- Invitaciones reales y revocación de sesiones requieren un endpoint server-side
  con `SUPABASE_SERVICE_ROLE_KEY`; nunca se ejecutan desde el navegador.
- La configuración muestra integraciones pendientes sin exponer secretos.

## Recuperación

```sql
update public.admin_memberships set active = false, updated_at = now()
where user_id = 'UUID_VERIFICADO';
```
