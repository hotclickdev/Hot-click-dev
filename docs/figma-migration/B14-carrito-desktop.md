# B14 — Carrito desktop

Fecha: 2-oct-2026. Investigación. Sin cambios de carrito, CSS, rutas, backend ni tests.

## Estado Git

| | |
| --- | --- |
| Branch | `feat/figma/base` |
| HEAD al comenzar | `264abca4` |
| Master | `b355fd20` |
| PASS / PARTIAL | 37 / 53 |

Frames consultados: `30:2268`, `30:2351`, `30:2269`, `51:1820`, `52:2178`, `28:989`.

Código y docs: `CartPage.tsx`, `ResumenCarrito.tsx`, `ExtrasCarritoMovil.tsx` (`GuardarPorCorreo`), `CHK.md` (Paso 0), `INVENTORY.md`, `B8-decisiones-Figma.md` (Figma-D07).

## Pedir por WhatsApp

### Evidencia

`51:1820` es móvil. El WhatsApp del carrito móvil está en el pie fijo.

`30:2268` / `30:2351` dibujan el resumen de escritorio. `CHK.md` dice que «Pedir por WhatsApp» en escritorio no está en ese frame (`51:1820` es solo móvil). El resumen sin ese enlace medía 521 px. Con el enlace, 551 px.

`ResumenCarrito.tsx` lo monta en escritorio como enlace de texto bajo el botón. El comentario dice que `30:2351` no lo dibuja y que se conservó la función previa. `CHK.md` lo dejó en `REQUIERE_DECISION` junto con «Vaciar pedido». La restauración está en el historial de CHK (`0f017780` en `PROGRESS.md`).

Quitar el enlace en escritorio no quita el WhatsApp móvil. Quita un canal que el código restauró a propósito.

### Clasificación

DECISIÓN HUMANA

### ¿Desbloquea implementación?

No. No hay un frame de escritorio que lo dibuje ni uno que diga quitarlo. La ausencia no es una instrucción de borrado.

## Guardar por correo

### Evidencia

`52:2178` es el bloque móvil. `GuardarPorCorreo` llama a `abandonedCartService.saveAbandonedCart` y oculta la tarjeta si el correo ya se capturó.

`30:2268` no dibuja esa tarjeta. `CHK.md`: el popup anterior también salía en escritorio; el frame no lo dibuja. `CartPage.tsx` lo deja en la columna de productos con el comentario de que no hay frame desktop y se conserva la función.

### Clasificación

DECISIÓN HUMANA

### ¿Desbloquea implementación?

No. Es funcionalidad de recuperar el carrito, no un ajuste de píxeles. Mostrarla o limitarla a móvil es la pregunta abierta de Figma-D07.

## Decisión

Los dos controles se conservan en escritorio porque se restauraron. Los frames de escritorio no los incluyen. Los frames móviles sí cubren la misma función. Elegir si el escritorio los muestra no se deduce de un solo frame.

## Siguiente bloque

B15, envíos y tarifas.
