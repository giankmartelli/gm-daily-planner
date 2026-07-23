# Rollback

1. Define `VITE_FEATURE_AI_FIRST_PLANNER=false` y vuelve a desplegar para usar la experiencia anterior.
2. Revierte el commit de interfaz si fuera necesario; el esquema es aditivo y no bloquea el cliente anterior.
3. Para un plan aplicado, usa “Deshacer último plan”, que restaura el snapshot anterior.
4. No elimines tablas durante una incidencia. Conserva la auditoría y revoca el uso desde la feature flag.
5. En Vercel, promueve el deployment de producción anterior o ejecuta `vercel rollback <deployment-url>` con una sesión autorizada.
6. El proveedor remoto se desactiva eliminando `OPENAI_API_KEY`; el motor local continúa funcionando.
