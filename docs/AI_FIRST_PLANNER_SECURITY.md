# Seguridad

- Ningún secreto se procesa en el navegador.
- El proveedor remoto usa `/api/planner`; `OPENAI_API_KEY` existe solo en el entorno server-side.
- La función exige JWT Supabase válido, limita 12 solicitudes por usuario/minuto, rechaza payloads mayores de 60 KB, usa timeout de 10 segundos y un reintento.
- Solo se envían identificadores técnicos y señales de planificación necesarias; no se envían correos, notas ni títulos al proveedor remoto.
- La salida usa JSON Schema estricto y una segunda validación antes de volver al cliente.
- RLS forzado en todas las tablas AI-first; acceso solo cuando `auth.uid() = user_id`.
- Los cambios incluyen estado, riesgo y auditoría; la ejecución es idempotente.
- Telemetría limitada a conteos y tiempos, sin títulos, correos ni contenido personal.
- No se guarda clima o sueño si la fuente no está configurada.
