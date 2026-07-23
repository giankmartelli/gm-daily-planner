# Planner Engine V2

El núcleo sigue siendo determinista, independiente de React y compatible con
tareas antiguas.

## Decisiones

- Pesos centralizados en `domain/config.ts`.
- `calculateTaskScore` devuelve puntuación 0–100, confianza, factores y motivos.
- Eventos externos son bloques ocupados; nunca se convierten en tareas.
- Horarios fijos, dependencias, energía, duración restante y periodo preferido
  participan en la planificación.
- Toda salida es una propuesta con identificador, riesgo, conflictos, capacidad y
  aviso de confirmación.
- `DayRescheduler` produce antes, después y cambios sin aplicar.
- El desglose determinista genera preparación, ejecución, revisión y cierre.
- Los patrones aprendidos conservan muestra, confianza, evidencia y estado.

## Rollback

Cada aplicación debe conservar el estado anterior. El usuario puede descartar una
propuesta antes de aplicarla o restaurar la agenda anterior desde el comando
Deshacer. Las migraciones de calendario son aditivas y se pueden aislar
deshabilitando las conexiones sin tocar `planner_days`.
