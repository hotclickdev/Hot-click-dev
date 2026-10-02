# B19 — Cierre definitivo de decisiones Figma

Fecha: 2-oct-2026.

| | |
| --- | --- |
| Rama | `feat/figma/base` |
| HEAD al comenzar | `18b224ef` |
| Master | `b355fd20` |

Estado inicial: 37 PASS / 53 PARTIAL / 0 BLOCKED / 0 OLD_DESIGN / 0 MISSING / 0 UNKNOWN.

Esta fase no implementa. No cambia `INVENTORY.md` ni `PROGRESS.md`. No promueve filas a PASS.

Fuentes: inventario, B8 a B18, `CHK.md`, `QR.md`, `SYS.md`, `STORE.md`, `PROD_DECISIONES.md`.

## 1. Resultado ejecutivo

| | |
| --- | --- |
| PASS | 37 |
| PARTIAL | 53 |
| BLOCKED | 0 |
| MISSING | 0 |
| OLD_DESIGN | 0 |
| UNKNOWN | 0 |
| IMPLEMENTABLE | 0 |
| PARTIAL accionables en frontend, sin decisión externa | 0 |
| PARTIAL que dependen de backend, Figma o producto | 53 |

Ningún PARTIAL se promueve a PASS en este documento. Ningún PASS de B1–B6 queda invalidado por B14–B18.

Clasificación de las 53 filas (una etiqueta por fila; si hay un segundo bloqueo, está en las listas):

| Clase | Filas | Significado |
| --- | --- | --- |
| B. BACKEND / DATOS | 29 | Falta API, dato o campo. |
| C. DECISIÓN HUMANA | 17 | Producto o diseño tiene que elegir antes de tocar código. |
| D. FIGMA PENDIENTE | 4 | Falta frame o el frame no define el comportamiento. |
| E. RESUELTO, no promovido | 1 | El único estado dibujado ya está cubierto. No se promueve. |
| G. SIN ACCIÓN | 2 | La diferencia queda como regla ya tomada o no hay un delta que implementar. |
| A. IMPLEMENTACIÓN FUTURA | 0 | No hay un cambio concreto ya autorizado. |

## 2. PARTIAL promovibles a PASS

Ninguno.

| Frame | Ruta | Antes | Ahora | Evidencia | Acción |
| --- | --- | --- | --- | --- | --- |
| — | — | — | — | No hay fila cuyo PARTIAL haya quedado sin diferencia verificable. | Mantener PARTIAL |

Casos mirados y no promovidos:

- `30:1669` correo de seguimiento: el frame solo dibuja «En preparación» y el código reutiliza esa estructura. No hay prueba en Gmail u Outlook. No cumple PASS.
- Título de `/login` y barra de `/blog` e de solicitudes: el texto o la marca de la barra ya coinciden. La fila sigue PARTIAL por frame, Clerk o backend.
- Cookies móviles `45:1946` y pedido QR `29:1741`: ya están en PASS. No son filas PARTIAL.

## 3. LISTA A — IMPLEMENTAR

NINGUNO.

La segunda pasada sobre las 53 filas no encontró un cambio que tenga frame suficiente, comportamiento único, sin contradicción, sin decisión abierta, sin backend, sin UI inventada, con owner claro y verificable. B14–B18 quedan confirmados: IMPLEMENTABLE = 0.

## 4. LISTA B — BACKEND

| Frame | Ruta | Dependencia | Qué falta |
| --- | --- | --- | --- |
| `7:2`, `12:346`, `9:171` | `/` | Catálogo real | Fotos, stock para «Quedan N», badge del carrito con datos reales |
| `8:230` | Chat | Asistente | Filtros interpretados para la fila «Entendí:» |
| `27:882` | `/buscar/foto` | Búsqueda por imagen | `empresaNombre` y categoría en la respuesta |
| `29:1159` | `/emprendimientos` | Empresas públicas | Ciudad, categoría, fotos, conteo, slug |
| `44:1849` | `/productos/:id` | Ficha | Dato «Elaboración» |
| `28:989` | `/carrito` | Bodega | Provincia para «Sale de …» |
| `29:1248` | `/checkout` | Bodega | Origen para GAM; hoy se usa el cantón de destino |
| `29:1932` | `/pago/exito` | Pedido | `tokenSeguimiento` del invitado |
| `29:2036` | `/recuperar-carrito/:token` | Carrito | `stock` para «quedan N» |
| `37:1780` | Despacho | Pedido | Paquete N de M, forma de entrega, comisión |
| Detalle de pedido | `/mis-pedidos?pedido=` | Pedido | Rango de entrega; el API da una fecha |
| Solicitudes | `/servicios?vista=solicitudes` | Encargos | Lista de encargos del comprador |
| Solicitud cotizada | misma ruta | Solicitud | Precio, vigencia, fechas, «Comprar por ₡X» |
| Opiniones | `/perfil?vista=opiniones` | Reseñas | Comentario opcional y foto de la publicada |
| Seguridad | `/perfil?vista=seguridad` | Usuario | Direcciones guardadas |
| 2FA | `/login` | Sesión | «Confiar en este dispositivo» |
| `28:1531` | Garantía | Solicitud | Fotos de la falla y motivo como campo |
| `28:1594` | `/encargo/:token` | Encargo | Tienda, fechas, producción, envío |
| `55:2332` | `/cotizacion/:token` | Cotización | Endpoint para aceptar |
| `29:1781` | `/pos/pago/:token` | POS | Número de cobro y caja |
| `29:1888` | `/pos/pago/:token` | Pago QR | Comprobante y correo del pagador |
| `30:1599` | Correo confirmación | Pedido | Dirección y tipo «Envío normal GAM» |
| `30:1643` | Correo guía | Pedidos | Hermanos por `grupoPago` |
| `30:1733` | Correo carrito | Carrito guardado | Tienda y stock |
| `30:1768` | Correo cupón | Cupón | Fecha de vencimiento; hoy no existe |
| `54:2126` | `/blog` | Blog | Categoría y buscador |
| `54:2219` | `/blog/:slug` | Blog | Categoría, productos del artículo, autor |

## 5. LISTA C — FIGMA / DISEÑO

| Frame | Ruta | Qué falta |
| --- | --- | --- |
| `29:1999` | `/pago/cancelado` | Frame de escritorio. El móvil ya coincide. |
| `28:1143` | `/login` | Frame del paso de contraseña y del login de escritorio |
| 2FA | `/login` | Frames de elegir método y de código por correo |
| `29:1830` | `/pos/pago/:token` | Frame del formulario de nombre, cédula y teléfono |
| `51:2229` / `52:2389` | Hoja de accesibilidad | Tamaño de A−. El chip está dibujado. No hay un `font-size` menor |
| `45:1946` | Cookies | Frame de escritorio. El móvil está en PASS |
| — | Devoluciones, Información, Contacto, Términos, Privacidad, Nosotros, Ayuda | No hay frame. No se inventan |

## 6. LISTA D — PRODUCTO

| Frame | Tema | Decisión necesaria |
| --- | --- | --- |
| `29:922`, `51:2468` | Barra de la tienda | ¿Se mantiene en móvil aunque el frame no la dibuje? |
| `51:2468` | WhatsApp del vendedor | ¿Se mantiene el FAB de escritorio y el enlace del encabezado móvil? |
| `29:2308` | Header de la tienda | ¿Header del marketplace o header del pedido aislado? |
| `44:1775` | Stepper en variantes | ¿La barra sin stepper manda, o se mantiene el de `28:839`? |
| `28:1083`, `29:1344`, `30:2385` | Consentimiento y cédula SINPE | ¿Se aceptan aunque el frame no los dibuje? |
| `30:2268` | Carrito desktop | ¿WhatsApp del resumen y guardar por correo se quedan? |
| `51:2000`, `30:2385` | Envío internacional | ¿El atajo también en escritorio? |
| `55:2220`, `55:2284`, `29:1344` | Gift card | ¿Qué chrome gobierna el paso 3? |
| `28:1486` | Presupuesto | ¿Texto libre o selector? Hace falta la lista de rangos |
| `28:1660` | Tiempos de envío | ¿«30 min–2 horas» y «2–4 días» o «24 h» y «1–3 días»? |
| `29:1650` | QR de mesa | ¿Se conserva nombre, teléfono y notas? |
| `29:1781` | QR de pago | ¿El cliente elige el método o lo fija el cajero? |
| `29:1913` | QR vencido | ¿Se construye un lector o el botón no se muestra? |
| `30:1708` | Correo de pago fallido | ¿«Quedó guardado» o «no se completó / no hubo cobro»? La reserva se libera; `stockActual` no se toca |
| `30:1793` | OTP | ¿El código va en el asunto? |
| `9:171` | Categorías del Home | ¿Orden fijo del frame o el de la API? |

## 7. LISTA E — CERRADO

| Frame | Ruta | Motivo |
| --- | --- | --- |
| `30:1669` | Correo de seguimiento | El único estado dibujado es «En preparación». El código reutiliza esa estructura. No se promueve: no hay prueba en el cliente de correo |
| `44:1917` | Ficha agotada | La cubierta blanca opaca ya está. El corrimiento de 14 px es no pintar «NUEVO · por programar». Esa etiqueta no va a la UI. La fila no pasa a PASS |
| `51:1820` | Carrito | El inventario describe funciones que ya operan. No enuncia un delta visual nuevo. No se promueve sin una medición del frame completo |
| `28:1143` | `/login` | Solo el título ya coincide. El resto de la fila sigue en la lista C |
| `54:2126` | `/blog` | La barra ya marca Inicio. La fila sigue en la lista B |
| `45:1946`, `29:1741` | Cookies móvil, pedido QR enviado | Ya están en PASS. B14–B18 no los reabren |

## 8. PASS que requieren revisión

Ninguno.

B14–B18 no invalidan un PASS existente. Cookies móviles, sin conexión, hoja de cookies, pedido enviado del QR y el título medido de la ficha general siguen como están documentados.

## 9. Resultado final

¿Queda algún cambio de frontend implementable sin decisión externa? No.

¿Quedan decisiones humanas? Sí. Lista D. Dieciséis temas.

¿Quedan referencias Figma? Sí. Lista C.

¿Queda backend? Sí. Lista B.

¿Se cierra la fase B? Sí. No hay un B20 de investigación. IMPLEMENTABLE = 0 es el resultado.

## 10. Próximo ciclo

No es otro bloque de auditoría.

El trabajo que sigue, fuera de esta numeración:

1. Producto y diseño responden la lista D. Cada respuesta puede abrir un diff concreto. Hasta entonces no hay implementación.
2. Diseño entrega los frames de la lista C. Sin ellos no se dibuja el paso de contraseña, A−, el formulario SINPE del QR, el escritorio de cookies ni las páginas legales.
3. Backend entrega los campos de la lista B. El frontend no los inventa.
4. Cuando exista al menos un ítem de la lista A, se implementa y se verifica. Hoy esa lista está vacía.
5. QA final de los 37 PASS y de lo que pase a PASS después de esos tres frentes. Incluye correos en un cliente real antes de promover `30:1669`.

Los 53 PARTIAL se quedan en 53 hasta que una de esas respuestas quite la causa de la fila. Este documento no los mueve.
