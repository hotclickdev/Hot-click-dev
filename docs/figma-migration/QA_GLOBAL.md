# QA global final (1-oct-2026)

> **Estado al cierre (P21, 2-oct-2026):** las decisiones pendientes, los huecos de backend, los tests que ya fallaban y cómo verificar están en `CIERRE_MIGRACION.md`. Los estados de las pantallas están en `INVENTORY.md`. Este documento conserva el detalle del módulo.

Rama `feat/figma/base` desde el merge `0257ab74`. Sin push, deploy ni merge. `master` (`b355fd20`) solo se leyó con `git archive`, sin checkout. Auditoría independiente: no se heredó ningún veredicto de los agentes.

## Método

- Líneas base medidas: tsc (3 tsconfig), Vitest, ESLint de todo el frontend, build a directorio temporal, **suite E2E completa** (301 casos) y la misma selección de specs sobre un export de `master`.
- Barrido propio (`sweep`, fuera del repo): 48 rutas x 390 y 1440 px con API simulada. Mide errores de página y de consola, overflow horizontal, redirecciones, textos de anotación de diseño ("por programar"), emojis, `h1`, y botones tapados por elementos fijos.
- Comparación visual directa contra Figma (captura del frame vs captura de la app): checkout paso 1 `28:1083` y ficha de producto móvil `28:839`.

## Resultados

| Verificación | Resultado |
| --- | --- |
| TypeScript (3 tsconfig) | 0 errores |
| Vitest | 99 archivos / 488 tests verdes |
| Build | OK (a directorio temporal; `static/` intacto) |
| Barrido de 96 vistas | 0 errores de página, 0 overflow horizontal, 0 emojis, 0 anotaciones de diseño, 0 redirecciones inesperadas |
| E2E suite completa | 230 pasan, 21 saltados, **50 fallan** (antes de las correcciones) |
| ESLint, todo el frontend | 205 errores y 22 avisos |

### E2E: clasificación de los 50 fallos

La cifra "8 fallos" documentada salía de una corrida parcial por módulos. La suite completa tiene más, y se clasificaron contra `master`:

- **37 fallan igual en `master`** (preexistentes con evidencia): `admin-*`, `mental-model`, `nav-mas`, `emprende`, `home-jobs` x4, `envio-*`, `sistema-*`, `convenios-marquee`, `catalogo-iconos`, `nav-categorias`, `asistente-checkout`, `tienda-checkout:77`, `idioma` x2 y 9 casos de `ui-sin-emoji` que leen archivos ya borrados. La mayoría buscan textos del Home o de la navegación anteriores o requieren un backend.
- **13 son nuevos respecto de `master`**. Causas y acción:

| Test | Causa | Acción |
| --- | --- | --- |
| `idioma` radiogroup con teclado | **Regresión de accesibilidad**: SYS cambió el selector a chips con `aria-pressed`, sin `role=radio` ni flechas | **Corregido** (`OpcionChip`, `HojaIdiomaAccesibilidad`): mismo aspecto Figma, semántica y teclado restaurados |
| `ui-sin-emoji` x7 | Leen archivos renombrados o borrados (`OpinionesSection`, `ProfileOrdersCard`, `EnviosHero`...) o identificadores viejos | Apuntados a los archivos actuales; se confirmó con un escaneo que el código del comprador no tiene emojis |
| `registro-vender` | Esperaba "Bienvenido" (login anterior) | Actualizado a "Ingresá o creá tu cuenta" (Figma `28:1143`) |
| `smoke` catálogo y `/pago/exito` | Textos del diseño anterior; el catálogo duplica el `h1` oculto | Actualizados |
| `tienda-theme:115` | El nombre del ítem del carrito ya no es `heading` (CHK) | Actualizado |
| `emprendedor-wizard` despacho | El diálogo "¿Confirmás que ya enviaste?" desapareció: Figma `37:1780` dibuja un solo botón | Actualizado al flujo nuevo. Ver decisión pendiente |

Tras las correcciones, los 13 pasan; quedan los 37 preexistentes.

### ESLint

205 errores en todo el frontend, ya presentes en gran parte. Comparando por archivo contra `master` sobre los 358 archivos .ts/.tsx cambiados: 27 errores en `master` y 42 ahora. Un solo archivo empeoró: `components/ai/AIChat.tsx`, de 4 a 22 errores `react-hooks/refs` (rama `variante="hoja"` de CAT, `50f3fab8`, mismo patrón que ya había). No es un fallo de ejecución. Pendiente: refactor del hook `useAiChat` para no devolver refs dentro del objeto.

## Diferencias y hallazgos

1. **Corregido**: pérdida de semántica radio y teclado en el selector de idioma (arriba).
2. **Comparados con Figma, sin diferencia**: checkout paso 1 móvil y ficha de producto móvil (solo cambian los datos de ejemplo).
3. **Sin `h1`** en carrito, checkout, `/mis-pedidos`, `/perfil?vista=*`, `/servicios?vista=*`, QR de mesa y cotización. Ya documentado por SHELL (`BarraInterna` pinta `<p>`); arreglarlo exige revisar pantalla por pantalla. Pendiente.
4. **El FAB de WhatsApp tapa parte de las tarjetas** de producto en 390 px (por ejemplo el precio tachado). El FAB solo está en Figma para el Home (`51:2262`). Decisión de SYS pendiente.
5. **Despacho del vendedor sin confirmación**: un toque en "Marcar como despachado" cambia el estado a ENVIADO (con o sin guía). Antes pedía confirmar. Figma no dibuja la confirmación. Decisión pendiente: ¿se agrega una confirmación?

## Inventario global

Se mantienen los estados de `INVENTORY.md` (32 PASS agent verified, 58 PARTIAL). Esta auditoría **no sube ninguna pantalla a PASS definitivo**: confirmó de forma independiente `28:1083` y `28:839` (siguen PARTIAL por las diferencias deliberadas ya documentadas) y no encontró regresiones estructurales en las 48 rutas. Las páginas sin frame (Devoluciones, Información, Contacto, Términos, Privacidad, Nosotros, Ayuda, Cookies como página) no son OLD_DESIGN según el criterio (no existe referencia Figma): quedan sin migrar a la espera de diseño.

No verificado en esta auditoría: pantallas con datos reales (backend), correos en Gmail y Outlook, pagos reales (Tilopay, Stripe), impresión, y la comparación píxel a píxel de las demás pantallas.

## TODOs para cerrar la migración

1. Decisiones abiertas de `PROGRESS.md` (14 a 17, 24 a 35, 38 a 40) y las dos de arriba (FAB sobre tarjetas, confirmación del despacho).
2. Frames de escritorio que faltan: pago exitoso y fallido, hoja tras "Agregar", cookies, transferencia SINPE.
3. Frames para Devoluciones, Información, Contacto, Términos, Privacidad, Nosotros y Ayuda.
4. Backend: provincia de bodega, `tokenSeguimiento`, "Paquete N de M", dirección en pedido, endpoint de empresas públicas, aceptar cotización, fotos de garantía, categoría y autor del blog, `stock` en carrito abandonado, vencimiento de cupón.
5. `h1` en `BarraInterna` / pantallas internas.
6. Refactor de `useAiChat` (refs) para bajar los errores de ESLint de `AIChat.tsx`.
7. Actualizar o retirar los 37 E2E preexistentes que apuntan al diseño anterior.
8. Pruebas de correos en Gmail y Outlook, y QA con datos reales de las pantallas marcadas "agent verified".
9. Regenerar `static/` con `pnpm build` en la entrega (SUP).
