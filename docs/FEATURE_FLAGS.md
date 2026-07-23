# Feature Flags

Los flags admiten estado global, porcentaje de rollout, configuración JSON y
overrides por usuario o grupo con expiración.

Los flags iniciales cubren Morning Brief, Learning, Prediction, AI Planner, Dark
Mode, Focus, Calendar, Finance, Health y Projects. Cada modificación desde el
panel se registra con estado anterior y nuevo.

La resolución porcentual debe ser determinista usando el UUID del usuario; no
debe usar `Math.random`, para evitar cambios entre sesiones.
