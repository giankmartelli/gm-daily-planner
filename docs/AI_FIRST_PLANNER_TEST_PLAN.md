# Plan de pruebas

Unitarias: disponibilidad, ranking, conflictos, división, descansos, probabilidad, fuentes ausentes, fallback, validación, idempotencia y rollback.

Integración: repositorio local, propuesta → aplicación → persistencia → deshacer. Remoto: migración, CRUD con dos usuarios y verificación RLS.

E2E remoto (`pnpm test:e2e:remote`): crea un segundo usuario QA, valida login, tareas, restricciones, propuesta, rechazo, modificación, aplicación doble idempotente, recarga, persistencia, rollback, outcome, expiración de sesión y aislamiento RLS. Requiere las variables de Supabase y service role solo en el proceso de prueba.

E2E visual: propuesta local, rechazo individual, cambio de duración, aplicación, revisión diaria, tema oscuro y captura completa. El smoke test HTTP cubre rutas, manifest, worker e iconos.
