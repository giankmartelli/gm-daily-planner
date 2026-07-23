# AI Admin

AI Admin utiliza la telemetría de funciones para mostrar ejecuciones del planner,
uso de IA, fallbacks y proveedor activo. El proveedor inicial es determinista.

La arquitectura permite configurar OpenAI, Claude o Gemini desde un backend
seguro en el futuro. Las claves nunca se guardan en `feature_flags`, la base de
datos accesible al cliente ni variables `VITE_*`.
