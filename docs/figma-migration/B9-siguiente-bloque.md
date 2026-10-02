# B9 — Siguiente bloque implementable

Fecha: 2-oct-2026. Investigación. Sin cambios de componentes, CSS, rutas ni backend.

## Estado

| | |
| --- | --- |
| Branch | `feat/figma/base` |
| HEAD al investigar | `133dd511` |
| Master | `b355fd20` |
| PASS / PARTIAL | 37 / 53 |
| BLOCKED / OLD_DESIGN / MISSING / UNKNOWN | 0 |

B1–B8 están hechos. La matriz de decisiones es `docs/figma-migration/B8-decisiones-Figma.md`. B7 ya había clasificado 0 filas como implementables ahora. B9 volvió a mirar el código de CAT, PROD, CHK, ACC, SRV, STORE, QR y SHELL/SYS, y el resultado no cambia: no hay un bloque de UI que cumpla el criterio estricto.

## Candidatos investigados

| Candidato | Módulo | Frame | Ruta | Estado | Motivo |
| --- | --- | --- | --- | --- | --- |
| Fotos, «Quedan N», badge del carrito | HOME | `7:2`, `12:346`, `9:171` | `/` | NO IMPLEMENTABLE AHORA | BACKEND. El cuerpo ya está medido. El badge y «Quedan N» existen en código y dependen de datos. |
| Orden de categorías | CAT | `9:171` | `/` | NO IMPLEMENTABLE AHORA | DECISIÓN. Figma-D21. |
| Fila «Entendí:» | CAT | `8:230` | chat | NO IMPLEMENTABLE AHORA | BACKEND. El SSE no manda los filtros. |
| Tienda y categoría en búsqueda por foto | CAT | `27:882` | `/buscar/foto` | NO IMPLEMENTABLE AHORA | BACKEND. «NUEVO · por programar» es anotación y no se pinta. |
| Stepper en variantes | PROD | `44:1775` | `/productos/:id` | NO IMPLEMENTABLE AHORA | DECISIÓN. Figma-D03. |
| Elaboración | PROD | `44:1849` | `/productos/:id` | NO IMPLEMENTABLE AHORA | BACKEND. |
| Corrimiento de 14 px en agotado | PROD | `44:1917` | `/productos/:id` | NO IMPLEMENTABLE AHORA | DECISIÓN. La cubierta blanca ya está. El hueco es la anotación que no se renderiza. |
| Provincia / GAM por origen | CHK | `28:989`, `29:1248` | `/carrito`, `/checkout` | NO IMPLEMENTABLE AHORA | BACKEND. |
| Consentimiento, cédula, atajo internacional | CHK | `28:1083`, `29:1344`, `30:2385`, `51:2000` | `/checkout` | NO IMPLEMENTABLE AHORA | DECISIÓN. Figma-D04, D05, D08, D18. |
| Escritorio de pago cancelado | CHK | `29:1999` | `/pago/cancelado` | NO IMPLEMENTABLE AHORA | FIGMA. El móvil ya coincide. No hay frame de escritorio. Figma-D06. |
| WhatsApp y correo en carrito desktop | CHK | `30:2268` | `/carrito` | NO IMPLEMENTABLE AHORA | DECISIÓN. Figma-D07. |
| Chrome de gift card | CHK | `55:2220`, `55:2284` | `/checkout` | NO IMPLEMENTABLE AHORA | DECISIÓN. Figma-D09, D10. Contradice `29:1344`. |
| tokenSeguimiento, stock, paquete N/M | CHK | `29:1932`, `29:2036`, `37:1780` | pago, recuperar, despacho | NO IMPLEMENTABLE AHORA | BACKEND. |
| Paso de contraseña, Google, escritorio | ACC | `28:1143` | `/login` | NO IMPLEMENTABLE AHORA | FIGMA. El título ya es «Ingresá o creá tu cuenta». |
| Rango de entrega, Encargos, cotizada, opiniones, direcciones, 2FA | ACC | — | cuenta | NO IMPLEMENTABLE AHORA | BACKEND. |
| Presupuesto por rangos | SRV | `28:1486` | `/servicios?vista=busqueda` | NO IMPLEMENTABLE AHORA | DECISIÓN. Figma-D12. El texto de 16 px del inventario estaba viejo: el campo es `text-[14px]` dentro de `.hc-figma-ui`. |
| Tarifas de Envíos | SRV | `28:1660` | `/envios` | NO IMPLEMENTABLE AHORA | DECISIÓN. Figma-D13. |
| Garantía, encargo, cotización, blog | SRV | `28:1531`, `28:1594`, `55:2332`, `54:2126`, `54:2219` | varias | NO IMPLEMENTABLE AHORA | BACKEND. |
| Barra y header de tienda | STORE | `29:922`, `29:2308`, `51:2468` | `/tienda/:slug` | NO IMPLEMENTABLE AHORA | DECISIÓN. Figma-D01, D02, D20. |
| Directorio | STORE | `29:1159` | `/emprendimientos` | NO IMPLEMENTABLE AHORA | BACKEND. |
| Paso extra del QR de mesa | QR | `29:1650` | `/checkout/qr/:token` | NO IMPLEMENTABLE AHORA | DECISIÓN. Figma-D14. |
| Formulario SINPE, comprobante, escanear otro QR | QR | `29:1830`, `29:1888`, `29:1913` | `/pos/pago/:token` | NO IMPLEMENTABLE AHORA | FIGMA o BACKEND o SIN EVIDENCIA. Figma-D15. |
| Correos | QR | `30:1599`–`30:1793` | builders | NO IMPLEMENTABLE AHORA | BACKEND o DECISIÓN. Figma-D16, D17. |
| A− | SYS | `51:2229` | hoja de accesibilidad | NO IMPLEMENTABLE AHORA | DECISIÓN. Figma-D19. El frame no da un tamaño. |
| Cookies desktop, pie +18 px | SYS / SHELL | — | chrome | NO IMPLEMENTABLE AHORA | FIGMA. No hay frame. El alto extra del pie es el efecto de B1. |
| Barra de `/blog` marca Inicio | SHELL | `54:2126` | `/blog` | YA RESUELTO | `seccionActivaBarra` devuelve `inicio`. La fila sigue PARTIAL por chips y buscador. |
| Barra de solicitudes marca Cuenta | SHELL | — | `/servicios?vista=solicitudes` | YA RESUELTO | La ruta ya devuelve `cuenta`. La fila vacía sigue PASS. |
| Título de login | ACC | `28:1143` | `/login` | YA RESUELTO | `login.bienvenidaTitulo` ya es el texto del frame. La fila sigue PARTIAL por lo demás. |

Catálogo (`30:1824`), categorías (`43:1454`, `43:1530`), Descubrí (`27:939`), ficha general (`28:839`, `29:2072`), carrito vacío, hoja de agregado, SINPE en revisión, cookies móvil, sin conexión, 404 y fallo de servidor están en PASS. No se reabren.

## Bloque seleccionado

No hay bloque de implementación.

Ningún candidato cumple a la vez frame suficiente, ruta, componente, código existente, ausencia de backend, ausencia de decisión humana, datos no inventados, coherencia con B1–B8, ownership claro y prueba posible.

### Objetivo

Dejar escrito que el siguiente cambio de UI no puede empezar hasta que diseño o producto responda un grupo de `B8-decisiones-Figma.md`. B9 no agrega pantallas ni corrige píxeles.

### Módulo

Ninguno.

### Rutas

Ninguna.

### Frames Figma

Ninguno para implementar.

### Componentes

Ninguno.

### Diferencias exactas

No hay una diferencia visual que se pueda cerrar solo con el código y un frame, sin una respuesta externa.

### Evidencia

Seis lecturas en paralelo (CAT/PROD, CHK, ACC/SRV/STORE/QR, SHELL/SYS) más el cruce con B7 y B8. El código de `barraInferiorHelpers.ts`, `LoginFormStep`, `fuenteAccesibilidad.ts`, `enviosData.ts`, `PagoFallidoEmailBuilder` y `AccionesCompra` confirma los bloqueos ya escritos. No apareció un hueco nuevo.

### Archivos esperados

Ningún archivo de `src/`. En este bloque solo documentación: este archivo y cuatro frases de `INVENTORY.md` que describían mal el código actual. Esas frases no cambian PASS ni PARTIAL.

### Ownership

No aplica.

### Verificación 390

No hay pantalla que medir para un cambio de B9.

### Verificación 1440

No hay pantalla que medir para un cambio de B9.

### Tests esperados

Ninguno de regresión de UI. No se corre suite.

### Riesgos

Implementar igual una fila de la tabla de arriba reabre una decisión de B8, inventa un dato o pinta una anotación de diseño.

## Candidatos descartados

Cada fila de la tabla de arriba está descartada. El motivo de la columna Estado es el del descarte:

- BACKEND: Home con datos reales, asistente, foto, elaboración, provincia, GAM, tokens, stock, paquetes, cuenta (fechas, encargos, opiniones, direcciones, 2FA), garantía, encargo, cotización, blog (chips, autor), directorio, comprobante QR, correos de dirección y vigencia.
- DECISIÓN: D01–D05, D07–D10, D12–D14, D16–D21. Incluye stepper, orden de categorías, checkout extras, gift card, tienda, presupuesto, envíos, QR de mesa, correos de pago fallido y OTP, A−.
- FIGMA: pago cancelado en escritorio, paso de contraseña, formulario SINPE del pagador, cookies desktop, Devoluciones e Información.
- SIN EVIDENCIA SUFICIENTE: «Escanear otro QR» (`29:1913`) y `51:1820` (el inventario no enuncia una diferencia visual).
- YA RESUELTO: barra de `/blog`, barra de solicitudes, título de login, tamaño 14 px de los campos de Servicios HOT dentro de `.hc-figma-ui`.
- NO AISLABLE: el chrome de la gift card no se puede igualar a `55:2220` sin contradecir el checkout de `29:1344`.

## Orden recomendado

1. B9 — no implementar UI. El inventario no tiene un bloque que pase el criterio.
2. Responder juntas Figma-D04, D05, D08 y D18. Son el mismo checkout (consentimiento, cédula, atajo internacional) en móvil y en escritorio. Comparten `PasoPago.tsx`, `PasoEntrega.tsx` y `CheckoutLayout.tsx`.
3. Responder juntas Figma-D01 y D20, y aparte D02. Son la tienda: barra móvil, WhatsApp de escritorio y header de escritorio.

Esas respuestas no se implementan en este documento. Cuando existan, el bloque de código que les corresponda puede definirse con archivos y tests. Hasta entonces, «Implementar B9» no tiene un diff de producto.

## Notas de inventario corregidas en B9

Sin cambiar el contador 37 / 53:

- `/login`: el título del código ya no es «Bienvenido de vuelta».
- `/servicios?vista=solicitudes` vacío: la barra marca Cuenta.
- `/blog`: la barra marca Inicio. La fila sigue PARTIAL por categoría y buscador.
- `/servicios?vista=busqueda`: la nota de inputs a 16 px no aplica al formulario dentro de `.hc-figma-ui`. La fila sigue PARTIAL por el selector de rangos y por el estado enviado sin frame.
