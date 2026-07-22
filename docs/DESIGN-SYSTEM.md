# GM Product System 2026

## Principios

1. **Calma antes que decoración.** La jerarquía, el espacio y el contraste organizan la experiencia; el color solo comunica estado o acción.
2. **Una escala, muchas superficies.** Todo espacio parte de múltiplos de 4 px. Los bloques de composición usan principalmente 8, 16, 24, 32 y 48 px.
3. **Controles previsibles.** Acciones principales de 42 px, controles compactos de 36 px y radio base de 10–12 px.
4. **Elevación escasa.** Los paneles usan una sombra casi imperceptible; la elevación fuerte queda reservada para diálogos y toasts.
5. **Movimiento funcional.** Las transiciones duran 140–220 ms. El resorte solo se usa para confirmación y entrada de superficies.

## Fundamentos

- Primary: `#4F6BFF`
- Accent: `#7C5CFF`
- Background: `#F7F8FC`
- Cards: `#FFFFFF`
- Border: `#E8EBF2`
- Texto: neutral 900; texto secundario: neutral 500
- Tipografía: Inter con fallback al stack del sistema
- Card radius: 24 px
- Duración estándar: 220 ms

Los valores canónicos viven en `src/design/*.ts` y se exponen a CSS desde `src/design/system.css`.

## Arquitectura

- `system.css`: tokens globales, sin decisiones de página.
- `product-system.css`: recetas visuales del producto y responsive.
- `marketing.css`: lenguaje de la web pública, compartiendo los mismos tokens.
- `product.css`: contratos históricos de layout y nombres de clase; se conserva para mantener compatibilidad funcional.

## Accesibilidad

- Anillo de foco uniforme en todos los elementos interactivos.
- Objetivos táctiles de 36–44 px.
- Contraste AA en textos y estados.
- `prefers-reduced-motion` desactiva animaciones no esenciales.
- Los estados nunca dependen exclusivamente del color.

## Reglas para nuevas superficies

- No introducir colores hexadecimales fuera de `colors.ts` y `system.css`.
- No crear una altura de botón nueva si 36 o 42 px resuelve el caso.
- No aplicar sombra fuerte a una card estática.
- No usar texto menor de 10 px salvo metadatos auxiliares.
- Reutilizar `.panel`, `.panel-title`, controles y variables del sistema antes de crear una receta nueva.
