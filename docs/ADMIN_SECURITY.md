# Seguridad administrativa

- RBAC respaldado por PostgreSQL, no por controles visuales.
- RLS activa y forzada en todas las tablas administrativas.
- Funciones privilegiadas con `security definer`, `search_path` vacío y guardas.
- Anon no tiene privilegios sobre tablas administrativas.
- Las métricas se agregan en servidor.
- Los cambios de flags conservan estado anterior y posterior.
- Acciones con Admin API requieren `service_role` solo en servidor.
- El bootstrap del primer superadministrador es explícito y manual.

Preparado para 2FA y revocación de sesiones; su ejecución requiere endpoints
server-side y no se simula desde el navegador.
