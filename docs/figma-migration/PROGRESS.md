# Progreso de la migración Figma

Actualizado 2026-10-02 (P11 BACKEND; antes P10 HOME/CATÁLOGO, P09 CORREOS, P08 AUTH, P07 QR, P06 SERVICIOS, P05 GIFT CARD, P04 CARRITO, P03 CHECKOUT, P02 PRODUCTO, P01 STORE, SYS/SHELL B5, B4, B3, B2, B1, A1, A2 y A4). Complementa `INVENTORY.md` (qué pantallas) y `COMPONENT_OWNERSHIP.md` (quién toca qué).
Regla vigente: **nada se ha enviado a GitHub, nada se mergeó a `master`, nada se desplegó.** Todo vive en ramas locales.

## Estado general

| Etapa | Estado |
| --- | --- |
| Fase 1: auditoría e inventario | Hecha (90 pantallas) |
| Fase 2a: recuperar PR #93 | Hecha en `feat/figma/base` |
| Fase 2b: Home | Rama `feat/figma/home` con la base integrada (`98ec9abc`) y el cuerpo remedido y corregido (`6d0de288`). Los tres frames siguen en PARTIAL (ver Fase 2b) |
| Ola 0: docs en la base | Integrados (`62a631ac`) |
| Ola 1: ramas y worktrees | Creadas el 2026-09-30 desde la base: `feat/figma/{cat,prod,chk,acc,srv,sys,store,qr}`, cada una en `.claude/worktrees/<agente>` |
| Ola 1, CAT C0 (ProductCard) | **Hecho**, integrado en `base` (`9f11c9a7`). `comprador/ProductCard` 167x280; `formatPrice` global con punto (`₡6.200`). C1 a C5 hechos (abajo). |
| Ola 1, CAT C1 a C5 | **Hecho**, integrado en `base` (`1cd7721a`). 18 commits en `feat/figma/cat`. De sus 10 pantallas: 8 PASS (según el agente) y 2 PARTIAL (`27:882`, `8:230`). Ver `CAT_C1_C5.md` |
| Ola 1, PROD | **Hecho**, integrado en `base` (`a44632a6`). 4 commits en `feat/figma/prod`. Galería PASS; 5 fichas PARTIAL por diferencias deliberadas. Ver `PROD.md` |
| Ola 1, SYS | **Hecho**, integrado en `base` (`0536ef45`). 10 pantallas: 7 PASS (agent verified) y 3 PARTIAL. FAB y WhatsApp resueltos sin tocar SHELL ni PROD; `SocialProofToast` desmontado. Ver `SYS.md` |
| Ola 1, CHK | **Hecho**, integrado en `base` (merge `cf657e9c`, local, sin push). Rama `feat/figma/chk`: 16 commits desde `d1451060` (los 19 cambios sin commitear sobrevivieron al apagón y quedaron commiteados) más `0f017780` (restauración de funcionalidad). De sus 17 pantallas: 3 PASS (`45:1607`, `45:1640`, `45:1692`, todas móvil, agent verified) y 14 PARTIAL. Ninguna es QA final. Ver `CHK.md` |
| Ola 1, CHK, restauraciones | **Hecho** (`0f017780`). Restaurados: "Vaciar pedido", WhatsApp en el resumen de escritorio, guardar por correo en escritorio, garantía de 40 días e "Imprimir" en el pago exitoso, y el contexto `CARRITO:items:total` al asistente global. NO restaurados: `AICartSection`, `CrossSellGrid`, stepper del carrito, precio unitario, meta de envío gratis en el carrito. Excepción de ownership aditiva en `chatStore` y `ChatModal` |
| Ola 1, SYS, ajuste por decisiones | **Hecho**, integrado en `base` (`17988771`, commit `1ec97317`): hoja de accesibilidad sin tema ni filtro de color (alto 354, igual a Figma). Cupón `51:2163` pasa a PASS móvil. Nueva diferencia abierta: Figma resalta el tamaño de fuente "A" (medio) por defecto y la app "A−" |
| Ola 1, PROD, ajuste de la ficha agotada | **Hecho**, integrado en `base` (`d8af873b`) |
| Ola 1, ACC | **Hecho, integrado en `base`** (merge `8cc644fc`, commits `cc54c9c6` y `95328c21` sobre `27f87000`, local, sin push). 18 pantallas: 10 PASS (agent verified) y 8 PARTIAL; ninguna BLOCKED por completo. Cuenta dividida en resumen, opiniones y datos y seguridad; pedidos por paquete; solicitudes dentro de `/servicios`; login y 2FA al estilo de Figma. Ver `ACC.md` |
| Ola 1, SRV | **Hecho, integrado en `base`** (merge `68c0952f`, commits `3282fe58` y `87e2e276` sobre `f57da0ae`, local, sin push). 8 pantallas: 1 PASS y 7 PARTIAL (agent verified); ninguna BLOCKED por completo. Servicios HOT en lista, formulario y garantía, encargo con línea de tiempo, cotización pública, Envíos con la plantilla informativa y blog. Ver `SRV.md` |
| Ola 1, STORE | **Hecho, integrado en `base`** (merge `e48d441b`, commits `e179fd2f` y `52a5d239` sobre `e3227842`, local, sin push). 4 pantallas: 0 PASS y 4 PARTIAL (agent verified): perfil móvil, perfil desktop, tienda con su color y directorio. Pendientes: decidir barra inferior y header de escritorio del perfil, y endpoint de empresas públicas para el directorio. Ver `STORE.md` |
| Ola 1, QR | **Hecho, integrado en `base`** (merge `795d7d01`, commits `795c6abe`, `5a526539` y `89315db0` sobre `4d773aaf`, local, sin push). Rama `feat/figma/qr`, puesta al día con `base` (`4d773aaf`) por fast-forward. 13 frames: 1 PASS y 12 PARTIAL (agent verified; 6 pantallas: 1 PASS y 5 PARTIAL, y los 7 correos PARTIAL): QR de mesa (menú y pedido enviado), QR de pago (método, SINPE en curso, pagado, vencido) y 7 correos al cliente. Ninguna BLOCKED. Pendientes: paso de confirmación de la mesa, método elegido por el cajero, "Escanear otro QR", comprobante del pago y datos de paquetes y dirección en los correos. Ver `QR.md` |
| Fase 2c: SHELL (variantes de `MainLayout`) | Integrado en `feat/figma/base` (merge `b3159c1e`, autorizado por el usuario). Base: tsc limpio, 358 tests |
| Fase 2d: análisis de `ProductCard` | Hecho, sin tocar código. Ver `PRODUCTCARD_STRATEGY.md` |
| SYS/SHELL, pasada A1/A2/A4 (2-oct-2026) | **Hecho**, un commit local en `feat/figma/base` (sin push ni merge). A1: Home muestra `PantallaSinConexion` ante un error de red sin datos. A2: línea base de 66 medidas del chrome contra 12 frames, todas dentro de ±1 px tras 4 correcciones (header del carrito desktop de 83 px con el carrito rojo; corazón del header móvil y desktop). A4: el aviso de cookies bajó de z 9999 a 65 porque tapaba la hoja del cupón. No se tocó B1 a B4. Inventario sin cambios de estado (35 PASS / 55 PARTIAL). Ver `SYS.md` y `SHELL_GLOBAL.md` |
| SYS/SHELL, B1 (2-oct-2026) | **Hecho**, un commit local en `feat/figma/base` (sin push ni merge). "Preferencias de cookies" e "Idioma y accesibilidad" se abren desde el pie con `abrirPreferenciasCookies()` y `abrirAccesibilidad()`; se eliminó el botón flotante con el isotipo. Pie desktop sin cambio, pie móvil 71 -> 89 px. No se tocó B3 ni B4. Inventario sin cambios de estado (35 PASS / 55 PARTIAL). Ver `SYS.md` y `SHELL_GLOBAL.md` |
| SYS/SHELL, B2 (2-oct-2026) | **Hecho**, un commit local en `feat/figma/base` (sin push ni merge). WhatsApp: 83 px solo con barra inferior; 16 px si no hay barra; Home (318, 705) y desktop (margen 16) intactos. Spacer de 155 px en la raíz móvil para que el pie legal no quede debajo del botón. B4 sin cambios. Inventario sin cambios de estado (35 PASS / 55 PARTIAL). Ver `SYS.md` |
| SYS/SHELL, B3 (2-oct-2026) | **Hecho**, un commit local en `feat/figma/base` (sin push ni merge). Al abrir la hoja, el chip marcado es A y la raíz sigue en 16 px. A+ aplica `fs-lg` (18 px). A− se muestra y no reduce la fuente (sin frame). La fila `51:2229` sigue PARTIAL. Inventario en ese momento: 35 PASS / 55 PARTIAL. Ver `SYS.md` |
| SYS/SHELL, B4 (2-oct-2026) | **Hecho**, un commit local en `feat/figma/base` (sin push ni merge). El aviso `45:1946` pasa a PASS móvil: la tarjeta a 390 queda en x 12, y 560, 366 × 205 (0 px) y `CookieBanner` no se tocó. Desktop sin frame (`left` 24, `bottom` 24) no bloquea ese PASS. La hoja `45:2166` sigue PASS. Inventario en ese momento: 36 PASS / 54 PARTIAL. Ver `SYS.md` |
| SYS/SHELL, B5 (2-oct-2026) | **Hecho**, un commit local en `feat/figma/base` (sin push ni merge). El FAB no se monta en Sin conexión (`45:2264`): ni en `/sin-conexion` ni en `/` cuando Home muestra `PantallaSinConexion`. El Home con datos sigue en (318, 705) y en desktop (1368, 828). La fila pasa a PASS móvil. Inventario: 37 PASS / 53 PARTIAL. Ver `SYS.md` |
| P01 STORE (2-oct-2026) | **Hecho**, un commit local en `feat/figma/base` (sin push ni merge). `/tienda/:slug` (`29:922`, `29:2308`, `51:2468`) y `/emprendimientos` (`29:1159`) remedidos con Playwright a 390 y 1440: posiciones iguales a las de `STORE.md` (0 px), sin desborde horizontal ni errores de consola. Buscadores a 14 px (Figma); antes 16 px por SHELL. Tokens de SHELL (`text-hc-n-400`, `bg-hc-success-bg`) sin cambio de color. `store-perfil.spec.ts` suma 3 casos de responsive. `store-capturas.spec.ts` usa `urlWeb` (el campo real de `/api/convenios/publicos`). Barra inferior, WhatsApp del vendedor y header de escritorio (D01, D20, D02) siguen sin respuesta: las 4 filas quedan PARTIAL. 37 PASS / 53 PARTIAL. Ver `STORE.md`, sección P01 |
| P02 PRODUCTO (2-oct-2026) | **Hecho**, un commit local en `feat/figma/base` (sin push ni merge). Ficha `/productos/:id` remedida con Playwright: `28:839` y `29:2072` (PASS) sin regresión; `44:1775`, `44:1849` y `44:1917` con las mismas posiciones que `PROD.md`. Sin desborde ni errores de consola en 8 vistas. Corregido el punto 5 de `PROD_DECISIONES.md`: sin selector de talla, la cabecera compacta conserva "Quedan N" (`avisoStockBajoSinTalla`). Nuevo `prod-estados.spec.ts` (10 casos) y 3 tests unitarios. D03 (stepper), "Elaboración" (backend) y la anotación del agotado siguen igual: 3 PARTIAL. 37 PASS / 53 PARTIAL. Ver `PROD.md`, sección P02 |
| P03 CHECKOUT (2-oct-2026) | **Hecho**, un commit local en `feat/figma/base` (sin push ni merge). `/checkout` remedido a 390 (3 pasos) y a 1440: sin desborde ni errores de consola, campos a 15 px (Figma). Antes medían 16 px por SHELL, ya no. Tokens de SHELL en `PasoPago`, `PasoEntrega` y `CodigoDescuento`, mismo color. Nuevo `checkout-responsive.spec.ts` (2 casos); `codigoDescuento.test.ts` apunta a la clase nueva. Consentimiento, cédula SINPE, escritorio y atajo internacional (D04, D05, D08, D18) siguen sin respuesta. Tiempos y GAM por origen (B15) siguen como decisión y backend. 37 PASS / 53 PARTIAL. Ver `CHK.md`, sección P03 |
| P04 CARRITO (2-oct-2026) | **Hecho**, un commit local en `feat/figma/base` (sin push ni merge). `/carrito` remedido a 390 y 1440: sin desborde ni errores de consola. `bg-hc-success-bg` en `PaqueteCarritoTarjeta` y `CodigosNotasCarrito`. Nuevo `cart-responsive.spec.ts` (2 casos). WhatsApp y guardar por correo en escritorio sin cambios (DECISIÓN HUMANA B14); «Vaciar pedido», «Sale de <provincia>» (backend) y `51:1820` siguen PARTIAL. `danger-bg` y `text-secondary` sin alias (P13). Contador sin cambio: 37 PASS / 53 PARTIAL. |
| P05 GIFT CARD (2-oct-2026) | **Hecho**, un commit local en `feat/figma/base` (sin push ni merge). Paso 3 con tarjeta válida (`55:2220`) e inválida (`55:2284`) remedido a 390 y 1440: sin desborde ni errores de consola. Sin cambios de código: el contenido no disputado ya estaba. `checkout-responsive.spec.ts` suma 4 casos. D09 y D10 (chrome del paso 3) siguen como DECISIÓN HUMANA; el número previo al pago no existe hasta cobrar. `CheckoutPaidGiftCard` sin frame. Contador sin cambio: 37 PASS / 53 PARTIAL. |
| P06 SERVICIOS (2-oct-2026) | **Hecho**, un commit local en `feat/figma/base` (sin push ni merge). `/servicios` (inicio `28:1429`, formulario `28:1486`, garantía `28:1531`) remedido a 390 y 1440: sin desborde ni errores de consola, campos de 14 px. Tokens de SHELL en `ServiciosInicio`, `FormularioBusqueda` y `VistaGarantia`, mismo color. Nuevo `servicios-responsive.spec.ts` y helper `medidasFigma.ts` (también lo usa `checkout-responsive`). Presupuesto con rangos (REQUIERE_DECISION) y fotos/motivo de garantía (backend) siguen PARTIAL. Contador sin cambio: 37 PASS / 53 PARTIAL. |
| P07 QR (2-oct-2026) | **Hecho**, un commit local en `feat/figma/base` (sin push ni merge). QR de mesa y de pago remedidos a 390 (0 a 1 px contra `QR.md`) y 1440 (columna de 430 px): sin desborde ni errores de consola. 100 clases `var()` a tokens de SHELL en 13 componentes con frame. `qr-mesa-pago.spec.ts` suma 2 casos con `medidasFigma.ts`. Decisiones y backend de B16 siguen abiertos; correos sin tocar. INVENTORY decía «sin integrar en `base`»: corregido (merge `795d7d01`). Contador sin cambio: 37 PASS / 53 PARTIAL. |
| P08 AUTH (2-oct-2026) | **Hecho**, un commit local en `feat/figma/base` (sin push ni merge). `/login` y `/recuperar-contrasena` remedidos a 390 y 1440: sin desborde ni errores de consola. Regresión corregida: recuperar no usa `MainLayout` y en móvil la regla de 16 px de SHELL le agrandaba el correo y las casillas; la raíz lleva `hc-figma-ui` (15 y 22 px). Tokens `hc-n-400` en 4 componentes. `acc-cuenta.spec.ts` suma 2 casos. Lógica de auth sin tocar. Login y 2FA siguen PARTIAL (sin frame, Clerk, backend). Contador sin cambio: 37 PASS / 53 PARTIAL. |
| P09 CORREOS (2-oct-2026) | **Hecho**, un commit local en `feat/figma/base` (sin push ni merge). Refactor sin cambio de salida: los 7 correos con frame (13 variantes) dan el mismo HTML byte a byte; render en Chrome a 390 (366 px) y 1440 (600 px) sin desborde. `EmailLayoutHelper` reúne tablas, colores, pie y rastreo; sin ternario anidado. Tests Java de correos en verde (+1 caso). Huecos de backend y decisiones de B17 sin cambio; sin prueba en Gmail ni Outlook. Contador sin cambio: 37 PASS / 53 PARTIAL. |
| P10 HOME/CATÁLOGO (2-oct-2026) | **Hecho**, un commit local en `feat/figma/base` (sin push ni merge). Tokens en `Casilla` y en la insignia "Oferta" de `comprador/ProductCard`; el resto de Home y catálogo con frame ya estaba en tokens. Medido a 390 y 1440 sin desborde ni campos de 16 px; corregida la nota vieja de 16 px en `CAT_C1_C5.md`. `catalogo-cta.spec.ts` +2 casos. Siguen abiertos: fotos reales, "Quedan N", badge del carrito, orden de categorías (Figma-D21), "Entendí:" del asistente (backend), tienda y categoría en búsqueda por foto. Contador sin cambio: 37 PASS / 53 PARTIAL. |
| P11 BACKEND (2-oct-2026) | **Hecho**, tres commits de código y uno de docs en `feat/figma/base` (sin push ni merge). Implementado con datos existentes: stock y tienda del carrito recuperado (página `29:2036` y correo `30:1733`), foto del producto en Mis opiniones (`30:1327`), tienda y categoría en la búsqueda por foto (`27:882`). Bug real corregido en `RecuperarCarritoPage` (con el backend real siempre decía "Pedido no disponible"). `29:2036` pasa a PASS. El resto, con campo, pantalla y contrato propuesto, en `BACKEND_GAPS.md`; hallazgo de seguridad: la API pública de productos serializa la bodega completa (dirección, teléfono, correo y encargado). Contador: 38 PASS / 52 PARTIAL. |

## Ramas y worktrees

| Rama | Worktree | Parte de | Responsable | Commits propios | Estado |
| --- | --- | --- | --- | --- | --- |
| `feat/figma/base` | `.claude/worktrees/base` | `master` (`b355fd20`) | SUP | merge `8146495b` | Lista. No se edita: solo recibe merges del supervisor |
| `feat/figma/shell` | `.claude/worktrees/shell` | `feat/figma/base` | SHELL | `197e87a0` (sombra/footer/ícono, cherry-pick de Home), `3b54150d` (variantes), `ac69ca69` (sticky y marca centrada) | Implementada, con QA independiente e integrada en `base` (`b3159c1e`) |
| `feat/figma/home` | `.claude/worktrees/home` | `master` | HOME | `bd50a1d5`, `8c6d1e53`, merge `98ec9abc` (base), `6d0de288` (QA visual) | Base integrada y cuerpo remedido. Sin cambios sin commitear. Aún no se integra en `base` |
| `feat/figma/supervisor` | `.claude/worktrees/supervisor` | `feat/figma/base` | SUP | docs | Activa: documentación. Sus docs se mezclan en `base` |
| `feat/figma/cat` | `.claude/worktrees/cat` | `feat/figma/base` (`ba4a4171`) | CAT | `a2996613`, `579f01a7`, `9881860a` | C1 a C5 y pantallas hechas e integradas en `base` (`1cd7721a`) |
| `feat/figma/prod` | `.claude/worktrees/prod` | `feat/figma/base` (`1c87c9d3`) | PROD | `c0ecd189`, `80c770e9`, `47536ba1`, `ea0d3b0f` | Hecha e integrada en `base` (`a44632a6`) |
| `feat/figma/chk` | `.claude/worktrees/chk` | `11af2c0a` (base de PROD) | CHK | 16 commits (`d1451060` a `3c9b4d62`) y `0f017780` | Hecha e integrada en `base` (`cf657e9c`). Working tree limpio |
| `feat/figma/acc` | `.claude/worktrees/acc` | `feat/figma/base` (`27f87000`) | ACC | `cc54c9c6` y el commit de docs | Hecha e integrada en `base` (`8cc644fc`). Working tree limpio |
| `feat/figma/srv` | `.claude/worktrees/srv` | `feat/figma/base` (`f57da0ae`, por fast-forward) | SRV | `3282fe58` y `87e2e276` | Hecha e integrada en `base` (`68c0952f`). Working tree limpio |
| `feat/figma/store` | `.claude/worktrees/store` | `feat/figma/base` (`e3227842`, por fast-forward) | STORE | `e179fd2f` y `52a5d239` | Hecha e integrada en `base` (`e48d441b`). Working tree limpio |
| `feat/figma/qr` | `.claude/worktrees/qr` | `feat/figma/base` (`4d773aaf`, por fast-forward) | QR | `795c6abe`, `5a526539` y `89315db0` | Hecha e integrada en `base` (`795d7d01`). Working tree limpio |
| `feat/rediseno-comprador-fase2` | `C:\Users\pmdan\hotclick-fase2-test` | `feat/rediseno-comprador` | (PR #93) | 21 commits | **Sin modificar.** Su contenido ya está en `base` |

Topología:

```
master b355fd20
├─ feat/figma/home            (bd50a1d5, 8c6d1e53, merge 98ec9abc de base, 6d0de288)
└─ feat/figma/base            (merge 8146495b de fase2, b3159c1e de SHELL, 62a631ac de docs)
   ├─ feat/figma/shell        (197e87a0, 3b54150d, ac69ca69)
   └─ feat/figma/supervisor   (documentación)
```

Las 8 ramas de la ola 1 ya existen (ver tabla). Al lanzar un agente, su rama debe tener la base actual: si no tiene commits propios se actualiza con `git merge --ff-only feat/figma/base`.

### Worktrees viejos: no reutilizar

Hay 11 worktrees de los agentes K a P y de épicas anteriores (`.claude/worktrees/agent-*`, `agent-n-multivendedor`), más dos carpetas `agent-a6697868…` y `agent-a8c5d035…` que **no están registradas en git** y `C:\Users\pmdan\hotclick-fase2-test`. Revisión del 2026-09-30 (solo lectura):

- Ninguno tiene cambios sin commitear.
- Los 5 con commits que `master` no tiene (`a03737658`, `a389c1c53`, `a8dd1d9b6`, `add02d64e`, `aefe43907`) y `hotclick-fase2-test` tienen **0 commits que `feat/figma/base` no tenga**: su contenido ya está integrado.
- `a43e1a7dd`, `a616fba9d`, `a788de4a2`, `ab89ab36a`, `feat/correos-transaccionales-figma` y `feat/checkout-multivendedor` ya están en `master`.
- Las dos carpetas sin registrar solo ven los dos `HANDOFF_*.md` sin trackear de la raíz del repo.

No se reutilizan: los nuevos se llaman `home`, `shell`, `base`, `supervisor` y los siguientes usarán el nombre del agente. No se ha borrado nada; limpiarlos queda a tu decisión.

Hay además un stash ajeno en el repositorio (`wip-preexistente-no-mio-antes-del-rebase`). No es de este trabajo y no se tocó.

## Fase 2a: integración del PR #93

- Se hizo `git merge --no-ff feat/rediseno-comprador-fase2` sobre `master` en `feat/figma/base`.
- **Conflictos resueltos:**
  - `static/**` (521 archivos de build): se conservó la versión de `master`. Es un artefacto; el supervisor lo regenera al final.
  - `i18n/{es,en,pt}.json`, bloque `product.*`: unión de claves (`size*` de master, `restock*` de fase 2).
- Validación sobre `base`: `tsc` limpio; frontend **80 archivos / 354 tests** en verde; backend **172 clases / 1026 tests, 0 fallos, 0 errores, 15 omitidos** (leído de `target/surefire-reports`).
- El contenido de fase 2 es **solo base funcional**. Las 8 pantallas (recuperar contraseña ×3, seguimiento sin cuenta, ficha agotada, tarjeta de regalo inválida, fallo del servidor, instalar la app) pasaron a UNKNOWN: existen, falta compararlas contra Figma y migrar su UI donde difiera.
- **Defecto heredado de fase 2:** `FormularioAvisoReposicion.tsx` muestra al usuario el texto `product.restockNuevo` = "NUEVO · por programar", que es una anotación de diseño de Figma. Lo corrige PROD.

## Fase 2b: Home

- Verificados los 11 archivos modificados: 8 eran del Home y 3 del shell. Se separaron en dos commits para que SHELL pueda tomar los suyos sin conflicto.
- `feat/figma/home` partía de `master`. Se mezcló `feat/figma/base` en Home (merge `98ec9abc`). Hubo un solo conflicto, en `HeaderComprador.tsx`: se tomó la versión de la base (refactor de SHELL, que reemplaza la versión simple de Home y conserva la sombra al scrollear).
- **Corrección a mi informe anterior:** el Home no estaba en PASS. Al medir en píxeles, el header desktop medía 121 px y Figma dice 111. Lo corrigió SHELL.
- **Decisión aplicada:** el frame `9:171` es la fuente de verdad del Home desktop. `12:610` ya no es objetivo y salió de las pantallas.

### Re-medición del cuerpo de Home (commit `6d0de288`)

Método: Playwright con fuentes reales (Sora y Public Sans), desktop 1440 y móvil 390, API simulada con `context.route` (6 categorías, 4 destacados, 14 productos, historial de 4 ítems) y fotos como placeholders de color. Scripts y capturas en `%TEMP%\home-qa`, fuera del repo.

| Elemento | Figma | App antes | App ahora |
| --- | --- | --- | --- |
| Hero desktop (`9:218`), alto | 572 | 587 | **572** |
| Título h1 desktop | 420x84 | partía "estás / buscando hoy?" | **420x84**, mismo corte que Figma |
| Chips, alto | 33 | 37,5 | **33** |
| Tarjeta asistente desktop | 420x246 | filas de 41 | **246** |
| Categorías desktop (`9:340`) | h250 | h262 | **h250**; tiles 167x152 |
| Seguí donde lo dejaste (`9:379`) | h195 | h204,5 | **h195** |
| Confianza desktop (`9:510`) | h208 | h227 (texto en 3 líneas) | **h208**, cuatro columnas iguales |
| Altura total desktop | 1857 | 1916 | **1855** (2 px del ProductCard) |
| Categorías móvil | h559, tiles 152 | tiles 159 | **h559**, tiles 152 |
| Tarjeta asistente móvil (`7:210`) | 358x380 | 368 | **380** |
| Seguí móvil | h181 | h183 | **h181** |
| Header móvil scrolleado (`12:346`) | y=0, h160, sombra | — | **idéntico** |

Correcciones en archivos de Home: `HomePage.tsx`, `EncabezadoSeccion.tsx`, `TarjetaAsistente.tsx`, `FranjaConfianza.tsx`, `SeguiDondeLoDejaste.tsx`, `CategoryTile.tsx` y `Chip.tsx` (`line-height: normal`, tracking, gaps y `text-wrap`). **`Chip` también lo usan `CatalogAllView` y `ProductAgotado`**: ahora miden 33, como el componente de Figma; CAT y PROD deben tenerlo presente.

Validación: `tsc` limpio · 81 archivos / 358 tests · eslint sin hallazgos en lo tocado · `vite build` compila (salida fuera del repo, `static/` intacto). Verificado aparte por el supervisor: commit presente, worktree limpio, `tsc` y tests repetidos.

**Por qué los tres frames siguen en PARTIAL:** el código de Home mide igual que Figma, pero quedan diferencias que no son de Home:

| Pendiente | Dueño | Acción |
| --- | --- | --- |
| ~~ProductCard mide 278 y Figma 280~~ | CAT | **Resuelto en C0** (`579f01a7`): 167x280. La pastilla de marca y la línea de tienda de Figma quedan descartadas por decisión del usuario. Badge "Quedan N" verificado con datos simulados; falta con datos reales |
| ~~`formatPrice` muestra "₡6 200" y Figma "₡6.200"~~ | Decisión del usuario | **Resuelto** (`a2996613`): `formatMiles` con `Intl.NumberFormat('es-CR')` y separador de grupo cambiado a punto. Ver `CAT_C0.md` |
| FAB con isotipo y botón verde de WhatsApp flotantes sobre Home, no están en Figma | SYS | Ya listado en el inventario |
| Copy bajo "Seguí donde lo dejaste": Figma dice "Solo aparece si ya visitaste productos" (parece anotación de diseño); la app conserva "Lo último que miraste" | Decisión del usuario | Mantener el de la app salvo indicación |
| Orden de categorías: Figma fija uno, la app respeta el de la API | Decisión del usuario | Tolerar o fijar orden |
| "Desde ₡4.000 con Correos de Costa Rica…": Figma recorta en seco, la app usa puntos suspensivos con la misma geometría | Decisión menor | Dejar |

**No verificado:** fotos reales de producto y categoría, badge "Quedan N", badge del carrito, hover, foco y animación de la pregunta rotativa. Sin backend real, solo datos simulados.

## Fase 2c: SHELL

Qué entrega (API completa en `COMPONENT_OWNERSHIP.md`):

- `MainLayout` con `variante`: `raiz` (por defecto), `interna`, `marca`, `propia`; y `encabezadoEscritorio`: `completo`, `compacto`, `minimo`. Los 41 usos actuales no cambian.
- Componentes nuevos: `BarraInterna`, `BarraMarca`, `HeaderEscritorioCompacto`, `HeaderEscritorioMinimo`; utilidades `inicialesDe`, `puedeVolverAtras`; íconos `barraAtras` y `compraSeguraCandado` (descargados de Figma).
- Regla CSS `.hc-input-libre` en `index.css`: una regla global antigua forzaba `background-color` en todos los `<input>` y pintaba una franja blanca sobre los buscadores con fondo gris.

Medidas contra Figma (con las fuentes reales Sora y Public Sans cargadas):

| Elemento | Figma | App antes | App ahora |
| --- | --- | --- | --- |
| Header desktop completo (`12:809`) | 111 | 121 | **111** |
| Header desktop compacto (`30:1480`) | 79 | (no existía) | **79** |
| Header desktop mínimo (`30:2386`) | 71 | (no existía) | **71** |
| Header móvil global con chips (`12:551`) | 160 | 165 | **160** |
| Barra interna móvil (`28:1144`, `27:941`) | 51 | (no existía) | **51** |
| Barra de marca móvil (`45:2199`) | 53 | (no existía) | **53** |
| Barra inferior (`12:582`) | 67 | 71 | **67** |
| Banner + pie, móvil (`12:483` 67 + `12:489` 71) | 138 | 167 | **138** (67 + 71) |
| Banner + pie, desktop (`9:550` 84 + `9:559` 59) | 143 | 156 | **143** (84 + 59) |

Validación: `tsc` limpio · frontend 81 archivos / 358 tests (4 nuevos) · eslint sin hallazgos en lo tocado · `vite build` compila (salida fuera del repo; `static/` intacto).

No-regresión: se midieron 34 rutas reales en móvil y desktop contra `base`: 0 errores de página, 0 desbordes horizontales, ninguna redirección nueva, misma presencia de barra inferior y footer. Las únicas diferencias son las alturas corregidas a Figma y el footer móvil, ahora más corto porque se quitó "Ayuda".

**QA independiente (agente distinto, sin confiar en mi informe):** 16 casos medidos con Playwright y fuentes reales contra metadata y capturas de Figma. 14 coinciden dentro de 1 px. Hallazgos:

| # | Hallazgo | Acción | Estado |
| --- | --- | --- | --- |
| 1 | Barra de marca centrada (`29:1932`): Figma 55 / logo 26 / texto 80x21; app 53 / 28 / 84 | Variante de tamaño `centrada` y padding 14 | Corregido: 55 / 26 / 79x21 (commit `ac69ca69`) |
| 2 | El header **no era sticky** en ninguna ruta (defecto previo): `overflow-x: hidden` en `html`, `body` y el wrapper creaba un contenedor de scroll. La sombra al scrollear nunca se veía | `overflow-x: clip` en los tres | Corregido y verificado en 21 rutas x 2 viewports, incluido `/admin`: header en y=0 tras scrollear, sin desborde ni errores |
| 3 | Carrito vacío sin badge: el buscador desktop mide 822 y Figma 795 (con badge "2") | Ninguna: depende del dato | Sin acción |

Como `index.css` es global, el cambio a `clip` afecta a todo el sitio, incluidos los paneles admin. Las rutas probadas no mostraron regresión, pero la revisión visual del panel admin no se hizo.

**Estado de SHELL: integrado en `feat/figma/base` (merge local `b3159c1e`, sin push), con el usuario autorizándolo.** Una segunda pasada del QA sobre `ac69ca69` no se ha hecho; las dos correcciones las verifiqué yo con mediciones.

## SHELL global

Pasada global de SHELL (rutas, barra inferior, alias, inputs móviles, banner, header): ver `SHELL_GLOBAL.md`.

## Archivos bloqueados ahora

| Archivo | Bloqueado por | Hasta |
| --- | --- | --- |
| `layouts/MainLayout.tsx` y `components/comprador/header/*` | SHELL | Integración de SHELL en `base` |
| `components/comprador/ProductCard.tsx` | CAT | C0 hecho. Cambios solo vía CAT |
| `components/ui/ProductCard.tsx`, `ui/productCard/*`, `catalogoProductCard.ts` | CAT | Pasos C1 a C5 |
| `app/AppRoutes.tsx`, `static/**`, `package.json`, `pnpm-lock.yaml` | SUP | Siempre |
| `i18n/locales/*.json` | Por namespace (ver ownership) | Siempre |

## Dependencias

```
base ──► shell ──► [QA independiente] ──► integrar en base ──► ola 1
                                                   ├─ home  (merge de shell + re-medición)
                                                   ├─ cat   (C0 del ProductCard primero si otros lo necesitan)
                                                   ├─ prod, store, chk, acc, srv, sys, qr
```

## Listo para comenzar

SHELL y los docs ya están en `base`, y Home ya tiene la base mezclada y remedida. La ola 1 puede arrancar cuando el usuario lo indique. Cuando eso ocurra, cada agente arranca con: rama `feat/figma/<agente>` desde `base`, su worktree propio, su lista de pantallas del inventario, y el compromiso de convertir sus UNKNOWN en estado real **antes** de escribir código.

Prioridad sugerida dentro de la ola 1: CAT (desbloquea el `ProductCard`), luego PROD y CHK (la compra), ACC, y al final SRV, SYS, STORE y QR.

## Decisiones pendientes del usuario

| # | Decisión | Afecta a |
| --- | --- | --- |
| 1 | ~~Integrar SHELL en base~~ Hecho | Todos |
| 2 | ~~Precio tachado y badge Oferta~~ **Resuelto: se conservan, discretos** | CAT |
| 3 | ~~Ofertas HOT y pestaña Emprendimientos~~ **Resuelto: se eliminan** (ver `PRODUCTCARD_STRATEGY.md`) | CAT |
| 4 | ~~Quick view~~ **Resuelto: se elimina** | CAT |
| 5 | ~~Pastilla de marca, condición, punto de stock y línea de envío~~ **Resuelto: se descartan** | CAT |
| 6 | Limpieza de los worktrees viejos (revisados, nada sin commitear; ver la sección de worktrees) | — |
| 7 | ~~Formato de precio~~ **Resuelto: `₡6.200` global** | Home, CAT, CHK |
| 8 | ~~Copy "Solo aparece si ya visitaste productos"~~ **Resuelto: se mantiene "Lo último que miraste"**. Abierto: orden de categorías del Home | HOME |
| 9 | ~~Columnas fijas o fluidas en el catálogo~~ **Resuelto por CAT con evidencia: fijas de 167** (113 instancias de la tarjeta miden 167x280 en Figma, también en desktop). Ver `CAT_C1_C5.md` | CAT |
| 10 | ~~"Comprar ahora"~~ **Resuelto: se elimina.** El flujo es "Agregar al pedido" -> hoja `45:1607` ("Ver pedido" al carrito, "Seguir comprando" cierra). Sin puente temporal en el toast. La hoja la construye CHK (con el cableado mínimo en la ficha). Ver `PROD_DECISIONES.md` | CHK |
| 11 | ~~Confianza, prueba social y garantía~~ **Resuelto: fuera de la ficha** (Figma lo respalda). La confianza va en el checkout ("Compra segura", "Pago protegido", compra sin crear cuenta): lo hace CHK | CHK |
| 12 | ~~Foto del agotado~~ **Resuelto: Figma literal**, rectángulo blanco opaco (`n/0`) cubriendo la foto al 100 %, sin overlay de 35 % ni variante inventada. Se ajustará si el diseñador aclara otra intención | PROD |
| 13 | ~~Stepper de cantidad~~ **Resuelto: se mantiene en variantes** (los frames `44:*` son parciales); en personalizado se mantiene la omisión (no cabe en la barra) | PROD |
| 13b | ~~`SocialProofToast`~~ **Hecho por SYS: desmontado** (inventa compradores al azar, no está en Figma, riesgo Ley 7472). Lo hace SYS y limpia el código muerto asociado | SYS |
| 14 | Chip "Con stock" (`43:1541`): CAT no lo agregó porque el catálogo filtra por stock por defecto | CAT |
| 15 | CAT quitó "Compra por marca", el chip de la búsqueda activa y la UI de condición y talla (Figma no los dibuja; `?marcaId=` sigue filtrando). ¿Se acepta? | CAT |
| 16 | "Deshacer la última" en Descubrí (nuevo, visto en Figma). ¿Se queda? | CAT |
| 17 | Asistente: hoja inferior en móvil; se conservan el ícono de WhatsApp y el botón de borrar que Figma no dibuja. ¿Se acepta? | CAT |
| 18 | ~~Selector de tema~~ **Resuelto: eliminado de la hoja del comprador** (Figma respalda: idioma, tamaño de fuente, alto contraste, reducir movimiento; sin tema). No se traslada a otra pantalla; si se conserva en admin, fuera del alcance del comprador | SYS |
| 19 | ~~Filtro de color/visión~~ **Resuelto: se saca de la hoja del comprador** (Figma no lo dibuja; es un simulador de daltonismo global). No se reimplementa en otro lugar; idea fuera de alcance: apariencia/admin. SYS lo aplica verificando que el resto de opciones de accesibilidad no se rompa | SYS |
| 20 | ~~Campo de correo del cupón~~ **Resuelto: se mantiene 42 px** (el frame de 26 px está comprimido: única diferencia entre 5 campos iguales) | SYS |
| 21 | ~~WhatsApp desktop~~ **Resuelto: abajo a la derecha, margen 16 px** (nota `52:2422`). **Cookies desktop: `REQUIRES_DESIGN_REFERENCE`**: se mantiene temporalmente la tarjeta abajo a la izquierda (SYS la cambió de la banda centrada anterior sin respaldo en Figma); no es PASS ni está respaldada por Figma hasta que exista frame desktop | SYS |
| 22 | ~~Desktop tras "Agregar"~~ **Resuelto provisional: se mantiene el toast "Añadido"**. No se implementa la hoja `45:1607` en desktop por analogía (Figma solo la enlaza desde la ficha móvil). **`REQUIRES_DESIGN_REFERENCE`**: falta referencia o interacción desktop; no es PASS definitivo en desktop | CHK |
| 24 | ~~Chip de fuente marcado al abrir~~ **Resuelto en B3 (2-oct-2026):** A queda en 16 px (`normal`) y A+ en 18 px (`fs-lg`). Sigue pendiente el efecto de A−: el frame no define un tamaño menor, así que el chip no cambia la raíz y la fila `51:2229` sigue PARTIAL | SYS |
| 23 | ~~Aviso de envío del primer producto de un negocio~~ **Resuelto: se mantiene omitido**; se muestra solo cuando ya hay otro producto del mismo negocio (el caso dibujado en Figma) | CHK |

| 25 | ~~Funcionalidad que CHK quitó y Figma no elimina~~ **Resuelto (1-oct-2026): se restauran** vaciar pedido, WhatsApp en escritorio, guardar por correo en escritorio (posición sin referencia desktop), garantía de 40 días, imprimir y el contexto del carrito al asistente. **Se mantienen eliminados**: `AICartSection`, `CrossSellGrid`, stepper, precio unitario, meta de envío gratis en el carrito | CHK |
| 26 | Cédula SINPE (no está en Figma), atajo de envío internacional y consentimiento (Ley 8968) en escritorio: se conservan; ¿se aceptan? | CHK |
| 27 | Frames de escritorio que faltan (REQUIRES_DESIGN_REFERENCE): pago exitoso/fallido, pantalla previa de transferencia SINPE, hoja tras "Agregar" | CHK |
| 28 | `autoQuery` del asistente global: `ChatModal` limpia `pendingMessage` al abrir y la pregunta inicial no se envía sola (afecta también a `AsistentePedido`). Es de CAT, no de CHK | CAT |
| 29 | ACC: **Direcciones guardadas** en Datos y seguridad (`30:1436`, marcada "NUEVO · a confirmar") no existe en backend: se omitió. ¿Se aprueba construirla? | ACC |
| 30 | ACC: **"Idioma y accesibilidad" en Mi cuenta** (SYS la pidió): ningún frame de Figma la dibuja, no se inventó. Falta el diseño. Desde el 2-oct-2026 (B1) ya no hay botón flotante: la hoja se abre desde el pie, que en móvil solo se ve en pantallas raíz | ACC, SYS |
| 31 | ACC: **solicitud cotizada** necesita backend (precio, vigencia, entrega, comprar) y la pestaña **Encargos** necesita un listado del comprador. ¿Se prioriza? | ACC, SRV |
| 32 | ACC: **login**: el paso de contraseña no tiene frame (se pide tras "Continuar") y no se puede saber si un correo existe, así que "Creá una" va en el paso 2. Pedir a diseño el frame del paso de contraseña y del registro | ACC |
| 33 | ACC: **"Confiar en este dispositivo"** de la verificación en dos pasos no tiene soporte en backend. ¿Se construye? | ACC |
| 34 | ACC: la opinión exige comentario en backend aunque Figma diga "(opcional)". ¿Se cambia el backend o el texto de Figma? | ACC |
| 35 | SRV (no bloquea la integración): **Presupuesto aproximado** del formulario `28:1486` es un selector con rangos en Figma y texto libre en el backend. ¿Se aprueba una lista de rangos? | SRV |
| 36 | ~~Tiempos y tarifas de Envíos~~ **Resuelto: se mantienen los del checkout** ("30 min – 2 horas", "2–4 días hábiles"); no se cambia la lógica del checkout para igualar el texto de Figma | SRV |
| 37 | ~~Devoluciones, Información, Contacto, Términos y Privacidad~~ **Resuelto: sin frame no se rediseñan**; siguen OLD_DESIGN, pendientes de referencia visual | SRV |
| 38 | SRV (no bloquea la integración; la pantalla sigue PARTIAL): **Blog**: chips de temas, buscador, productos por artículo y autor necesitan backend. ¿Se priorizan? | SRV |
| 39 | SRV (no bloquea la integración; la pantalla sigue PARTIAL): **Aceptar cotización** (`55:2332`) necesita endpoint y estado nuevo. ¿Se construye? | SRV |
| 40 | SRV (no bloquea la integración; la pantalla sigue PARTIAL): **Fotos de la falla** en la garantía (`28:1531`) necesitan campo y almacenamiento en `SolicitudGarantia`. ¿Se construye? | SRV |
| 41 | ~~Teléfono de "Tu WhatsApp"~~ **Resuelto: se acepta el campo simple que agrega +506**; sin selector de país | SRV |

## Riesgos abiertos

- **Pendientes de integración tras SYS:** hechos el 2-oct-2026 la ruta `/sin-conexion` (SHELL), el alias `--color-hc-success-bg`, la prop de fondo blanco de `MainLayout` y Home con `esSinConexion` -> `PantallaSinConexion` (A1). `FooterComprador` con "Preferencias de cookies" e "Idioma y accesibilidad" y el retiro del botón con isotipo (B1) también quedaron hechos. Sigue abierta la fila de accesibilidad en Mi cuenta (ACC, sin frame): en móvil el pie solo existe en pantallas raíz, así que desde carrito, ficha, login y cuenta la hoja no tiene otro acceso.
- **`REQUIRES_DESIGN_REFERENCE`:** la interacción desktop tras "Agregar" en la ficha (toast) sigue sin frame. El aviso de cookies en desktop tampoco tiene frame (`left` 24, `bottom` 24); desde B4 (2-oct-2026) eso no bloquea el PASS móvil de `45:1946`.

- **PASS sin QA independiente (se documentan como `PASS — agent verified`):** los 10 PASS de CAT y PROD son del propio agente, con API simulada y fotos de color. Conviene un QA con otro agente y datos reales antes de darlos por cerrados.
- **e2e de Playwright sin arreglar:** fallan `catalogo-iconos` ("Ver más") y los que leen archivos borrados por otros agentes (`AdminConvenios`, `NavbarMobileCategorias`, `ShippingSection`, `navbarIcons`) o buscan el botón "Menú" del header anterior. Hay que decidir quién los arregla.
- **Lint previo:** quedan errores de eslint que ya existían en `AIChat`, `SearchPanel`, `useSearchPanel`, `DescubriPage:135` y `utils/gustos.ts:120` (regla de refs durante render), más 88 en `src/pages` fuera de lo tocado.
- ~~**Dependencias hacia SHELL:** `MainLayout` manda "buscar con foto" a `/servicios`, el buscador desktop sin la búsqueda actual, la barra inferior en `/productos?cat=`~~ Resueltas por SHELL (`SHELL_GLOBAL.md`). El `<h1>` de `BarraInterna` quedó resuelto en B6: la barra es el heading solo cuando ese texto es el título de la pantalla; si el cuerpo ya tiene un `<h1>`, el de la barra sigue en `<p>`.
- **Dependencias hacia SYS:** el FAB del asistente y el botón de WhatsApp flotantes se superponen a la barra de compra móvil de la ficha y no están en Figma.
- **Dependencias hacia backend:** el SSE del asistente no manda los filtros interpretados (fila "Entendí:"); falta `empresaNombre`, `tienda` y `categoria` en resultados de foto; falta dato de tiempo de elaboración y guía de tallas.

- **Dependencias hacia backend (CHK):** provincia de la bodega y marca GAM ("Sale de X" y envío por origen), `tokenSeguimiento` en el estado del pago, comisión y "Paquete N de M", y `stock` en el carrito abandonado.
- **Dependencias hacia SHELL (CHK):** una regla global de `index.css` fuerza 16 px en inputs móviles (los frames piden 14 y 15) y falta el alias `--color-hc-success-bg`.
- **e2e:** `pdp-comprar-ahora` se reemplazó por `pdp-agregar-hoja`; siguen fallando fuera de CHK `asistente-checkout` y `envio-rapido`. Queda un error de eslint previo en `useCheckoutForm.ts`.
- **Dependencias hacia SHELL (ACC):** `ReturnVisitorBanner` aparece sobre Mi cuenta y no está en Figma; `BarraInferior` decide solo por ruta y no marca "Cuenta" en `/servicios?vista=solicitudes`; alias `--color-hc-n-400` faltante (se usa `var(--hc-n-400)`); variante de fondo blanco de `MainLayout` para los estados vacíos.
- ~~Dependencias hacia CAT (ACC): el corazón de la `ProductCard` no se rellena en Favoritos~~ Resuelto el 1-oct-2026 (`favorito-activo.svg`).
- **Dependencias hacia SRV (ACC):** `ServiciosHotPage` pasó a `ServiciosHotVistas` con un `default` que abre `?vista=solicitudes|busqueda|garantia|testimonio`; la pestaña de "mis solicitudes" dentro de Servicios HOT sigue con el diseño anterior.
- **e2e previos fuera de ACC:** `bottom-nav.spec.ts` (3 pruebas del diseño anterior de la barra inferior) ya fallaba en `base`. ACC actualizó `mis-pedidos`, `wishlist-cta` y `wishlist-placeholder`, que también fallaban.
- **Dependencias hacia SHELL (SRV):** los inputs móviles se fuerzan a 16 px (Figma pide 14); una regla pinta `header`, `aside` y `footer` con `!important`, así que un bloque con fondo propio no puede usar esas etiquetas; `BarraInferior` no marca "Inicio" en `/blog`; faltan los alias `--color-hc-success-bg`, `--color-hc-n-400` y `hc-red-50`.
- **Dependencias hacia SYS (SRV):** el botón con isotipo se retiró el 2-oct-2026 (B1). El WhatsApp en internas sin barra pasó a 16 px del borde (B2) y el formulario puede scrollear el envío por encima; no hay frame de esa posición.
- **Dependencias hacia backend (SRV):** categoría, productos y autor de las entradas del blog; endpoint para aceptar una cotización; fotos y motivo de la solicitud de garantía; nombre de la tienda, fechas, tiempo de producción, envío y teléfono del vendedor en el encargo; rangos de presupuesto.
- **Defectos previos corregidos por SRV:** el desenvuelto del interceptor dejaba vacías las listas de garantías, productos por opinar y blog; el artículo del blog usaba una clase sin CSS; `formatMonto` agrupaba miles con espacio duro. Ver `SRV.md`.
- **e2e previos fuera de SRV:** `ui-sin-emoji.spec.ts` (16 casos) y 3 casos de `envio-*` sobre el Home fallan igual en `base`. SRV actualizó `blog`, `envio-internacional` y `envio-rapido` (`/envios`) y agregó `srv-servicios.spec.ts` (16 casos).
- **Dependencias hacia backend (STORE):** endpoint de empresas públicas para el directorio (slug, ciudad de la bodega, categoría, fotos y conteo de productos) y días de atención del retiro.
- **Dependencias hacia SHELL (STORE):** la regla global de `header`/`aside`/`footer` con `!important` dejaba invisible el header de la tienda (corregido con `div role="banner"`); los inputs móviles se fuerzan a 16 px.
- **Nota del 2-oct-2026 sobre las dependencias hacia SHELL de CHK, ACC, SRV y STORE:** SHELL ya resolvió los alias de color, la regla de 16 px en inputs móviles (excluye `.hc-figma-ui` y `.hc-tenant-theme`), el aviso de `/blog`, `/servicios?vista=solicitudes` en Cuenta, `ReturnVisitorBanner` en `/perfil`, `/mis-pedidos` y `/wishlist`, y el fondo blanco. Sigue abierta la regla `header, aside, footer { … !important }` de `index.css`. El `<h1>` de `BarraInterna` quedó resuelto en B6.
- **e2e previos fuera de STORE:** `tienda-checkout.spec.ts:77`, `tienda-theme.spec.ts:115` (carrito global, CHK) y `convenios-marquee.spec.ts` (Home) fallan igual en `base`. STORE actualizó `tienda-theme` y `tienda-vacia` y agregó `store-perfil.spec.ts` (6 casos).
- **Fase 2 llegó sin CI:** el PR #93 nunca disparó GitHub Actions. Lo validado aquí es local (tests, tipos, build). Sigue sin pasar los gates E1 a E18.
- **Conflictos de i18n** entre agentes: mitigados con namespaces, pero el riesgo de merge persiste. Gate E17 exige es/en/pt en el mismo commit.
- **Fixtures:** 76 pantallas dependen de datos (carrito, sesión, pedidos con paquetes). Sin un arnés común de datos, cada agente improvisará el suyo. Conviene un fixture compartido antes de la ola 1.
- **Medición:** la diferencia del `line-height` heredado (1,5 contra `normal` de Figma) aparece en cualquier componente nuevo. Regla para todos: comparar alturas en píxeles con fuentes reales cargadas, no solo a ojo.
- **Anotaciones de Figma:** "NUEVO · por programar" no debe llegar a la interfaz.
- **Dependencias hacia backend (QR):** número de cobro y caja en el cobro por QR, elección de método por el cliente, comprobante o correo del pagador, pedidos hermanos por `grupoPago`, dirección y tipo de envío en el pedido, vencimiento del cupón. Ver `QR.md`.
- **Dependencias hacia SYS (QR):** el botón flotante de WhatsApp aparece sobre las pantallas de pago por QR (`ConditionalWhatsAppFab` en `AppChrome`); no está en Figma.
- **Despliegue (QR):** los 9 PNG de `frontend/public/email/` ya están en `base`; llegan a `https://hotclick.lat/email/` con el `pnpm build` y el deploy de SUP. Hasta entonces un correo enviado mostraría el círculo sin ícono.
- **Pendiente de QR (correos):** prueba en Gmail y Outlook; "Paquete N de M", dirección de entrega, "Quedan N", vencimiento de 30 días del cupón y asunto del código de verificación siguen documentados en `QR.md` y no se inventan.
- **eslint previo (QR):** `usePosPagoQr.ts` (`set-state-in-effect`) ya fallaba en `base`.
