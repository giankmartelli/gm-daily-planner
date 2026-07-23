# GM Daily Planner — reglas de contribución

## Comandos

- Instalación: `pnpm install --frozen-lockfile`
- Desarrollo: `pnpm dev --host 127.0.0.1`
- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint`
- Unitarias/integración: `pnpm test`
- Cobertura del planner: `pnpm test:planner:coverage`
- E2E: `pnpm test:e2e`
- Build: `pnpm build`
- Seguridad: `pnpm audit --audit-level=low && pnpm audit:security`

## Convenciones

- TypeScript estricto, componentes funcionales y reglas de dominio fuera de React.
- Adaptadores de infraestructura detrás de interfaces; el dominio no importa Supabase.
- Cambios pequeños, retrocompatibles y cubiertos por pruebas.
- No modificar agenda, tareas ni preferencias antes de una confirmación explícita.
- Toda recomendación debe conservar procedencia, confianza, explicación y estado auditable.

## Seguridad y datos

- RLS siempre activo y políticas limitadas a `auth.uid()`.
- Nunca exponer `service_role` ni secretos en variables `VITE_*`.
- No inventar sueño, clima, eventos, datos médicos ni información personal.
- Una fuente ausente se representa como `UNAVAILABLE`; una inferencia como `ESTIMATED`.
- No ejecutar `supabase db reset` ni migraciones destructivas sobre datos existentes.
