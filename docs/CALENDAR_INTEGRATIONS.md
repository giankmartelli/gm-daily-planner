# Integraciones de calendario

## Estado

La arquitectura de Google Calendar y Outlook está preparada en modo de solo
lectura. No debe declararse operativa hasta completar una autorización real,
sincronizar, revocar y volver a autorizar una cuenta de prueba.

## Variables server-side

Estas variables se configuran en Vercel. Ninguna usa el prefijo `VITE_`.

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PUBLIC_SITE_URL`
- `CALENDAR_TOKEN_ENCRYPTION_KEY`
- `GOOGLE_CALENDAR_CLIENT_ID`
- `GOOGLE_CALENDAR_CLIENT_SECRET`
- `MICROSOFT_CALENDAR_CLIENT_ID`
- `MICROSOFT_CALENDAR_CLIENT_SECRET`

`CALENDAR_TOKEN_ENCRYPTION_KEY` debe ser un secreto aleatorio de al menos 32
bytes. Los tokens se cifran con AES-256-GCM antes de enviarse a Supabase.

## Redirect URIs

Para producción:

- `https://gm-daily-planner.vercel.app/api/google-calendar-auth-callback`
- `https://gm-daily-planner.vercel.app/api/microsoft-calendar-auth-callback`

Si se valida un preview, debe registrarse explícitamente su dominio y
`PUBLIC_SITE_URL` debe coincidir exactamente.

## Permisos

Google:

- `openid`
- `email`
- `https://www.googleapis.com/auth/calendar.readonly`

Microsoft:

- `openid`
- `email`
- `offline_access`
- `Calendars.Read`

No se solicita escritura.

## Seguridad

- State aleatorio con hash persistido y expiración de diez minutos.
- PKCE S256 para ambos proveedores.
- Callback server-side.
- Service role solo en funciones Vercel.
- RLS forzada y acceso cliente únicamente a eventos propios.
- Las cuentas y tokens no son seleccionables por el rol authenticated.
- Desconectar revoca el uso local del token sin eliminar tareas.

## Validación manual pendiente

1. Aplicar `202607230003_calendar_read_integrations.sql`.
2. Configurar las variables server-side.
3. Conectar una cuenta Google de prueba.
4. Sincronizar un evento normal, recurrente y eliminado.
5. Confirmar que bloquean tiempo sin convertirse en tareas.
6. Revocar el consentimiento y validar el estado de error.
7. Repetir con Outlook y Microsoft Graph.
