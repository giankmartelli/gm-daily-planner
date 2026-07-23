# Arquitectura AI-first

`ContextProvider<T>` obtiene contexto y lo clasifica como confirmado, estimado o no disponible. `DeterministicPlannerProvider` convierte ese contexto en `PlanProposal`; `RemotePlannerAIProvider` es un puerto opcional con fallback local y nunca contiene secretos. Cada `ProposedChange` conserva estados anterior/propuesto, fuentes, confianza, riesgo y reversibilidad.

El dominio no importa React ni Supabase. La interfaz revisa y acepta cambios; la capa de ejecución aplica únicamente los aceptados con una clave idempotente y conserva el snapshot anterior. Supabase almacena propuestas, decisiones, planes y outcomes bajo RLS.
