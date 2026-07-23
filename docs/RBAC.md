# RBAC

| Rol | Alcance |
| --- | --- |
| `super_admin` | Control total, incluida administración de roles |
| `admin` | Operación completa salvo promoción de superadministradores |
| `beta_manager` | Beta, usuarios, feedback y analítica necesaria |
| `support` | Usuarios, feedback, errores y actividad |
| `viewer` | Dashboard y analytics en modo lectura |

La UI filtra módulos, pero la autorización real vive en PostgreSQL mediante
`has_admin_permission`. Todas las tablas administrativas tienen RLS activa y
forzada. Las funciones privilegiadas fijan un `search_path` vacío.

El 403 se muestra cuando no existe membresía activa. El correo o la metadata del
usuario nunca se usan como fuente de autoridad.
