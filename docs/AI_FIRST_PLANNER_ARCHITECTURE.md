# Arquitectura AI-first

`ContextProvider<T>` obtiene contexto y lo clasifica como confirmado, estimado o no disponible. `DeterministicPlannerProvider` convierte ese contexto en `PlanProposal`; `RemotePlannerAIProvider` es un puerto opcional con fallback local y nunca contiene secretos. Cada `ProposedChange` conserva estados anterior/propuesto, fuentes, confianza, riesgo y reversibilidad.

El dominio no importa React ni Supabase. La interfaz revisa, reordena, modifica y rechaza cambios sin persistir la previsualización; la capa de ejecución aplica únicamente los aceptados con una clave idempotente y conserva el snapshot anterior. Supabase almacena propuestas, decisiones, planes y outcomes bajo RLS.

`/api/planner` es una función Vercel server-side. Verifica el JWT con Supabase, reduce el contexto a señales necesarias y llama a OpenAI solo si existe `OPENAI_API_KEY`. El cliente nunca recibe la clave. `RemotePlannerAIProvider` combina explicaciones remotas validadas con el plan determinístico; un fallo conserva intacta la propuesta local.

`DayOutcomeReview` registra una revisión breve. `adaptFromOutcome` ajusta duraciones 30% hacia el tiempo real, carga diaria por cumplimiento/realismo y bloques/descansos por energía y valoración. Cada regla produce una explicación visible.
