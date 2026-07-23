# Plan de pruebas

Unitarias: disponibilidad, ranking, conflictos, división, descansos, probabilidad, fuentes ausentes, fallback, validación, idempotencia y rollback.

Integración: repositorio local, propuesta → aplicación → persistencia → deshacer. Remoto: migración, CRUD con dos usuarios y verificación RLS.

E2E: login, tareas, disponibilidad, propuesta, rechazo, ajuste, confirmación, recarga, persistencia y deshacer. El smoke test existente cubre navegación básica; el flujo autenticado remoto requiere credenciales QA válidas.
