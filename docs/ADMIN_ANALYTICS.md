# Analytics administrativo

`activity_events` almacena usuario, evento, función, duración y metadata no
sensible. `admin_dashboard_metrics()` agrega DAU, WAU, MAU, sesiones, errores,
feedback y uso por función sin enviar filas privadas al navegador.

- No se registra contenido de tareas, notas, tokens ni credenciales.
- Las métricas vacías se presentan como ausencia de telemetría.
- Cohortes, churn, NPS y heatmaps requieren volumen y consentimiento reales.
