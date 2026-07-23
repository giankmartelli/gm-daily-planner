# Plan de implementación AI-first

## Arquitectura actual

React 19 + TypeScript 6 + Vite 8, sin router. El estado de producto vive en `App.tsx`, con persistencia local mediante `PlannerRepository` y sincronización Supabase en `SyncService`. Supabase conserva días y workspace como JSONB con RLS por propietario. El motor determinístico ya está desacoplado bajo `src/planner`, y `SmartPlannerPanel` genera propuestas que solo se aplican al confirmar.

La PWA usa manifest y service worker propios. Vitest cubre dominio, repositorio y UI; el E2E es un smoke test sin navegador automatizado completo. Vercel publica `main`.

## Riesgos

- `App.tsx` concentra persistencia, sincronización y navegación.
- La propuesta existente no tiene identidad, estados por cambio, auditoría ni deshacer.
- El dashboard muestra clima estático; contradice el requisito de procedencia real.
- Aplicar bloques no es idempotente y no registra estado anterior.
- El esquema remoto no contiene propuestas, decisiones ni outcomes.
- No existe proveedor remoto seguro; se mantendrá desactivado hasta disponer de endpoint server-side.

## Cambios

- `src/ai-planning/*`: modelos, proveedores de contexto, motor, proveedor IA, ejecución reversible, telemetría y feature flags.
- `SmartPlannerPanel`, `DashboardOverview`, `CommandPalette` y `App`: experiencia de revisión, procedencia, confirmación y deshacer.
- Nueva migración aditiva para preferencias, propuestas, cambios, decisiones, planes, outcomes y snapshots.
- Pruebas unitarias, de integración local y documentación AI-first.

## Migración

Solo `create table/index/policy/function`; no se renombran ni eliminan tablas/columnas. RLS forzado, `user_id` obligatorio y estados con constraints. Primero lint SQL/dry-run, después `db push`; nunca `db reset`.

## Pruebas

Disponibilidad, conflictos, ranking, división, descansos, probabilidad documentada, ausencia de fuentes, fallback, validación, idempotencia y rollback. Integración del repositorio local y aislamiento RLS remoto cuando haya sesión administrativa autorizada. E2E: propuesta, rechazo, ajuste, aplicación, recarga y deshacer.

## Rollback

La feature flag `VITE_FEATURE_AI_FIRST_PLANNER=false` conserva el planificador anterior. Las tablas son aditivas y pueden quedar sin uso. La aplicación guarda un snapshot previo local por plan aplicado y permite deshacer. El despliegue conserva el commit anterior de Vercel.

## Criterios de aceptación

Datos reales o marcados como ausentes; propuesta estructurada sin mutación previa; cambios ajustables; aplicación idempotente y reversible; RLS por usuario; fallback determinístico; pruebas, typecheck, lint y build limpios.
