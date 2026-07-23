# Motores

- `PlannerEngine`: fachada y composición por inyección de dependencias.
- `MorningBriefEngine`: resumen estructurado con foco, riesgo, tiempo y fuentes ausentes.
- `DecisionEngine`: score 0–100 con factores documentados.
- `EnergyEngine`: Deep Work, Creative, Administrative, Meetings, Quick Tasks y Recovery.
- `PredictionEngine`: reutiliza la fórmula documentada de probabilidad.
- `AutoScheduler`: produce `PlanProposal`; nunca aplica.
- `LearningEngine`: procesa únicamente outcomes registrados.
- `ExecutiveAnalyticsEngine`: KPIs ligeros sin librerías de gráficas.

Todos implementan `AIEngine<I,O>` o son fachadas de composición.
