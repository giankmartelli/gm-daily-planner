# Arquitectura de GM Daily Planner

## GM AI OS

`src/core/ai` aplica Clean Architecture: dominio y motores puros en el centro; proveedores, repositorios, eventos, casos de uso y UI como adaptadores.

```mermaid
flowchart LR
  UI["React / PWA"] --> UC["BuildDailyIntelligence"]
  UC --> P["PlannerEngine"]
  P --> MB["Morning Brief"]
  P --> D["Decision"]
  P --> E["Energy"]
  P --> PR["Prediction"]
  P --> X["Executive Analytics"]
  S["AutoScheduler"] --> PP["PlanProposal"]
  PP --> C{"Confirmación"}
  C -->|Aplicar| R["Local + Supabase"]
  C -->|Descartar| N["Sin cambios"]
  O["PlanOutcome"] --> L["LearningEngine"]
```

```mermaid
flowchart TB
  UI["React · producto y marketing"] --> APP["Casos de uso"]
  APP --> DOMAIN["Dominio · tareas, analytics, Planner AI"]
  APP --> PORTS["Puertos · repositorios, calendario, billing"]
  LOCAL["localStorage · offline first"] --> PORTS
  SUPA["Supabase · Auth, Postgres, Realtime, RLS"] --> PORTS
  STRIPE["Stripe futuro · función server-side"] -.-> PORTS
  CAL["Google / Outlook / Apple futuros"] -.-> PORTS
```

## Capas

- `src/domain`: modelos y funciones puras sin React ni red.
- `src/core/ai`: GM AI OS modular, inyectable y event-driven.
- `src/planner`: Clean Architecture para planificación determinística.
- `src/data`: repositorio offline y reconciliación por fecha de actualización.
- `src/services`: orquestación de sincronización.
- `src/components`: presentación y acciones del usuario.
- `src/billing`: catálogo y contratos comerciales; no contiene secretos ni llamadas de cobro.
- `src/marketing`: páginas públicas, metadata dinámica y adquisición.
- `supabase/migrations`: esquema, triggers, índices, Realtime y políticas RLS.

## Principios de datos

1. La escritura local ocurre primero.
2. Una respuesta remota antigua nunca elimina cambios locales recientes.
3. Toda fila sincronizada contiene `user_id`.
4. RLS verifica `auth.uid()` para lectura y escritura.
5. La service role solo puede existir en backend o tareas operativas seguras.

## Extensibilidad

`PlanningStrategy`, `CalendarAdapter`, `LearningRepository` y `BillingGateway` son límites explícitos. OpenAI, Stripe o calendarios externos deben implementarse detrás de estos contratos; los componentes no deben llamar SDK externos directamente.
