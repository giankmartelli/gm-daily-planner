# Changelog

## 2026-07-23 — GM AI OS

- AI Core con interfaces comunes, dependency injection, eventos y repositorios.
- Decision, Energy, Prediction, Morning Brief, Auto Scheduler, Learning y Executive Analytics Engines.
- Dashboard ejecutivo ligero con señales reales y procedencia explícita.
- Outcomes locales aislados por usuario.

## 2026-07-23 — Product Experience 2026

### Added

- Dashboard narrativo con energía, capacidad, objetivos, logros y resumen explicable de GM AI Planner.
- Centro de estadísticas diario, semanal, mensual y anual.
- Métricas de trabajo profundo, superficial, tiempo perdido, mejores y peores días.
- Exportación CSV y vista de impresión preparada para guardar PDF.
- Preferencias Light, Dark y System con persistencia.
- Arquitectura comercial Free, Pro y Teams sin activar cobros.

### Improved

- Composición responsive y jerarquía visual del dashboard.
- Metadatos sociales adaptados al dominio activo.
- Landing de precios preparada para la evolución comercial.

### Security

- Las variables privadas de Stripe quedan reservadas exclusivamente para backend.
- No se añadieron claves de pago ni llamadas de checkout al navegador.

## 2026-07-22 — Planner AI Engine

- Motor determinístico de ranking, energía, planificación diaria y semanal.
- Recálculo, división de tareas, aprendizaje local y adaptadores de calendario.
- Cobertura superior al 95% en statements del módulo.

## 2026-07-21 — Foundation

- React, TypeScript, Vite, Supabase, RLS, sincronización, PWA y diseño premium.
# 2026-07-23

- Añadida función server-side de IA con autenticación, rate limit, timeout, reintento, salida estructurada y fallback local.
- Añadidos ajuste de hora/duración, rechazo, reordenamiento drag-and-drop y teclado con detección de conflictos.
- Añadida revisión diaria de menos de un minuto y reglas adaptativas transparentes.
- Añadido E2E remoto con dos usuarios para RLS, idempotencia, persistencia, rollback, outcome y expiración de sesión.
- Añadido dominio AI Planning Engine con contexto, procedencia, propuestas y decisiones auditables.
- Añadidos proveedores desacoplados y fallback determinístico.
- Añadida ejecución idempotente, deshacer y telemetría sin datos personales.
- Eliminados clima ficticio y energía presentada como hecho confirmado.
- Añadida migración aditiva con RLS para propuestas, decisiones, planes y outcomes.
- Ampliado Command Center con acciones de planificación.
## GM Control Center

- Panel `/admin` aislado del producto.
- Cinco roles con permisos granulares y 403 seguro.
- Dashboard, Beta Manager, usuarios, flags, feedback, anuncios, errores,
  actividad, analytics, AI Admin, seguridad y configuración.
- Tablas administrativas, RLS forzada, auditoría reversible y métricas agregadas.
- Documentación operativa, RBAC, flags, beta y analytics.
