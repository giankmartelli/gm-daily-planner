# Guía de despliegue

## Variables del frontend

Configurar en Vercel para Preview y Production:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_SENTRY_DSN
VITE_PUBLIC_SITE_URL
VITE_BILLING_ENABLED=false
```

`VITE_PUBLIC_SITE_URL` debe ser el origen HTTPS sin barra final. Al conectar un dominio propio, actualizar esta variable, las URLs permitidas de Supabase Auth, `robots.txt` y `sitemap.xml`.

## Variables exclusivas del backend futuro

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_PRO
STRIPE_PRICE_TEAMS
SUPABASE_SERVICE_ROLE_KEY
```

Nunca deben utilizar el prefijo `VITE_`, almacenarse en el repositorio ni incorporarse al bundle.

## Proceso

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Aplicar migraciones sin destruir datos:

```bash
pnpm dlx supabase@latest db push --dry-run
pnpm dlx supabase@latest db push
```

Después del despliegue:

```bash
E2E_BASE_URL=https://tu-dominio.example pnpm test:e2e
AUDIT_URL=https://tu-dominio.example pnpm audit:security
```

Verificar manualmente registro, confirmación, login, creación de tarea, sincronización, recarga, aislamiento entre usuarios, instalación PWA y modo offline.

## Stripe

Los cobros permanecen desactivados. Antes de habilitar `VITE_BILLING_ENABLED`:

1. Crear Checkout y Customer Portal en una función server-side.
2. Verificar webhooks con firma.
3. Guardar eventos procesados para idempotencia.
4. Asignar permisos únicamente desde el webhook.
5. Probar cancelación, impago, reembolso y recuperación.
