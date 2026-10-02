# QR · QR de mesa, QR de pago y correos al cliente

Rama `feat/figma/qr`, puesta al día con `feat/figma/base` en `4d773aaf` por fast-forward (ya incluye CHK, ACC, SRV y STORE). Archivo Figma `TmxYFj2nauu10WZnZ0t6yt`. Este documento lo mantiene QR; `INVENTORY.md` y `PROGRESS.md` resumen su estado.

Todos los veredictos son **agent verified**: los verificó el propio agente con la API simulada, sin QA independiente y sin backend real. Los correos se verificaron renderizando el HTML real de los builders en Chrome, no en Gmail, Outlook ni Apple Mail.

## Resultado

**1 PASS, 12 PARTIAL, 0 BLOCKED** (de 13 frames: 6 pantallas y 7 correos). Todas las UNKNOWN del inventario quedaron resueltas.

## Cómo se verificó

- Capturas con Playwright (Chrome, móvil 390) con la API simulada; posiciones medidas con `getBoundingClientRect` contra la metadata de cada frame (`get_metadata`) y comparación visual con `get_design_context`. Tolerancia: ±1 px (Chrome redondea el borde de 1,5 px a 1 px).
- Cada pantalla se capturó, se midió, se corrigió y se volvió a medir. Correcciones de la segunda pasada: padding de la fila elegida (10 + borde), interlineado de títulos de 28, filas de "Tu pedido" de 16, borde de 1 px que hacía el botón rojo de 48 en vez de 46, títulos de los pasos SINPE de 16.
- No hay frames de tablet ni de escritorio: la columna móvil se centra (máx. 430 px).

## Pantallas

| Frame | Pantalla | Ruta | Veredicto | Móvil | Escritorio |
| --- | --- | --- | --- | --- | --- |
| `29:1650` | QR de mesa · menú | `/checkout/qr/:token` | **PARTIAL** | medido (0 a 1 px) | sin frame |
| `29:1741` | QR de mesa · pedido enviado | `/checkout/qr/:token` | **PASS** (agent verified) | medido (0 a 1 px) | sin frame |
| `29:1781` | QR de pago en caja · elegir método | `/pos/pago/:token` | **PARTIAL** | medido (0 px) | sin frame |
| `29:1830` | QR de pago · SINPE en curso | `/pos/pago/:token` | **PARTIAL** | medido (0 px) | sin frame |
| `29:1888` | QR de pago · pagado | `/pos/pago/:token` | **PARTIAL** | medido (0 a 1 px) | sin frame |
| `29:1913` | QR de pago · vencido | `/pos/pago/:token` | **PARTIAL** | medido (0 px) | sin frame |

Posiciones medidas (Figma contra app): encabezado del negocio 99 de alto; buscador 358x38 en y=99; filas de producto desde y=204 (90 a 92); botón "Enviar pedido" 244/774 de 40; confirmación 207; "Tu pedido" y=318 de 138; "¿Cómo pagás?" y=468 de 88; monto 135; título "Elegí cómo pagar" y=252; botón de pago y=752 de 46; pasos SINPE y=154 de 210; "Registrar mi pago" y=376 de 112; "Esperando tu pago" y=500 de 86; resultado vencido 216.

## Correos

| Frame | Correo | Builder | Veredicto |
| --- | --- | --- | --- |
| `30:1599` | Confirmación de pedido | `ConfirmacionPedidoEmailBuilder` | **PARTIAL** |
| `30:1643` | Guía asignada | `NotificacionGuiaEmailBuilder` | **PARTIAL** |
| `30:1669` | Seguimiento de estado | `SeguimientoEstadoEmailBuilder` | **PARTIAL** |
| `30:1708` | Pago fallido | `PagoFallidoEmailBuilder` | **PARTIAL** |
| `30:1733` | Recuperación de carrito | `RecuperacionCarritoEmailBuilder` | **PARTIAL** |
| `30:1768` | Cupón de bienvenida | `NegocioEmailBuilder.buildCuponBienvenida` | **PARTIAL** |
| `30:1793` | Código de verificación | `OtpService.enviarEmail` | **PARTIAL** |

La rama `feat/correos-transaccionales-figma` (`74174af4`) ya estaba contenida en `base`: dejó el esqueleto de tablas con estilos inline. QR lo completó contra los frames: círculo de ícono de 48 (PNG, porque Gmail no muestra SVG), título de 24/30, bajada de 15/22, caja de código punteada, pasos de estado, notas con título, botón de 14/12 (azul de 10 en la guía), pie "¿Dudas?" común, asuntos desde los builders y montos con punto de miles (`₡24.400`). Sin `display:flex`. Fuentes de respaldo Sora y Public Sans a Arial/Helvetica, como pide la nota `30:1816`.

Por qué ninguno es PASS: no se probó en clientes reales (Gmail, Outlook, Apple Mail) y cada uno tiene una diferencia de datos o de decisión (abajo).

## Qué se implementó

- **QR de mesa** (`SelfCheckoutPage` y `selfCheckout/*`): tema claro en lugar del oscuro; encabezado del negocio con logo o iniciales; buscador y categorías (salen de `categoria` del producto, sin chips si no hay); filas con foto de 68, botón "+" rojo y selector de cantidad azul; carrito flotante oscuro; "Pedido enviado" con número, resumen y cómo pagar. La cantidad ahora vive en el carrito (antes cada tarjeta guardaba la suya y se perdía al filtrar).
- **QR de pago** (`POSPagoPage` y `features/pos-pago/*`): monto con cuenta regresiva, método seleccionado, detalle del pedido, pie con "Pago protegido por HotClick"; SINPE con número y referencia copiables, registro del pago y espera; pagado y vencido. `EXPIRADO` pasa a la vista vencida (antes era un error genérico).
- **Compartido** (`features/qr-negocio/*`): `QrPagina`, `QrEncabezadoNegocio`, `QrResultado`, íconos originales de Figma en `assets/figma/qr/` con registro propio `iconosQr.ts`.
- **i18n**: `pos.negocio`, `pos.mesa` (nuevo) y claves nuevas en `pos.pago`, en es, en y pt en el mismo cambio. No se quitó ninguna clave.

## Diferencias que quedan, por pantalla

- **`29:1650` menú (PARTIAL):** Figma pasa de "Enviar pedido" directo a "Pedido enviado". La app conserva un paso de confirmación con nombre, teléfono y notas opcionales (alergias, preferencias), que Figma no dibuja. Se estilizó con los tokens de QR. Decisión pendiente. Las fotos faltantes muestran iniciales. El color del negocio (`colorPrimario`) ya no tiñe botones: Figma usa rojo y azul de marca.
- **`29:1741` enviado (PASS):** "En preparación" es texto fijo de Figma; el backend no devuelve estado del pedido. "Pedido #Q-58" usa `numeroPedido` del backend.
- **`29:1781` método (PARTIAL):** Figma deja al cliente elegir entre SINPE y tarjeta; el cajero fija el método al crear la sesión (`metodoPago`), así que solo se dibuja el elegido, ya seleccionado. Decisión de producto/backend pendiente. El subtítulo "Cobro #P-3391 · caja principal" no se dibuja: el backend no manda número de cobro ni nombre de caja. Se agregó la tarjeta "Tu pedido" (Figma no dibuja el detalle) para que el comprador vea qué paga. Con tarjeta se conserva el flujo anterior (formulario Onvo o botón "Pagar ₡X" hosted), sin frame propio. El texto "Transferí desde tu banco y subí el comprobante" se cambió a "registrá tu pago": la app no sube comprobantes.
- **`29:1830` SINPE (PARTIAL):** el formulario de nombre, cédula y teléfono no tiene frame; se muestra al tocar "Registrar mi pago". La referencia (paso 2) solo aparece si el backend la manda. Se conserva "Reportar un problema".
- **`29:1888` pagado (PARTIAL):** Figma promete "Te enviamos el comprobante por correo" y un botón "Ver comprobante". El pago por QR no pide correo ni tiene ruta de comprobante, así que no se prometen. Dependencia de backend.
- **`29:1913` vencido (PARTIAL):** falta el botón "Escanear otro QR": la app no tiene lector de QR para el comprador (solo el detector de código de barras de inventario).
- **Sin frame, con el mismo bloque `QrResultado`:** QR inválido de mesa, cobro cancelado, error de pago, sin productos, ya pagado. No se inventó un diseño propio.
- **Correos:**
  - Confirmación: faltan "Enviamos a: <dirección>" (el pedido no guarda dirección) y la etiqueta "Envío normal GAM" (hoy "Envío"). Se conserva la línea de entrega o retiro y la garantía de 40 días como nota (Figma no la dibuja).
  - Guía: faltan "Paquete N de M" y "Los otros paquetes de tu pedido…"; requieren los pedidos hermanos del mismo `grupoPago`. Se conserva el enlace "Ver el estado de todo mi pedido". Entrega de "2 a 5 días hábiles" (Figma dice 2 a 4; se respetó el texto existente).
  - Seguimiento: Figma solo dibuja "En preparación". Los demás estados reutilizan la estructura; los pasos solo aparecen en los estados que Figma nombra. Se conservan la guía y el retiro en tienda; se quitaron la lista de productos y el total (no están en Figma). "Mensaje de la tienda" pasa a "Mensaje de HotClick" si el pedido no tiene empresa.
  - Pago fallido: Figma dice "Tu pedido quedó guardado"; el código libera el stock. Se escribió "no se completó. No se hizo ningún cobro." Decisión pendiente.
  - Recuperación: Figma muestra la tienda y "Quedan N"; el carrito guardado solo trae nombre, precio, cantidad e imagen, y se muestra la cantidad. Se quitó "Total estimado" (no está en Figma).
  - Cupón: Figma dice "Válido por 30 días… No acumulable"; el cupón no tiene vencimiento en el backend. Se conservan las condiciones reales (una sola compra, una vez por persona).
  - Código de verificación: el asunto de Figma lleva el código ("Tu código de verificación: 482 913"). **No se aplicó**: el asunto se ve en la pantalla de bloqueo y el código ya estaba excluido a propósito (hay un test). Se quitó el saludo con el nombre (Figma no lo dibuja). El código sale en dos grupos de 3 con un margen, sin espacio copiable.

## P07 · implementación de QR (2-oct-2026)

Sin acceso directo a Figma. Referencias `29:1650`, `29:1741`, `29:1781`, `29:1830`, `29:1888` y `29:1913`, con las posiciones registradas arriba.

- **Remedido** con Playwright a 390 y a 1440 (`qr-mesa-pago.spec.ts`, describe «Responsive y tokens (P07)»): sin desborde horizontal ni errores de consola.
  - 390, mesa: encabezado de 99, buscador 358x38 en y=99, «Enviar pedido» en 245/774 de 40 (Figma 244/774: 1 px). Pedido enviado: círculo de 72 en y=131 con `--hc-success-bg`.
  - 390, pago: botón y=752 de 46 (igual). El bloque del monto mide 117 px desde y=99 y el importe de 40 px está en y=142; la cifra «monto 135» de arriba no dice si es alto o posición, así que no se puede contrastar sin Figma.
  - 1440: columna de 430 px centrada (x=505) en mesa y pago, sin frame de escritorio.
- **Tokens:** 100 clases `*-[var(--hc-…)]` pasan a los alias de SHELL (`bg-hc-n-0`, `text-hc-n-900`, `border-hc-n-200`, `bg-hc-blue-50`, `bg-hc-red-500`, etc.) en los 13 componentes con frame: `QrEncabezadoNegocio`, `QrPagina`, `QrResultado` (el `style` del círculo pasa a clase), `PosPagoCta`, `PosPagoEstado`, `PosPagoMetodo`, `PosPagoMonto`, `PosPagoPedido`, `PosPagoSinpe`, `SelfCheckoutCatalogo`, `SelfCheckoutExito`, `SelfCheckoutFab` y `SelfCheckoutProductCard`. El color calculado es el mismo; el spec compara «Enviar pedido» y el círculo con el token.
- **No se tocaron** (sin frame): `SelfCheckoutFormulario`, `SelfCheckoutLoading`, `SelfCheckoutError`, `PosPagoOnvoEmbed` y `PosPagoReporteModal`. `--hc-focus-ring` y `--hc-shadow-1` no tienen alias: siguen con `var()`.
- **Sin cambio, siguen PARTIAL** (B16): paso de confirmación de mesa (DECISIÓN HUMANA), quién elige el método (DECISIÓN HUMANA), número de cobro y caja (BACKEND), formulario SINPE sin frame (FIGMA PENDIENTE, D15), comprobante y correo del pago (BACKEND), «Escanear otro QR» (DECISIÓN HUMANA). Los 7 correos no se tocaron.

## P09 · implementación de CORREOS (2-oct-2026)

Sin acceso directo a Figma. Referencias `30:1599`, `30:1643`, `30:1669`, `30:1708`, `30:1733`, `30:1768` y `30:1793`, con lo que registran este documento y `B17-emails-decisiones.md`.

- **HTML sin cambios:** se renderizaron los 7 correos (13 variantes: guía por Correos y propia, y seguimiento en PAGADO, EN_PREPARACION, ENVIADO, ENTREGADO, LISTO_RETIRO y CANCELADO) antes y después del cambio con un test temporal fuera del repo: los 13 HTML son idénticos byte a byte.
- **Render en Chrome** (no en Gmail, Outlook ni Apple Mail): a 390 la tarjeta mide 366 px (x=12) y a 1440 mide 600 px centrada (x=420); sin desborde horizontal, título de 24 px y sin `display:flex` en ninguno.
- **Código (Sonar):** `EmailLayoutHelper` reúne las aperturas de tabla (`TABLA`, `TABLA_ANCHA`), los colores que los builders pasaban sueltos (`FONDO_SUAVE`, `TEXTO`, `TEXTO_SUAVE`, `AZUL`; ya existían `FONDO_INFO` y `FONDO_ALERTA`), la pregunta del pie (`PREGUNTA_DUDAS`) y el rastreo (`esRastreoCorreos`, `urlRastreo`), que guía y seguimiento repetían. El color del paso deja el ternario anidado (`fondoPaso`). `EmailLayoutHelperTest` suma la prueba del rastreo.
- **Sin cambio, siguen PARTIAL** (B17): confirmación sin «Enviamos a» ni «Envío normal GAM» (el pedido no guarda dirección), guía sin «Paquete N de M» (pedidos hermanos por `grupoPago`), carrito sin tienda ni «Quedan N» (`CartItemDTO`), cupón sin vencimiento de 30 días (backend), pago fallido «quedó guardado» frente a «no se completó» (DECISIÓN HUMANA) y código en el asunto del OTP (DECISIÓN HUMANA, seguridad). Ninguno se probó en clientes reales.
- Los demás correos de `NegocioEmailBuilder` (bienvenida, aprobación, rechazo, invitación, moderación, cobro) no tienen frame y no se tocaron.

## Funcionalidad preservada

Lectura del QR por token, catálogo y pedido de mesa (`/qr/:token`), sesión de pago (`/pos/qr/pago/:token`), SINPE con Onvo y espera por sondeo, tarjeta con formulario embebido y alternativa hosted, redirección y regreso con `?resultado=exito|cancelado`, reintento, reporte de problema por WhatsApp, estados `PAGADO`, `EXPIRADO` y `CANCELADO`, y los envíos de correo con sus asuntos (ahora por builder). La cuenta regresiva solo informa: nunca decide que el cobro venció; al llegar a cero vuelve a pedir el estado al servidor. Si la fecha del servidor (sin zona) no es creíble (pasada o a más de 30 minutos), no se dibuja.

## Dependencias

- **Backend:** número de cobro y nombre de caja en `GET /pos/qr/pago/:token`; permitir que el cliente elija método; comprobante o correo del pagador; pedidos hermanos por `grupoPago` para "Paquete N de M"; dirección de entrega y tipo de envío en el pedido; vencimiento del cupón si se quiere prometer "30 días"; estado del pedido de mesa.
- **SYS / `AppChrome`:** el botón flotante de WhatsApp aparece sobre las pantallas de pago por QR (no está en Figma y tapa el área del pie en móviles pequeños). Decide `ConditionalWhatsAppFab`; no se tocó. **P12 (2-oct-2026):** ya no se monta en `/checkout/qr/:token` ni en `/pos/pago/:token` (`whatsappOculto` cubre `/checkout` y `/pos`); lo comprueba `qr-mesa-pago.spec.ts`.
- **SHELL (`index.css`):** el campo de búsqueda usa `hc-input-libre` (ya existe); los inputs móviles se fuerzan a 16 px (Figma pide 14). **P12:** `QrPagina` lleva `hc-figma-ui` y el buscador mide 14 px a 390; los campos del paso de confirmación (sin frame) quedan en el tamaño de su clase. La regla global de `header` obliga a usar `div role="banner"`.
- **SUP / despliegue:** los PNG de `frontend/public/email/` se publican con el `pnpm build` de SUP; hasta entonces los correos muestran el círculo sin ícono. `static/` no se tocó.

## Decisiones abiertas (pasar al usuario)

1. Paso de confirmación (nombre, teléfono, notas) entre el carrito y "Pedido enviado" en la mesa: mantener o quitar (Figma lo omite).
2. Elección de método de pago por el cliente (Figma) contra método fijado por el cajero (código).
3. "Escanear otro QR": agregar un lector o quitar el botón del diseño.
4. Comprobante del pago por QR: pedir correo o quitar la promesa del frame.
5. "Tu pedido quedó guardado" o "no se completó" en el correo de pago fallido.
6. Asunto con el código en el correo de verificación (Figma) o sin él (seguridad).
7. Prometer "30 días" en el cupón: requiere vencimiento en el backend.

## Archivos fuera de QR modificados

Ninguno. `AppRoutes.tsx`, `index.css`, `MainLayout`, `static/`, `package.json` e infraestructura no se tocaron. `EmailLayoutHelper` y los builders de correo son de QR según el ownership.

## Código eliminado

`PosPagoResumen` y `PosPagoItemFila` (reemplazados por `PosPagoMonto`, `PosPagoMetodo` y `PosPagoPedido`).

## Pruebas

- `tsc --noEmit` limpio (los tres tsconfig). Vitest: 99 archivos y 484 tests en verde (la base tenía 97 y 477): nuevos `qrNegocioHelpers.test.ts`, `selfCheckoutFormat.test.ts` y un caso en `posPagoFormat.test.ts`.
- Build `vite build` OK en carpeta temporal (`static/` intacto).
- eslint sobre los archivos de QR: 1 hallazgo, `usePosPagoQr.ts` (`set-state-in-effect` en `useEffect(() => { void cargarInfo() })`), que ya existía en `base` (línea 62 allí).
- E2E: `pos-pago-express.spec.ts` (5) y el nuevo `qr-mesa-pago.spec.ts` (5: menú y pedido enviado, filtros, QR inválido, SINPE, vencido y pagado) pasan.
- Backend: pruebas de correo en verde (`mvn -o test` sobre `*Email*`, `*Otp*`, `*Cupon*`, `PedidoServiceTest`); nuevos `SeguimientoEstadoEmailBuilderTest` y `RecuperacionCarritoEmailBuilderTest`.
