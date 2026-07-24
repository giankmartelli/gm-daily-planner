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

Desarrollo con `vercel dev`:

- `http://localhost:3000/api/google-calendar-auth-callback`
- `http://localhost:3000/api/microsoft-calendar-auth-callback`

Para producción:

- `https://gm-daily-planner.vercel.app/api/google-calendar-auth-callback`
- `https://gm-daily-planner.vercel.app/api/microsoft-calendar-auth-callback`

Si se valida un preview, debe registrarse explícitamente su dominio y
`PUBLIC_SITE_URL` debe coincidir exactamente.

El preview todavía no existe porque esta fase prohíbe desplegar. Por tanto, no es
posible proporcionar honestamente una URI literal hasta que Vercel genere el
dominio. En ese momento serán exactamente:

- `https://DOMINIO_EXACTO_DEL_PREVIEW/api/google-calendar-auth-callback`
- `https://DOMINIO_EXACTO_DEL_PREVIEW/api/microsoft-calendar-auth-callback`

No se deben registrar comodines.

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

## Checklist Google Cloud

1. Crear o seleccionar un proyecto exclusivo para GM Daily Planner.
2. Configurar OAuth consent screen y datos públicos de soporte.
3. Añadir solamente los usuarios de prueba autorizados mientras la aplicación
   permanezca en modo Testing.
4. Habilitar Google Calendar API.
5. Crear credencial OAuth 2.0 de tipo Web application.
6. Registrar cada redirect URI literal de desarrollo, preview y producción.
7. Copiar Client ID y Client Secret únicamente a variables server-side.
8. Confirmar que los scopes son `openid`, `email` y `calendar.readonly`.
9. Completar consentimiento con una cuenta de prueba, nunca una cuenta personal.
10. Sincronizar, modificar, eliminar y revocar un evento de prueba.

## Checklist Microsoft Entra

1. Crear una App registration dedicada.
2. Seleccionar el tipo de cuentas permitido según la estrategia comercial.
3. Añadir plataforma Web y cada redirect URI literal.
4. Configurar `Calendars.Read` como permiso delegado.
5. Conservar `offline_access`, `openid` y `email`.
6. Crear un client secret con expiración y registrar su rotación.
7. Guardar Application Client ID y secret solo en Vercel.
8. Confirmar que PKCE permanece activo.
9. Probar `nextLink`, `deltaLink`, recurrencia, eliminación y consentimiento
   revocado con un tenant/cuenta de prueba.

## Historial y rollback

`202607230002_admin_control_center.sql` se conserva byte por byte porque ya fue
aplicada remotamente. `003` es la migración aditiva de calendarios. No se
reutilizan números ni se reescribe el historial.

El rollback manual se encuentra en
`supabase/rollbacks/202607230003_calendar_read_integrations.rollback.sql` y se
niega a eliminar tablas si detecta cuentas o eventos.
