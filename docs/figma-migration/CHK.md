# CHK · Carrito, checkout, pago y hojas

> **Estado al cierre (P21, 2-oct-2026):** las decisiones pendientes, los huecos de backend, los tests que ya fallaban y cómo verificar están en `CIERRE_MIGRACION.md`. Los estados de las pantallas están en `INVENTORY.md`. Este documento conserva el detalle del módulo.

Rama `feat/figma/chk`. Archivo Figma `TmxYFj2nauu10WZnZ0t6yt`. Este documento lo mantiene CHK; INVENTORY y PROGRESS los actualiza el supervisor.

## Hoja "Agregado a tu pedido" `45:1607` (móvil)

Veredicto: PASS reportado por agente (móvil). Desktop: REQUIERE_DECISION.

Componente nuevo: `components/comprador/HojaAgregadoAlPedido.tsx`, sobre `HojaInferior` (velo n/900 opaco, esquinas 22, agarradera 40x4: coincide con `45:1612`).

| Medida (390x844) | Figma | App |
| --- | --- | --- |
| Hoja y / alto | 516 / 328 | 516 / 328 |
| Título "Agregado a tu pedido" y / ancho / alto | 546,5 / 191 / 21 | 546,5 / 190,7 / 21 |
| Nombre y / alto | 606 / 16 | 606 / 16 |
| Precio de la tarjeta y / alto | 612,5 / 19 | 612,5 / 19 |
| Texto del aviso de envío y / alto | 684 / 32 | 684 / 32 |
| Botones y / alto (Seguir, Ver pedido) | 772 / 44, 42 | 772 / 44, 42 |
| Botones ancho | 175, 173 | 175, 173 |
| Fondo del aviso, botón primario | #E9F7F0, #E73B33 | idénticos (medidos en píxeles) |

Diferencias conocidas: ancho del precio Sora 60 vs 58,2 (métricas de fuente, igual que PROD). Para igualar alturas de Sora se fijaron `leading` de 19 y 18 px (Chrome da 20 y 19 con `normal`), y el título lleva `tracking-normal` (el `h2` global aplica -0,02em).

Reglas de contenido (lo que Figma dibuja y lo que no):
- "Tu pedido · N productos" cuenta líneas del carrito; el total suma `precio x cantidad` del carrito.
- El aviso verde de envío ya pagado se muestra solo si el carrito tiene otro producto del mismo negocio (mismo `empresaId`, o mismo nombre si no hay id). Figma solo dibuja ese caso. **El caso "primer producto del paquete" no está dibujado: hoy se omite el aviso. Pendiente de decisión de diseño.**
- Token ausente: `bg-hc-success-bg` no existe como utilidad (SHELL); se usa `bg-[var(--hc-success-bg)]`. Pedir a SHELL el alias `--color-hc-success-bg`. **P03:** el alias ya existe; el checkout lo usa. `HojaAgregadoAlPedido` todavía usa `var()` (componente compartido, queda para P13).

## Dependencia: cableado desde la ficha (excepción autorizada, archivos de PROD)

Cambio mínimo en archivos de PROD:
- `pages/producto/useProductDetail.ts`: estado `hojaAgregadoAbierta`; en `agregarAlPedido({ conAviso: true })`, si `matchMedia('(max-width: 1023.98px)')` coincide abre la hoja y no muestra el toast; en desktop se conserva el toast y el botón "Añadido". Constante `MEDIA_MOVIL`. Se eliminó código muerto de "Comprar ahora": `handleComprarAhora`, `showSticky` y su `IntersectionObserver`.
- `pages/ProductDetailPage.tsx`: importa y renderiza `<HojaAgregadoAlPedido abierta onCerrar producto cantidad />` al final del `MainLayout`; lee `hojaAgregadoAbierta` y `setHojaAgregadoAbierta` del hook.
- La ficha no se rediseñó. `cartStore.addItem` y la analítica no cambiaron.

## Flujo móvil verificado (Playwright, 390x844, API simulada)

1. Ficha normal con otro producto del mismo negocio en el carrito: Agregar abre la hoja con aviso de envío; "Ver pedido" navega a `/carrito`.
2. "Seguir comprando" cierra la hoja, queda en `/productos/150`, `body.overflow` se restablece y el botón Agregar sigue operativo.
3. Sin carrito previo: la hoja abre sin aviso de envío.
4. Producto con tallas: abre la hoja (Zapatos, Bruma Café, 1 unidad, total del carrito).
5. Personalizado precio fijo: sin notas no agrega (toast de aviso, comportamiento previo); con notas abre la hoja.
6. Cotizable: solo existe "Solicitar encargo" (envía el encargo y navega a `/encargo/:token`); no usa la hoja.
7. Agotado: solo "Agotado" deshabilitado; no hay camino de compra, la ficha mantiene el botón de atrás sobre la foto.
8. Desktop 1440: no abre la hoja; sigue el toast y el header con carrito.

## REQUIERE_DECISION

- Qué debe pasar tras Agregar en desktop: Figma no define hoja ni cajón desktop. Hoy: toast + botón "Añadido" + enlace al carrito del header.
- Aviso de envío cuando el producto es el primero de su negocio (ver arriba).

## Tests

- `tests/pdp-comprar-ahora.spec.ts` se reemplazó por `tests/pdp-agregar-hoja.spec.ts` (Agregar, hoja, Ver pedido a `/carrito` sin pedir cuenta; Seguir comprando). Pasa contra Vite en :3400.
- `tests/ui-sin-emoji.spec.ts`: se retiró la línea de `TitleAndBadges.tsx` (archivo borrado). Ese spec tiene otros 9 casos que ya fallaban en la base por archivos borrados por otras migraciones (home, admin, etc.); no son de CHK.

Claves i18n de `product.*` (`buyNow`, `trust*`, `quantity`, `outOf`, `maxAvailable`) son de PROD: no se borraron.

## Paso 0: verificación de las 5 eliminaciones (evidencia: Figma + `git show 11af2c0a:<ruta>`)

Frames de carrito revisados: `28:989`, `30:2268`, `51:1820`, `45:1692` (vacío) y `52:2139`/`52:2178`/`52:2223`. Ninguno dibuja una grilla de productos genéricos.

| Eliminado | Reemplazo | Resultado |
| --- | --- | --- |
| `AbandonedEmailPrompt` (popup a los 45 s, sin sesión, solo si no había correo capturado, `isValidEmail`, Enter guarda, confirmación y cierre a 1,8 s) | `GuardarPorCorreo` (`52:2178`) en móvil | Misma función y misma llamada `abandonedCartService.saveAbandonedCart(items, correo)` + `guardarEmailCarritoLocal`; errores con el toast `common.error`. Se perdió la regla "no volver a pedir el correo ya capturado": **restaurada** (`emailCarritoYaCapturado`, la tarjeta se oculta tras guardarlo). **Pérdida respaldada solo en parte:** el popup aparecía también en escritorio; Figma `30:2268` no dibuja el bloque. REQUIERE_DECISION (¿mostrarlo en escritorio?). |
| `CartItemRow` | `FilaProductoCarrito` (`37:1528`, `38:1373`) | Cubre cantidad (±, tope `stock`/99, `aria-label`), eliminar, precio de la línea, "Personalizado", imágenes y notas de referencia, imagen o placeholder. Se agregó "Mover a favoritos" (Figma). Sin variantes ni favorito en el original; no había analítica en el componente. Se pierde el precio unitario visible (Figma muestra el de la línea). |
| `CartSummary` | `ResumenCarrito` (`37:1647`, `30:2351`) | Cubre subtotal, envío por paquete, total, IVA, botón a `/checkout`, WhatsApp (móvil, pie fijo), cupón y descuento/gift card. Perdidos y no dibujados en Figma: stepper de pasos (`CheckoutStepper`), `ShippingProgress` (meta de ₡15.000 de envío gratis: el modelo ahora cobra envío por paquete; sigue en `MiniCartFooter`, de SHELL), botón "Vaciar pedido", enlace "Seguir comprando" y, en **escritorio**, "Pedir por WhatsApp" (`51:1820` es solo móvil). REQUIERE_DECISION: vaciar pedido y WhatsApp en escritorio. |
| `CrossSellGrid` (4 destacados con stock, "Completa tu compra"; `getDestacados` con respaldo a `getAll(0,12)`; en vacío "Te puede interesar") | `SumaMismaTienda` (`37:1595`, `38:1439`) y destacados del vacío (`45:1692`) | **No es lo mismo.** `SumaMismaTienda` sugiere 1 producto de la misma tienda por paquete (con envío ya pagado); usa los mismos destacados con respaldo. La grilla genérica no existe en ningún frame de carrito: eliminación respaldada por Figma. El vacío muestra 2 destacados (Figma). |
| `AICartSection` (`AIChat` con `autoQuery` al montar, contexto `CARRITO:items:total`, `sessionKey hotclick-cart`, respuestas y tarjetas de producto en línea) | `AsistentePedido` (`52:2223`) | **No equivalente.** Figma solo dibuja una entrada que abre el asistente global (`chatStore.open(pregunta)`). Se pierden: la consulta automática al abrir el carrito, el contexto del carrito enviado al asistente y las sugerencias en línea. REQUIERE_DECISION: ¿enviar el contexto del carrito con la pregunta? ¿mantener el panel? Se deja como Figma. |

## Pantallas CHK

Veredictos "agent verified" (sin QA independiente). Móvil medido en 390x844 con DOM + diferencia de píxeles contra la captura de Figma; escritorio en 1440. Las diferencias de texto por antialias o por datos de ejemplo (fotos, "Sale de San José") no cuentan. Todas las pantallas se probaron con API simulada (`context.route('**/api/**')`).

| Pantalla | Ruta | Frame | Veredicto | Notas |
| --- | --- | --- | --- | --- |
| Carrito móvil | `/carrito` | `28:989`, `51:1820` | PARTIAL | Medidas iguales. Faltan por falta de dato: línea "Sale de San José" por paquete (el producto no trae provincia de la bodega). El cupón/notas/gift card (`51:1820`) funcionan con el store `pedidoExtras`. Guardar por correo y asistente: ver Paso 0. |
| Carrito escritorio | `/carrito` | `30:2268` | PARTIAL | Cupón con "Agregar cupón"; la gift card (con sesión) va dentro del mismo despliegue (Figma no la dibuja en escritorio). |
| Carrito vacío | `/carrito` | `45:1692` | PASS | Móvil. En escritorio se centra con el mismo ancho (sin frame). |
| Checkout 3 pasos móvil | `/checkout` | `28:1083`, `29:1248`, `29:1344`, `51:2000` | PARTIAL | Paso 1 y 3 coinciden al píxel; paso 2 coincide salvo datos. Provincia/cantón/señas se compone en `direccion` (mismo campo del backend). El envío normal se ofrece como GAM o fuera del GAM según el cantón destino (Figma lo muestra por origen: falta ese dato). Envío rápido solo dentro del GAM. Marca por defecto SINPE (Figma). Extras no dibujados y obligatorios: consentimiento de datos (Ley 8968), cédula SINPE, nombre con sesión. Cédula y atajo de envío internacional quedan como están (REQUIERE_DECISION). |
| Checkout escritorio | `/checkout` | `30:2385` | PARTIAL | Posiciones y tamaños medidos iguales. Diferencias: el pago SINPE despliega instrucciones/cédula debajo; el atajo internacional y el consentimiento no están en el frame. |
| Tarjeta de regalo válida / inválida | `/checkout` (paso 3 con sesión) | `55:2220`, `55:2284` | PARTIAL | Tarjeta de códigos y resumen con "Total restante" y nota; el frame usa una barra "Pago · paso 3 de 3" y un número de pedido previo al pago que no existen en el flujo. |
| Pago exitoso | `/pago/exito?order=` | `29:1932` | PARTIAL | Móvil igual al frame con los datos que hay. Nombre, correo y paquetes vienen del resumen guardado al pagar (`sessionStorage`). Perdidos: garantía de 40 días, `AIPostPaySection`, "Imprimir", desglose método/tarjeta. "Ver mi pedido" para invitado requiere `tokenSeguimiento` del backend; "Crear mi cuenta con un toque" lleva a `/registro` (el frame lo marca NUEVO · por programar). Escritorio: REQUIRES_DESIGN_REFERENCE. |
| Pago fallido / cancelado | `/pago/cancelado`, error de pago | `29:1999` | PARTIAL | Móvil igual; reintento Tilopay intacto. Escritorio: REQUIRES_DESIGN_REFERENCE. |
| Pago en revisión (SINPE y timeout) | `/checkout` (estado), `/pago/exito` (timeout) | `45:1640` | PASS móvil | Diferencia de píxeles solo en antialias. La pantalla previa (transferencia + comprobante) no tiene frame: se rehízo con el estilo del paso de pago (REQUIRES_DESIGN_REFERENCE). Si el comprobante ya se eligió en el paso de pago, se envía solo. |
| Recuperar carrito | `/recuperar-carrito/:token` | `29:2036` | PARTIAL | Igual al frame; "Disponible · quedan N" solo si el backend devuelve `stock`. Se conservó "Explorar productos nuevos". |
| Despacho del vendedor | `/emprendedor/pedidos/:id` | `37:1780` | PARTIAL | Productos, dirección y guía de Correos con `PUT /pedidos/:id/guia` (deja ENVIADO y avisa al cliente). Faltan datos del backend: "Paquete N de M", forma de entrega y "Tu pago por este paquete" (comisión). El frame marca todo NUEVO · por programar. |

## Verificación y reglas aplicadas

- Fuentes reales (Sora, Public Sans) con `document.fonts.ready`; alturas con `line-height` explícito donde el valor `normal` de Figma difiere del 1,5 heredado (títulos de 18/19/20 px, texto de 15 px, totales de 17 px).
- Regla global de `index.css` (`max(16px, 1em)` en inputs bajo 768 px, anti-zoom iOS) hace que los campos midan 16 px y no 14/15 px del frame; es de SHELL y se acepta. **P03 (2-oct-2026):** SHELL excluye `.hc-figma-ui`, así que los campos del checkout ya miden 15 px como el frame.
- Radios: las utilidades `rounded-xl/lg/2xl` apuntan a tokens más grandes que los del Figma; se usan valores explícitos (`rounded-[12px]`).
- Las etiquetas "NUEVO · por programar" y las notas de diseño de Figma no llegan a la UI.
- `PaymentStatusPage`: se reinicia la marca de consulta al desmontar; en StrictMode (solo dev) el segundo montaje no volvía a consultar el pago y la pantalla quedaba en carga.

## Flujo móvil Ficha -> hoja -> carrito (Playwright, 390x844, API simulada)

1. `/productos/121` (Casa Luna 506) con otro producto de la misma tienda en el carrito: "Agregar" abre la hoja `45:1607` con el aviso de envío ya pagado (solo existe con otro producto del mismo negocio; en el primero se omite, decisión del usuario).
2. "Seguir comprando" cierra la hoja y deja la ficha en la misma URL; "Agregar" vuelve a abrirla.
3. "Ver pedido" navega a `/carrito`.
4. Escritorio: sin hoja; toast + botón "Añadido" + carrito del header. REQUIRES_DESIGN_REFERENCE (provisional: Figma no define interacción desktop).
Spec: `tests/pdp-agregar-hoja.spec.ts`.

## Cierre (agent verified)

- `npx tsc --noEmit`: limpio.
- `npx vitest run`: 86 archivos / 398 tests verdes (nuevos: `pages/checkout/checkoutFigma.test.ts`; `codigoDescuento.test.ts` apunta a `PasoPago` y al carrito).
- Playwright contra Vite :3400: `cart-cta` (6), `checkout-cta` (7), `pdp-agregar-hoja` y `visitante-compra` verdes. `cart-cta` y `checkout-cta` se reescribieron para el flujo nuevo; al reescribirlos apareció un error real: tras un pago fallido el checkout volvía al paso 1 sin mostrar el error (el paso vive ahora en `useCheckoutForm`). Siguen fallando fuera de CHK `asistente-checkout` y `envio-rapido` (Home y asistente global).
- eslint sobre lo tocado: sin errores nuevos. Queda el error `react-hooks/set-state-in-effect` de `useCheckoutForm.ts` que ya existía en la base (efecto de métodos de envío por paquete).
- `npx vite build --outDir "$TEMP/chk-build-check" --emptyOutDir`: OK.
- Se corrigió además un archivo que quedó con codificación inválida (`PaymentStatusPage.tsx`, reescrito en UTF-8).
- Sin pantalla de Figma, quedan con el estilo anterior: `CheckoutPaidGiftCard`, `CheckoutTilopayCard`, `CheckoutLoading`, `CheckoutEmpty` y `PagoLoading` (REQUIRES_DESIGN_REFERENCE).

## P03 · implementación de CHECKOUT (2-oct-2026)

Sin acceso directo a Figma. Las referencias son las de este documento, `B10-checkout-decisiones.md`, `B15-envios-decisiones.md` y `DECISIONES_SYS_CHK.md`.

- **Remedido** con Playwright a 390 (pasos Datos, Entrega y Pago) y a 1440: sin desborde horizontal ni errores de consola. Los campos miden 15 px (antes 16 px por la regla de SHELL).
- **Tokens:** `PasoPago` (radio de método, «Más usado», casilla de consentimiento), `PasoEntrega` (radio de envío, ícono de origen) y `CodigoDescuento` (aviso válido) usan `bg-hc-success-bg`, `border-hc-n-400`, `text-hc-n-400` y `accent-hc-blue-600`. El color calculado es el mismo; `checkout-responsive.spec.ts` lo comprueba.
- **Sin cambio, sigue PARTIAL:**
  - D04: consentimiento Ley 8968.
  - D05: cédula SINPE.
  - D08: bloques extra en escritorio.
  - D18: atajo internacional en escritorio.
  - Las cuatro son DECISIÓN HUMANA sin respuesta (B10, B19 lista D).
  - Tiempos de envío («30 min a 2 horas», «2 a 4 días hábiles» frente a los de Figma): decisión de negocio (B15).
  - GAM por origen y «Sale de …»: falta la provincia de la bodega en el backend.
- `danger-bg` y `text-secondary` no tienen alias en SHELL: siguen con `var()`.

## P04 · implementación de CARRITO (2-oct-2026)

Sin acceso directo a Figma. Referencias `30:2268` (escritorio), `51:1820` (móvil con extras) y `52:2178` (guardar por correo), con las medidas registradas en este documento.

- **Remedido** con Playwright a 390 y a 1440 (`cart-responsive.spec.ts`): sin desborde horizontal ni errores de consola. A 390 el campo de correo mide 14 px y la pastilla «un solo envío» usa el fondo `--hc-success-bg`.
- **Tokens:** `PaqueteCarritoTarjeta` y `CodigosNotasCarrito` usan `bg-hc-success-bg` en vez de `bg-[var(--hc-success-bg)]`; mismo color calculado.
- **Sin cambio, sigue PARTIAL:**
  - «Pedir por WhatsApp» y tarjeta de guardar por correo en escritorio: restaurados sin frame desktop. Es DECISIÓN HUMANA (B14); el código actual se conserva tal cual y `chk-restauraciones.spec.ts` sigue pasando.
  - «Vaciar pedido»: restaurado sin frame (REQUIERE_DECISION).
  - «Sale de <provincia>» (`28:989`): falta la provincia de la bodega en el backend.
  - `51:1820` no se promueve: B19 lista E pide medir el frame completo y no hay acceso a Figma.
- `danger-bg` y `text-secondary` siguen sin alias en SHELL: `CodigosNotasCarrito` los mantiene con `var()`.

## P05 · implementación de GIFT CARD (2-oct-2026)

Sin acceso directo a Figma. Referencias `55:2220` (válida) y `55:2284` (inválida), con lo que registran este documento y `B12-giftcard-decisiones.md`.

- **Remedido** con Playwright, paso 3 con sesión y `/gift-cards/validar` simulado, a 390 y a 1440 en los dos estados: sin desborde horizontal ni errores de consola.
  - 390, válida: «Tarjeta de regalo válida», «Quitar», línea «Tarjeta de regalo HC-REGALO», nota del resto y pie «Total restante a pagar». Campo de 14 px.
  - 390 y 1440, inválida: alerta «Código inválido, vencido o sin saldo» con fondo `--hc-danger-bg`, sin «Quitar» ni «Total restante».
  - 1440, válida: la tarjeta está dentro del despliegue «Agregar cupón» del resumen; el resumen muestra la línea «Gift card» y el total ya descuenta el saldo (₡9.000 a ₡6.000), con la etiqueta «Total». No hay frame de escritorio de este estado.
- **Código:** sin cambios. Lo que los frames dibujan y no está en disputa (campo válido e inválido, total restante y nota) ya estaba. `checkout-responsive.spec.ts` suma 4 casos (390 y 1440, válida e inválida); B12 había anotado que no había spec del estado inválido.
- **Sin cambio, sigue PARTIAL:**
  - D09 (`55:2220`) y D10 (`55:2284`): barra «Pago · paso 3 de 3» frente al indicador de tres pasos de `29:1344`. Es DECISIÓN HUMANA sin respuesta (B12, B19 lista D).
  - Número de pedido previo al pago: el API lo devuelve al cobrar; pintarlo antes sería inventar el dato.
- `CodigoDescuento` sigue con `var(--hc-danger-bg)` y `var(--hc-text-secondary)`: no hay alias en SHELL.
- `CheckoutPaidGiftCard` no tiene frame (REQUIRES_DESIGN_REFERENCE): no se tocó. Tiene estilos `style={{ var() }}` y textos en español sin i18n.

## Decisiones y dependencias abiertas

- REQUIERE_DECISION: guardar por correo en escritorio; "Vaciar pedido"; WhatsApp en escritorio; contexto del carrito en `AsistentePedido`; cédula SINPE (no está en Figma); atajo de envío internacional y consentimiento en escritorio.
- Backend/datos: provincia y si la bodega está en el GAM (línea "Sale de X" y envío normal por origen); `tokenSeguimiento` en el estado del pago; comisión y paquete N de M por pedido; `stock` en el carrito abandonado.
- Namespace nuevo `despacho` (i18n) y `checkout.f`, `payment.exito/fallo/revision/sinpe` dentro de los namespaces de CHK; para `COMPONENT_OWNERSHIP.md`.
- Rutas nuevas: ninguna. `AppRoutes.tsx` sin cambios.

## Restauraciones de funcionalidad (decisión del usuario, 1-oct-2026)

Regla: Figma manda el diseño; el código anterior manda la funcionalidad que Figma no elimina de forma explícita. Se restauró sin mover ningún frame dibujado. Estado: `agent verified`, sin QA independiente.

| Función | Dónde queda | Referencia visual |
| --- | --- | --- |
| "Vaciar pedido" | Enlace de texto (12 px, gris) al final de la fila "Tu pedido llega en N paquetes", móvil y escritorio (`CartPage`) | Sin frame: Figma `28:989`, `30:2268` no lo dibujan ni lo eliminan |
| "Pedir por WhatsApp" en escritorio | Enlace de texto bajo "Continuar compra" en `ResumenCarrito` (prop `onWhatsApp`) | Sin frame desktop. En móvil sigue en el pie fijo (`51:1997`) |
| Guardar por correo en escritorio | `GuardarPorCorreo` al final de la columna de productos | **Posición sin referencia visual desktop en Figma** (`52:2178` es solo móvil). Misma regla: se oculta si ya hay correo capturado o hay sesión |
| Garantía de 40 días | Bloque de texto bajo los botones de `PagoExito` (claves `payment.exito.garantia` y `garantiaAyuda`, es/en/pt) | Sin frame: `29:1932` no la dibuja. Coincide con la política de `InformacionPage` (hasta 40 días por defectos) |
| "Imprimir" | Enlace de texto bajo la garantía (`globalThis.print()`, clave `payment.print`) | Sin frame |
| Contexto del carrito al asistente | `AsistentePedido` abre el chat global con `CARRITO:items:total` (`contextoCarrito` en `cartHelpers`) | `52:2223` no cambia. El panel `AICartSection` NO se restauró |

Excepción de ownership (aditiva): `store/chatStore.ts` (campo `contexto`, segundo argumento opcional de `open`, se limpia en `close`) y `components/ai/ChatModal.tsx` (usa `contexto ?? 'GENERAL'`). Sin ese cambio el chat fija `GENERAL`. Nada más cambió en esos archivos.

Discrepancias exactas con Figma introducidas por las restauraciones:
- Carrito escritorio `30:2351`: el resumen mide 551 px contra 521 de Figma; los 30 px son el enlace "Pedir por WhatsApp" bajo el botón (pedido por el usuario). El resto de medidas del resumen no cambió.
- Carrito escritorio `30:2268`: la tarjeta de correo agrega un bloque no dibujado al final de la columna de productos.
- Pago exitoso `29:1932`: el bloque garantía/Imprimir empuja hacia abajo la tarjeta "Guardá este pedido en tu cuenta" unos 55 px; lo de arriba no se mueve.

Se mantienen eliminados, con respaldo en Figma: `CrossSellGrid`, stepper del carrito, precio unitario visible, meta de envío gratis de ₡15.000 en el carrito (sigue en el mini carrito de SHELL), "Seguir comprando" como botón del resumen (sí existe en `29:1986`).

Problema previo detectado, fuera de CHK (CAT, asistente global): `ChatModal` limpia `pendingMessage` al abrir y eso cancela el temporizador de `autoQuery` de `AIChat`, así que la pregunta con la que se abre el asistente no se envía sola (también falla `asistente-checkout.spec.ts`). El contexto sí viaja con cualquier mensaje que se escriba en el chat abierto (`tests/chk-restauraciones.spec.ts`).

Verificación: `tsc --noEmit` limpio; vitest 87 archivos / 403 tests; eslint limpio sobre lo tocado; e2e `cart-cta`, `checkout-cta`, `pdp-agregar-hoja`, `visitante-compra`, `pago-loading` y `chk-restauraciones` en verde (31); `vite build` OK.
