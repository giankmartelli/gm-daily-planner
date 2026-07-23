# GM Daily Planner

Aplicación de productividad creada con React, TypeScript y Vite. Funciona en modo local sin cuenta y, al configurar Supabase, ofrece autenticación, persistencia multiusuario, sincronización en tiempo real y aislamiento mediante Row Level Security (RLS).

## Requisitos

- Node.js 20 o superior.
- pnpm 10 o superior.
- Un proyecto de Supabase para probar autenticación y sincronización.
- Supabase CLI para vincular el proyecto y ejecutar migraciones.

## Instalación

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
```

No confirmes `.env.local` en Git. Ya está incluido en `.gitignore`.

## Variables de entorno

Edita `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_CLAVE_ANON_O_PUBLISHABLE
VITE_SENTRY_DSN=
```

`VITE_SENTRY_DSN` es opcional. Obtén la URL y la clave pública desde **Supabase → Project Settings → API**. La aplicación valida las dos variables obligatorias y continúa de forma segura en modo local si faltan.

Nunca uses `SUPABASE_SERVICE_ROLE_KEY` en una variable `VITE_*`, en `.env.local` compartido con herramientas frontend ni en código dentro de `src/`. Esa clave solo se admite como variable del proceso backend al ejecutar manualmente el script de copias de seguridad.

## Configurar Supabase y ejecutar migraciones

La migración `supabase/migrations/202607210001_initial.sql` crea:

- `profiles`, `planner_days` y `planner_workspaces`;
- claves foráneas hacia `auth.users` con borrado en cascada;
- índices y restricciones de tamaño/integridad JSON;
- RLS forzado en las tres tablas;
- políticas de lectura y escritura limitadas a `auth.uid()`;
- trigger para crear el perfil del usuario;
- triggers de versión y fecha de actualización;
- publicación idempotente de días y espacios en Supabase Realtime.

Instala o ejecuta la CLI, inicia sesión, vincula el proyecto y aplica la migración:

```bash
pnpm dlx supabase@latest login
pnpm dlx supabase@latest link --project-ref TU_PROJECT_REF
pnpm dlx supabase@latest db push
```

Para revisar qué se aplicará antes de modificar la base de datos:

```bash
pnpm dlx supabase@latest db push --dry-run
```

No uses `db reset` contra un proyecto con datos: ese comando puede eliminarlos.

En **Authentication → URL Configuration**, agrega `http://127.0.0.1:5173` y `http://localhost:5173` como URLs de redirección permitidas. Si la confirmación de correo está activa, el usuario deberá confirmar el mensaje recibido antes de iniciar sesión.

## Iniciar la aplicación

```bash
pnpm dev --host 127.0.0.1
```

Abre [http://127.0.0.1:5173](http://127.0.0.1:5173).

## Crear un usuario de prueba

1. Abre la aplicación y pulsa el avatar **GM** o **Conectar cuenta**.
2. Selecciona **Crear una cuenta**.
3. Usa un correo de prueba accesible y una contraseña de al menos 8 caracteres.
4. Confirma el correo si el proyecto de Supabase lo requiere.
5. Inicia sesión. El indicador de nube debe cambiar a sincronizado.

La sesión se conserva mediante el almacenamiento seguro gestionado por Supabase Auth y se recupera al recargar. Los datos locales también se separan por identificador de usuario para evitar mezclas al alternar cuentas.

## Verificación automática

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
pnpm audit --audit-level=low
```

## Planner AI Engine

El planificador inteligente funciona localmente con reglas determinísticas, sin APIs de IA ni transmisión de tareas a terceros. Su arquitectura, API pública, reglas, benchmark y estrategia de evolución están documentados en [docs/PLANNER-AI-ENGINE.md](docs/PLANNER-AI-ENGINE.md).

```bash
pnpm test:planner:coverage
```

## Documentación de producto

- [Arquitectura](docs/ARCHITECTURE.md)
- [Planner AI Engine](docs/PLANNER-AI-ENGINE.md)
- [Design System](docs/DESIGN-SYSTEM.md)
- [Despliegue](docs/DEPLOYMENT.md)
- [Roadmap](ROADMAP.md)
- [Changelog](CHANGELOG.md)

`test:e2e` espera por defecto una aplicación activa en `http://127.0.0.1:5173`. Usa `E2E_BASE_URL` para otra dirección.

## Checklist manual

- [ ] Registrarse y confirmar el correo cuando aplique.
- [ ] Iniciar sesión y recargar; la sesión debe permanecer activa.
- [ ] Crear una tarea con categoría y prioridad.
- [ ] Editar el título de la tarea.
- [ ] Marcarla como completada.
- [ ] Recargar y confirmar que permanece.
- [ ] Eliminarla usando la doble confirmación.
- [ ] Verificar agenda, calendario, objetivos, temporizador y estadísticas.
- [ ] Cerrar sesión e iniciar sesión de nuevo.
- [ ] Crear un segundo usuario y confirmar que no ve datos del primero.
- [ ] Revisar que la consola del navegador no muestre errores.

## Copias de seguridad

Ejecuta el backup solo en una terminal o tarea backend segura. No escribas la service role en archivos del frontend:

```bash
VITE_SUPABASE_URL='https://TU-PROYECTO.supabase.co' \
SUPABASE_SERVICE_ROLE_KEY='VALOR_SECRETO' \
pnpm backup
```

Los archivos se guardan en `backups/`, carpeta ignorada por Git, con permisos de propietario. Conserva copias cifradas fuera del equipo y prueba periódicamente la restauración en un proyecto separado.

## Problemas comunes

- **Modo local / variables faltantes:** comprueba los nombres exactos en `.env.local` y reinicia Vite.
- **Invalid API key:** usa la clave `anon` o publishable, nunca la service role.
- **Email not confirmed:** confirma el correo o ajusta la política de confirmación en Supabase Auth para desarrollo.
- **Failed to fetch / CORS:** verifica la URL del proyecto y que el proyecto de Supabase esté activo.
- **No sincroniza:** ejecuta la migración, confirma que RLS y Realtime están activos y revisa la consola.
- **La migración no aparece:** confirma el vínculo con `pnpm dlx supabase@latest projects list` y vuelve a ejecutar `db push --dry-run`.
