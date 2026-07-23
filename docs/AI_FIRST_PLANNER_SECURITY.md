# Seguridad

- Ningún secreto se procesa en el navegador.
- El proveedor remoto requiere un endpoint server-side futuro.
- RLS forzado en todas las tablas AI-first; acceso solo cuando `auth.uid() = user_id`.
- Los cambios incluyen estado, riesgo y auditoría; la ejecución es idempotente.
- Telemetría limitada a conteos y tiempos, sin títulos, correos ni contenido personal.
- No se guarda clima o sueño si la fuente no está configurada.
