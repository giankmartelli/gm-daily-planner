# Algoritmos

El scheduler existente resta bloques ocupados, ordena vencidas, fechas límite, prioridad y energía, evita solapamientos y conserva tareas no programadas.

## Probabilidad de cumplimiento

`P = 0.45 × capacidad + 0.35 × historial + energía + margen − vencidas − complejidad − fragmentación − cambiosContexto`

- capacidad: `min(1, minutosDisponibles / minutosPlanificados)`;
- historial: valor observado entre 0–1; si no existe, neutral 0,65;
- energía: baja −0,08, media 0, alta +0,06;
- margen: +0,05 con ≥30 minutos libres; −0,05 en otro caso;
- vencidas: −0,04 cada una, máximo −0,20;
- complejidad: −0,025 por tarea sobre cuatro, máximo −0,15;
- fragmentación: −0,02 por bloque ocupado, máximo −0,15;
- cambios de contexto: −0,02 cada uno, máximo −0,12.

El resultado se limita a 0–100 y siempre se presenta como estimación.
