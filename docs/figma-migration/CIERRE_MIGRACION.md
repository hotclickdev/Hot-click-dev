# Cierre de la migración Figma (P21, 2-oct-2026)

Punto de entrada único al estado final de `feat/figma/base`. Junta lo que estaba repartido en `INVENTORY.md`, `PROGRESS.md`, `SHELL_GLOBAL.md`, `BACKEND_GAPS.md`, `B19-CIERRE.md` y los documentos de cada módulo. **No cambia ningún estado:** cada fila sigue con la evidencia que tiene en `INVENTORY.md`.

| | |
| --- | --- |
| Rama | `feat/figma/base` (local; sin push, merge, PR ni deploy) |
| HEAD al documentar | `8e07c61c` |
| `master` | `b355fd20` (sin tocar) |
| Pantallas | 90: **56 PASS — agent verified / 34 PARTIAL** después de las decisiones aceptadas (§10); antes 38 / 52. 0 OLD_DESIGN, MISSING, BLOCKED ni UNKNOWN |
| Frontend implementable sin decisión externa | Ninguno (B19, confirmado en P01–P20) |
| QA final | P22 (§9): 38 PASS / 52 PARTIAL / 0 BLOCKED, sin regresiones; 13 tests que ya fallaban en `14e841e3` |
| Decisiones aceptadas | `feat/figma/pendientes` (local, sobre `54c64201`), §10 |

Los PASS son veredictos del agente, medidos con API simulada. Falta un QA independiente con datos reales y correos probados en Gmail y Outlook antes de darlos por definitivos (`QA_GLOBAL.md`, B19 §10).

## 1. Commits P01–P22

Todos en `feat/figma/base`, el 2-oct-2026, hora de Costa Rica. Antes de P01 la base estaba en `14e841e3` (`test(figma): update obsolete post-b19 tests`).

| Bloque | Commit(s) | Hora | Qué cubrió |
| --- | --- | --- | --- |
| P01 STORE | `3108bc4d` | 04:01 | `/tienda/:slug`, `/emprendimientos` |
| P02 PRODUCTO | `de6f661a` | 04:13 | Ficha, `prod-estados.spec.ts` |
| P03 CHECKOUT | `6a755813` | 04:28 | `/checkout` a 390 y 1440 |
| P04 CARRITO | `783b0397` | 04:33 | `/carrito` |
| P05 GIFT CARD | `ff4bca8f` | 04:41 | Paso 3 con gift card (sin cambio de código) |
| P06 SERVICIOS | `b9c9d411` | 04:46 | `/servicios`, `medidasFigma.ts` |
| P07 QR | `49196ba4` | 04:51 | QR de mesa y de pago |
| P08 AUTH | `aeca85ed` | 04:57 | `/login`, `/recuperar-contrasena` |
| P09 CORREOS | `6e503a04` | 05:05 | `EmailLayoutHelper` (HTML idéntico) |
| P10 HOME/CATÁLOGO | `b07788b2` | 05:13 | Tokens en `Casilla` y en la insignia «Oferta» |
| P11 BACKEND | `4b7a71c6`, `818764ce`, `88101cf3`, `34f7b696` (docs) | 05:34–05:42 | Carrito recuperado con stock y tienda (`29:2036` → PASS), foto en Mis opiniones, tienda y categoría en la búsqueda por foto; `BACKEND_GAPS.md` |
| P12 SHELL | `18c0e81a` | 06:03 | Regla `header, aside, footer`, QR bajo `hc-figma-ui`, `set-state-in-effect` |
| P13 COMPONENTES | `e5443c7c` | 06:26 | Alias `@theme`, 113 `var()` pasados a clases |
| P14 ESTADOS | `eaf95d3b` | 07:09 | 500, 404 y sin red en 46 rutas; `wrap-anywhere` |
| P15 RESPONSIVE | `c0422c8f` | 08:08 | 100 vistas; regla de 16 px en inputs |
| P16 FORMATO | `4041f3d7` | 08:25 | `₡6.200` en todos los canales; `FormatoColones` |
| P17 I18N | `27f161a6` | 08:52 | 154 claves es/en/pt; `paridadClaves.test.ts` |
| P18 RUTAS | `2c0d715f` | 09:26 | Scroll al volver; `destinoPostLogin` |
| P19 A11Y | `533bfebe` | 10:04 | h1, foco atrapado, foco con teclado, movimiento reducido, contraste medido |
| P20 LIMPIEZA | `8e07c61c` | 10:36 | 37 archivos muertos, CSS y claves sin uso, specs viejos |
| P21 DOCS | `587d1957` | 10:48 | Este documento y la documentación final |
| P22 QA FINAL | commit `fix(figma): implement P22 final qa` | — | QA final de las 90 pantallas (§9); dos specs viejos corregidos |

El detalle de cada bloque está en su fila de `PROGRESS.md` y en su sección de `SHELL_GLOBAL.md` (P12–P20) o del documento del módulo (P01–P10).

## 2. Decisiones humanas pendientes (lista consolidada)

**Actualización 2-oct-2026:** estas decisiones se aceptaron y se implementaron en `feat/figma/pendientes`; el estado de cada una está en §10.2. Las tablas de abajo quedan como registro de la pregunta original.

Ninguna se implementó por inferencia. «Vigente» describe lo que hace el código hoy. La matriz original de D01–D21 está en `B8-decisiones-Figma.md`, un archivo local que no se versiona. El análisis de cada una está en B10–B18, y el resumen en B19 §6.

### 2.1 Figma-D01 a D21

| ID | Tema | Frame / ruta | Vigente hoy | Qué hay que decidir | Dónde | Quién |
| --- | --- | --- | --- | --- | --- | --- |
| D01 | Barra inferior de la tienda | `29:922` `/tienda/:slug` | `TiendaBottomNav` (Catálogo, Pedido, HotClick) en móvil | ¿Se queda aunque el frame no la dibuje? | B11, `STORE.md`, P01 | Diseño + Producto |
| D02 | Header de la tienda en escritorio | `29:2308` | `TiendaHeader`, con el pedido aislado (`tiendaStore`) | ¿Header del marketplace (`cartStore`) o el de la tienda? Si gana el del marketplace, hay que definir cómo conviven los dos carritos | B11, P01 | Diseño + Producto |
| D03 | Stepper de cantidad en variantes | `44:1775` `/productos/:id` | Stepper conservado (decisión provisional #13 de `PROGRESS.md`) | Confirmar contra `44:1775`, que lo omite | B13, `PROD_DECISIONES.md` #4, P02 | Diseño + Producto |
| D04 | Consentimiento (Ley 8968) y cédula SINPE en «Datos» | `28:1083` `/checkout` | Los dos se exigen | ¿Se aceptan sin frame? | B10, `CHK.md`, P03 | Producto |
| D05 | Cédula SINPE y atajo internacional en el pago móvil | `29:1344` | Se muestran | ¿Se quedan? | B10, P03 | Producto |
| D06 | Pago cancelado en escritorio | `29:1999` | Columna del móvil | Falta el frame de escritorio | B9, `CHK.md` | Figma |
| D07 | WhatsApp y «guardar por correo» en el carrito de escritorio | `30:2268` | Restaurados (`0f017780`) | ¿Se quedan en escritorio? | **B14** | Diseño + Producto |
| D08 | Cédula, consentimiento y atajo en el checkout de escritorio | `30:2385` | Se muestran | ¿Se quedan? | B10, P03 | Producto |
| D09 | Chrome del paso 3 con gift card válida | `55:2220` | Indicador de 3 pasos de `29:1344` | ¿Qué frame manda? | B12, P05 | Diseño |
| D10 | Mismo chrome con gift card inválida | `55:2284` | Igual que D09 | La misma respuesta que D09 | B12, P05 | Diseño |
| D11 | Paso de contraseña, Google y login de escritorio | `28:1143` `/login` | Contraseña en el paso 2, sin frame | Faltan los frames | B18, `ACC.md`, P08 | Figma |
| D12 | Presupuesto con rangos | `28:1486` `/servicios?vista=busqueda` | Texto libre | ¿Selector? Hace falta la lista de rangos | B9, `SRV.md`, P06, BG #25 | Diseño + Producto |
| D13 | Tiempos de `/envios` | `28:1660` | Los del checkout: «30 min – 2 horas» y «2–4 días hábiles» (`PROGRESS.md` #36) | ¿Se adopta el copy del frame («24 h» y «1 a 3 días»)? Cambiarlo obliga a cambiar también el checkout | **B15**, `SRV.md` | Diseño + Producto |
| D14 | Paso de nombre, teléfono y notas en la mesa | `29:1650` `/checkout/qr/:token` | `SelfCheckoutFormulario` pide los tres (opcionales) | ¿Se conserva? | **B16**, `QR.md` | Diseño + Producto |
| D15 | Formulario del pagador SINPE | `29:1830` `/pos/pago/:token` | Nombre, cédula y teléfono, sin frame | Falta el frame | B16 | Figma |
| D16 | Texto del correo de pago fallido | `30:1708` | «No se completó. No se hizo ningún cobro.» (la reserva se libera) | ¿«Quedó guardado» (frame) o el texto actual? | **B17** | Producto |
| D17 | Código OTP en el asunto | `30:1793` | El asunto no lleva el código (se vería en la pantalla de bloqueo) | ¿Se pone en el asunto? | **B17** | Producto |
| D18 | Atajo internacional en escritorio | `51:2000` | Se muestra | ¿También en 1440? | B10, P03 | Diseño |
| D19 | Tamaño de fuente de A− | `51:2229` | El chip no cambia la raíz | Falta el tamaño | B18, `SYS.md` (#24) | Diseño |
| D20 | Tienda con su color | `51:2468` | El color ya coincide. Quedan el FAB de WhatsApp del vendedor en escritorio (`TiendaWhatsAppFab`) y el enlace del encabezado en móvil | ¿Se mantienen? Se responde con D01 | B11, `STORE.md`, P01 | Diseño |
| D21 | Orden de las categorías del Home | `9:171` `/` | Orden de la API | ¿Orden fijo del frame? | B9, P10 (#8) | Diseño + Producto |

### 2.2 Puntos de B14–B17 fuera de D01–D21

| Bloque | Punto | Clase | Referencia |
| --- | --- | --- | --- |
| B15 | GAM por origen de la bodega o por destino | Decisión + backend | BG #5 |
| B16 | Quién elige el método en el QR de pago (`29:1781`): el cliente o el cajero | Decisión | BG #13 |
| B16 | «Escanear otro QR» en el QR vencido (`29:1913`): construir un lector o no mostrar el botón | Decisión | `QR.md` |
| B16 | Número de cobro, caja y comprobante del QR | Backend | BG #12, #14 |
| B17 | Dirección, paquete N de M, carrito con tienda y stock, vencimiento del cupón | Backend (el cupón también necesita una decisión) | BG #9, #10, #11 |

### 2.3 REQUIERE_DECISION de P01–P20

| # | Tema | Evidencia | Bloque |
| --- | --- | --- | --- |
| R1 | **Contraste de tokens debajo de AA:** n-400 da 2,6:1 sobre blanco; n-500 da 4,36:1 sobre n-50 y 4,13:1 sobre n-100; red-500 da 4,14:1; `--hc-success` da 4,39:1. Son colores de Figma | `styles/contrasteTokens.test.ts`; `SHELL_GLOBAL.md` P19 | P19 |
| R2 | **Formato del teléfono:** el campo del checkout muestra `8888 1234` y el número SINPE `7019-6686` (los dos de Figma) | `SHELL_GLOBAL.md` P16 | P16 |
| R3 | **Pasos del checkout en la URL:** hoy viven en estado. «Atrás» del navegador sale del checkout y no hay enlace profundo a un paso | `SHELL_GLOBAL.md` P18 | P18 |
| R4 | **`stock: 99`:** `RecuperarCarritoPage.tsx:57` agrega con 99 aunque desde P11 llega el stock real. El mismo valor por defecto está en `aiChatHelpers.ts:78`, `useAiChat.ts:99`, los topes de `cartStore.ts` (`?? 99`) y `MiniCartItems.tsx:59`. Usar el stock real cambia cuánto se puede agregar | `SHELL_GLOBAL.md` P12; `git grep` en `8e07c61c` | P11, P12 |
| R5 | **FAB de WhatsApp:** en `/emprendimientos` móvil la nota `52:2422` lo hace global y nadie pidió quitarlo. En `/productos` a 390 tapa parte de una tarjeta (`QA_GLOBAL.md` #4). En la tienda va con D01/D20 | `SHELL_GLOBAL.md` P12 y P15 | P12, P15 |
| R6 | **Nombre de la gift card:** el carrito dice «Gift card» (`cart…giftCardLinea`) y el checkout «Tarjeta de regalo {{codigo}}» (`lineaGift`) | `SHELL_GLOBAL.md` P17 | P17 |
| R7 | **Seguridad: datos de la bodega en la API pública.** `Producto.bodega` no tiene `@JsonIgnore`, así que `/productos` y `/productos/:id` exponen `direccionExacta`, `telefono`, `correoContacto`, `encargadoNombre`, latitud y longitud, horarios y capacidad. Propuesta: DTO público con `id`, `nombreBodega`, `provincia`, `canton` y `permiteRetiroCliente` | BG #6 | P11 (**prioridad alta**) |
| R8 | Tamaño táctil de los enlaces del pie móvil (WCAG 2.5.8): agrandarlos alarga el pie medido contra `12:489` | `SHELL_GLOBAL.md` P15 y P19 | P15, P19 |
| R9 | Borde de alto contraste en los `header` de la superficie Figma que tienen su propia clase de borde | `SHELL_GLOBAL.md` P19 | P12, P19 |
| R10 | Respuesta 200 con `data: null`: la ficha y la cotización se pintarían vacías. Cambiar el interceptor afecta a todos los servicios | `SHELL_GLOBAL.md` P14 | P14 |
| R11 | Copy de negocio de las claves nuevas para revisión humana; correos solo en español (el backend no tiene locale) | `SHELL_GLOBAL.md` P17 | P17 |
| R12 | Presupuesto con rangos y fotos o motivo de la garantía | D12; BG #19, #25 | P06 |
| R13 | «Vaciar pedido» restaurado sin frame; contexto del carrito en `AsistentePedido` | `CHK.md` | P04 |
| R14 | Interacción de escritorio tras «Agregar» (toast) y cookies de escritorio (abajo a la izquierda, 24 px): `REQUIRES_DESIGN_REFERENCE` | `PROGRESS.md` #21, #22 | CHK, SYS |
| R15 | Despacho del vendedor sin confirmación: un toque pasa el pedido a ENVIADO | `QA_GLOBAL.md` #5 | QA global |

### 2.4 Abiertas en `PROGRESS.md` (sección «Decisiones pendientes del usuario»)

Siguen sin respuesta:

- **#6:** limpieza de los worktrees viejos.
- **#14–#17 (CAT):** chip «Con stock»; marca, condición y talla quitadas; «Deshacer la última» en Descubrí; hoja del asistente con WhatsApp y borrar.
- **#26:** igual que D04, D05 y D08.
- **#27:** frames de escritorio que faltan.
- **#28:** `autoQuery` del asistente global (no se volvió a verificar en P21).
- **#29–#34 (ACC):** direcciones guardadas; accesibilidad en Mi cuenta; cotizada y Encargos; frame del login; «Confiar en este dispositivo»; comentario obligatorio en las opiniones.
- **#38–#40 (SRV):** blog, aceptar cotización y fotos de la garantía.

`PROD_DECISIONES.md` deja además un punto menor: promedio y conteo con reseñas reales.

## 3. Índice de huecos de backend

La tabla completa, con campo, pantalla y contrato propuesto, está en `BACKEND_GAPS.md`. Clasificación por número de fila:

| Estado | Filas |
| --- | --- |
| IMPLEMENTADO (P11) | #1 carrito recuperado (`4b7a71c6`), #2 foto en Mis opiniones (`818764ce`), #3 búsqueda por foto (`88101cf3`) |
| DATO_EXISTE (falta cablear o medir) | #4 «Sale de <provincia>», #9 paquete N de M en el correo de guía, #8 N de M y forma de entrega en el despacho, #23 tienda en el encargo |
| REQUIERE_BACKEND | #10 dirección en el pedido, #14 comprobante del QR, #15 directorio de tiendas, #16 días de retiro, #17 elaboración, #18 guía de tallas, #19 fotos y motivo de la garantía, #20 cotizaciones, #22 encargos del comprador, #23 fechas y producción del encargo, #26 blog, #28 último cambio de contraseña, #29 direcciones, #32 «Entendí:» del asistente |
| REQUIERE_DECISION | #5 GAM por origen, **#6 bodega pública (seguridad)**, #7 `tokenSeguimiento` del invitado, #8 pago por paquete, #13 método en el QR, #24 teléfono del vendedor, #25 rangos de presupuesto, #27 confiar en el dispositivo, #30 rango de entrega, #31 edición en Mi cuenta (diseño), #33 «Misma categoría» por foto |
| DECISIÓN + BACKEND | #11 vencimiento del cupón, #12 número de cobro y caja, #21 aceptar cotización |
| Solo datos | #34 fotos reales, «Quedan N» y badge del Home |

## 4. Tests que ya fallaban (sin relación con P01–P20)

Evidencia del 2-oct-2026 (hora de Costa Rica). Los mismos 5 casos se corrieron en dos árboles:

- en `8e07c61c`, a las 10:39;
- en un `git archive` de `14e841e3` (la base anterior a P01), a las 10:42, fuera del repo, con los `node_modules` del worktree enlazados.

Comando en los dos árboles: `npx playwright test tests/smoke.spec.ts:131 tests/smoke.spec.ts:237 tests/tienda-checkout.spec.ts:77 tests/catalogo-iconos.spec.ts:67 tests/emprende.spec.ts:51 --reporter=line`.

**Resultado: 5 de 5 fallan en los dos, con el mismo error y en la misma línea.**

| Test | Error (igual en `14e841e3` y en HEAD) | Causa | Otra evidencia |
| --- | --- | --- | --- |
| `smoke.spec.ts:131` «Catálogo con stock permite agregar…» | Línea 137: no aparece «No se encontraron productos», ni el producto, ni un `h3`, en 20 s | Smoke contra el API real: sin backend local con catálogo sembrado (`hotclick.seed.catalogo-local=true`) no hay productos ni estado vacío | `SHELL_GLOBAL.md` P19 |
| `smoke.spec.ts:237` «Emprender abre hub /emprende» | Línea 240: no existe un enlace «Emprender» (timeout de 60 s) | El header Figma (`12:809`, `f9aa72e4`) no tiene ese enlace | `SHELL_GLOBAL.md` P19 y P20 |
| `tienda-checkout.spec.ts:77` | Línea 85: `toContain("tiendaService.crearPedido(slug, { ...form, … })")` | Lee el código fuente, que dice `crearPedido(slug as string, …)`. La línea es igual en `14e841e3` y en `master` `b355fd20`. En el árbol exportado hubo que agregar los dos `.java` que el test lee | `QA_GLOBAL.md` (falla en `master`); `STORE.md` |
| `catalogo-iconos.spec.ts:67` «ver más del catálogo…» | Línea 75: no hay un botón «Ver más» | `/productos` abre la grilla plana porque el filtro de stock arranca en «ok» | `TESTS-POST-B19.md`; `QA_GLOBAL.md` |
| `emprende.spec.ts:51` «pasos 2 y 3 no fingen el alta…» | Línea 56: no hay un heading `/crecé tu negocio/i` | Prueba un copy de la Emprende anterior | `QA_GLOBAL.md` (falla en `master`) |

Specs viejos que ya se resolvieron en P20: `nav-mas` se borró, `home-jobs` quedó con el caso «sin emojis» y `nav-categorias:83` se actualizó y pasa.

ESLint que ya fallaba en HEAD, sin cambio:

- `set-state-in-effect` en `TiendaHomePage` y `TiendaProductoPage`;
- 8 `react-hooks/refs` en `SearchPanel.tsx`;
- `react-refresh/only-export-components` en `CookieBanner.tsx` (2) y en `Toast`;
- los de `AIChat` y `useAiChat` (`QA_GLOBAL.md`).

Fuentes: las secciones de verificación de P14, P19 y P20 en `SHELL_GLOBAL.md`, y `QA_GLOBAL.md`.

## 5. Cómo verificar

Desde `Hot_click_outlet/frontend` (Windows, PowerShell):

```powershell
npx tsc --noEmit -p tsconfig.json          # app
npx tsc --noEmit -p tsconfig.e2e.json      # e2e (lib sin DOM.Iterable: usar Array.from)
npx vitest run                             # 533 tests en P20
npx eslint <archivos tocados>
Remove-Item Env:RUTAS,Env:ANCHOS,Env:MODO,Env:GRUPO -ErrorAction SilentlyContinue
npx playwright test <specs> --reporter=line --workers=4
npx vite build --outDir "$env:TEMP\hc-dist" --emptyOutDir   # ver §6
```

- **Playwright:** arranca Vite en `127.0.0.1:3000`. Con `reuseExistingServer` reutiliza un servidor que ya escuche en ese puerto, así que hay que comprobar que sea el del mismo árbol. Al terminar, liberar el puerto: `Get-NetTCPConnection -LocalPort 3000 -State Listen | % { Stop-Process -Id $_.OwningProcess }`.
- **Backend:** desde `Hot_click_outlet`, `mvn -o test` (en P09 y P12 se filtró por `*Email*`, `*Otp*`, `*Cupon*` y `PedidoServiceTest`).
- **Escaneo de código muerto:** `npx --yes knip@5 --reporter json --no-progress --no-exit-code` (no instala nada en el repo).

## 6. Atención: `vite build` escribe en un directorio versionado

`vite.config.ts` tiene `outDir: '../src/main/resources/static'` y `emptyOutDir: true`. Ese directorio es el build que sirve Spring y **está versionado**. Un `npx vite build` o `pnpm build` sin más argumentos:

- borra unos 314 archivos versionados, modifica unos 15 y crea más de 340 sin seguimiento;
- incluye `sw.js` y `workbox-*.js` de la PWA, y las copias de `public/email/*.png`.

Pasó en P20 y se restauró a HEAD con aprobación.

- **Para verificar:** `npx vite build --outDir "$env:TEMP\hc-dist" --emptyOutDir`. La PWA sigue al `outDir` y el repo queda limpio.
- **Para entregar:** regenerar `static/` con `pnpm build` es tarea de SUP en la entrega (`QA_GLOBAL.md`, TODO 9; `PROGRESS.md`, riesgo de despliegue de QR). Se commitea aparte y nunca mezclado con cambios de código.

## 7. Mapa de documentos

| Documento | Uso |
| --- | --- |
| `INVENTORY.md` | Estado de las 90 pantallas: única fuente de PASS y PARTIAL |
| `PROGRESS.md` | Historia por bloque, decisiones numeradas y riesgos |
| `SHELL_GLOBAL.md` | Shell, chrome y transversales P12–P20 |
| `BACKEND_GAPS.md` | Huecos de backend con su contrato propuesto |
| `B9`, `B10`–`B19` | Investigación de decisiones; B19 es el cierre de la fase B |
| `CAT_C0.md`, `CAT_C1_C5.md`, `PROD.md`, `PROD_DECISIONES.md`, `CHK.md`, `ACC.md`, `SRV.md`, `STORE.md`, `QR.md`, `SYS.md`, `DECISIONES_SYS_CHK.md` | Detalle por módulo, con secciones P01–P10 donde aplica |
| `QA_GLOBAL.md`, `TESTS-POST-B19.md` | QA global y tests actualizados después de B19 |
| `COMPONENT_OWNERSHIP.md`, `PRODUCTCARD_STRATEGY.md`, `ROUTES_REQUESTED.md` | Ownership, estrategia de la tarjeta y rutas pedidas |

Los archivos `B*-resultado.txt`, `B8-decisiones-Figma.md`, `auditoria-cierre-B4.txt` y `post-b19-resultado.txt` son locales y no se versionan. No se tocaron.

## 8. Qué sigue (fuera de esta numeración)

1. Producto y diseño responden la §2.
2. Diseño entrega los frames que faltan: D06, D11, D15, D19, cookies de escritorio, páginas legales e informativas.
3. Backend: primero R7 (seguridad), después la §3.
4. QA independiente con datos reales de los 38 PASS, y correos en Gmail y Outlook.
5. Integrar en `master` y desplegar, solo cuando el usuario lo autorice.

## 9. QA final (P22)

2-oct-2026, hora de Costa Rica, sobre `587d1957`. Se revisaron las 90 pantallas de `INVENTORY.md` contra la evidencia y los criterios que cada una tiene registrados, con los specs y helpers de medición que ya existían. No hay acceso directo a Figma: no se agregaron medidas nuevas ni se tomaron decisiones.

### 9.1 Definiciones

- **PASS — agent verified:** la pantalla coincide con su frame, con la evidencia que registra `INVENTORY.md`, y sus specs siguen pasando.
- **PARTIAL:** implementada y medida, pero con una diferencia que el frontend no puede cerrar solo: una decisión humana, un frame que falta en Figma (o una medida que solo se puede tomar en Figma) o un dato que el backend no entrega.
- **BLOCKED:** pantalla que no se puede implementar ni verificar en absoluto por una de esas causas. Ninguna lo está: las 52 PARTIAL están implementadas y medidas, y lo bloqueado son partes. Las menciones «BLOCKED por backend» en la evidencia de `INVENTORY.md` se refieren a elementos sueltos de una pantalla PARTIAL.

**Resultado: 38 PASS / 52 PARTIAL / 0 BLOCKED.** Sin cambios respecto de P21: no hubo regresiones que bajaran un PASS, y ningún PARTIAL tiene evidencia nueva para subir.

### 9.2 Verificación

| Chequeo | Resultado |
| --- | --- |
| `tsc --noEmit` en `tsconfig.json`, `tsconfig.node.json` y `tsconfig.e2e.json` | 0 errores en las tres |
| `vitest run` | 106 archivos, 533/533 |
| Playwright, suite completa (`SHELL_MEDIR`, `ACC_MEDIDAS` y las variables de capturas apuntando a `%TEMP%`) | 88 archivos, 458 casos: 440 pasan, 5 omitidos (3 de `tests/pending` y 2 de `smoke` admin sin credenciales), 13 fallan |
| Medición del chrome (`shell-medicion`) | 66/66 a ±1 px (con la corrección de abajo) |
| Medidas de ACC (`acc-medidas`) | 8/8 |
| Barrido responsive (`responsive-barrido`, 390 y 1440) | 30/30 |
| Otros specs de medición y estado: `store-perfil`, `prod-estados`, `cart-responsive`, `checkout-responsive`, `servicios-responsive`, `qr-mesa-pago`, `estados-globales`, `accesibilidad-p19`, `barra-interna-h1`, `whatsapp-fab-b2`, `cookies-b4` | Todos pasan |
| `vite build --outDir %TEMP%\hc-p22\dist --emptyOutDir` | Sin errores; `static/` sin cambios |
| `mvn -o test` de 22 clases de test que cubren el Java tocado desde `b355fd20` (builders de correo, OTP, pedidos, carrito abandonado, seguridad, búsqueda por foto…) | 105/105, BUILD SUCCESS |

**Los 13 fallos de Playwright ya fallaban antes de P01.** Se corrieron en un `git archive` de `14e841e3` (fuera del repo, con los `node_modules` del worktree enlazados) a las 11:05: los 13 fallan en la misma línea. Son los 5 de §4 y estos 8, de paneles de administración y de Sistema, fuera de las 90 pantallas:

- `admin-dashboard.spec.ts:85` (línea 88, no hay heading «Panel Admin»);
- `admin-it-nav.spec.ts:53` (línea 62, dos enlaces «Config») y `:89` (línea 92, no hay texto «POS»);
- `mental-model.spec.ts:63` (línea 80) y `:90` (línea 103, no aparece «Hacer el tour»);
- `sistema-planes.spec.ts:85` (línea 94, ícono de la caja) y `:101` (línea 104, el código usa `plan.tienePos`);
- `sistema-primer-producto.spec.ts:114` (línea 110, no hay «Nuevo Producto»).

### 9.3 Correcciones de P22

Solo specs. No hubo cambios de código de la app.

- `tests/shell-medicion.spec.ts`: el título de la barra interna de `/carrito` (`28:1148`) se buscaba con `header p`. Desde B6 es `<h1>` cuando es el título de la pantalla, así que la medida daba «no encontrado» (65/66). Ahora usa `header :is(h1, p)` y mide igual que Figma (x 50, y 14,5, alto 21): 66/66.
- `tests/ui-sin-emoji.spec.ts:170`: leía `src/components/ui/Section.tsx`, borrado en P20 por no tener importadores, y fallaba con ENOENT (en `14e841e3` pasaba). Se quitó esa línea; el resto del caso sigue igual. Ningún otro spec lee archivos borrados (se revisaron las 143 rutas que leen los specs).
- `INVENTORY.md`: las 18 filas de ACC no tenían la columna «Frame Figma» y tenían una columna de más. Se agregó el frame con los ids de `ACC.md` y la columna sobrante se unió a la evidencia («antes: …»). No cambia ningún estado.

### 9.4 Las 52 PARTIAL y su motivo (al cierre de P22; el estado vigente está en §10.3)

Tipo: **Decisión** (respuesta humana pendiente, ver §2), **Figma** (falta el frame o una medida que solo se toma en Figma) y **Backend** (el dato o el endpoint no existe; ver §3 y `BACKEND_GAPS.md`). «QA» marca los correos que además no se probaron en Gmail ni Outlook.

| # | Frame | Pantalla | Tipo | Motivo |
| --- | --- | --- | --- | --- |
| 1 | `7:2` | Home · móvil 390 | Datos/backend | Fuera de HOME siguen pendientes las fotos reales, la insignia «Quedan N» y el badge del carrito; el estado de fin de scroll (pie legal bajo el WhatsApp) no tiene frame |
| 2 | `12:346` | Home móvil · al scrollear | Datos/backend | Header sticky y barra inferior iguales a Figma; mismas pendientes externas que `7:2` |
| 3 | `9:171` | Home · desktop 1440 | Decisión + datos | Orden de categorías abierto (Figma fija uno, la app respeta el de la API) y las pendientes externas de `7:2` |
| 4 | `8:230` | Asistente · respuesta · móvil | Backend | Falta la fila «Entendí:»: el backend no devuelve los filtros interpretados |
| 5 | `27:882` | Búsqueda por foto · móvil | Decisión | «Misma categoría» compara la categoría del catálogo con la etiqueta de Google Vision y casi nunca coincide (REQUIERE_DECISION, `BACKEND_GAPS.md`) |
| 6 | `29:922` | Perfil del negocio · móvil | Decisión D01/D20 | Se conservan la barra inferior de la tienda y el WhatsApp flotante (no están en Figma) por el pedido aislado |
| 7 | `29:1159` | Directorio de emprendimientos · móvil | Backend | `/convenios/publicos` solo trae nombre, logo, descripción y sitio: faltan ciudad, categoría, tres fotos, conteo de productos y slug; no hay endpoint de empresas públicas |
| 8 | `29:2308` | Perfil del negocio · desktop | Decisión D02 | Figma dibuja el header del marketplace; se conserva el de la tienda (pedido aislado) |
| 9 | `44:1775` | Ficha con variantes · móvil | Decisión D03 | Se conserva el stepper de cantidad que Figma omite |
| 10 | `44:1849` | Ficha producto personalizado · móvil | Backend | Falta el dato «Elaboración» (el panel queda 27 px más arriba) |
| 11 | `44:1917` | Ficha agotada · móvil | Figma | Falta remedir el frame completo en Figma (B19 lista E); la anotación «NUEVO · por programar» no se pinta (14 px) |
| 12 | `28:989` | 1 · Carrito · móvil | Figma | «Sale de <provincia>»: el dato ya llega en `bodega.provincia` (P11, DATO_EXISTE) pero la posición de la línea no está medida en `28:989` |
| 13 | `28:1083` | 2 · Checkout · Datos · móvil | Decisión D04 | Consentimiento Ley 8968 y cédula SINPE obligatorios, no dibujados en Figma |
| 14 | `29:1248` | 3 · Checkout · Entrega · móvil | Decisión B15 + backend | GAM por origen (Figma) contra GAM por cantón destino (app); los tiempos son decisión de negocio |
| 15 | `29:1344` | 4 · Checkout · Pago · móvil | Decisión D05 | Cédula SINPE y atajo internacional sin frame |
| 16 | `29:1932` | 5 · Pago exitoso · móvil | Backend + Figma | «Ver mi pedido» de invitado requiere `tokenSeguimiento`; garantía de 40 días e «Imprimir» sin frame; escritorio sin frame (REQUIRES_DESIGN_REFERENCE) |
| 17 | `29:1999` | 6 · Pago fallido · móvil | Figma | Escritorio sin frame (REQUIRES_DESIGN_REFERENCE) |
| 18 | `30:2268` | 8 · Carrito · desktop | Decisión B14 | «Pedir por WhatsApp» y tarjeta de correo restaurados sin frame de escritorio |
| 19 | `30:2385` | 9 · Checkout · desktop | Decisión D08 | Atajo internacional y consentimiento sin frame |
| 20 | `37:1780` | Vendedor · despachar paquete · móvil | Backend + decisión | Faltan «Paquete N de M» y forma de entrega (DATO_EXISTE, sin exponer en el detalle del vendedor) y «Tu pago por este paquete» (REQUIERE_DECISION sobre la comisión) |
| 21 | `55:2220` | Pago · tarjeta de regalo válida | Decisión D09 | El frame usa una barra «Pago · paso 3 de 3» y un número previo al pago que no existen |
| 22 | `55:2284` | Pago · tarjeta de regalo inválida | Decisión D10 | Mismo chrome que D09 |
| 23 | `28:1143` | Ingresar · móvil | Figma | El paso de contraseña y el escritorio no tienen frame; «Continuar con Google» solo aparece con Clerk |
| 24 | `29:1434` | Detalle de pedido · móvil | Backend | Figma da un rango de entrega y el backend una sola fecha (`fechaEntregaEstimada`) |
| 25 | `29:1535` | Mis solicitudes · móvil | Backend | Falta la pestaña «Encargos»: el backend no lista encargos del comprador; no hay precio ni vigencia |
| 26 | `29:1594` | Solicitud cotizada · móvil | Backend | Faltan precio cotizado, entrega, vigencia, «Comprar por ₡X» (flujo de compra de cotización) e historial con fechas intermedias |
| 27 | `30:1327` | Mis opiniones · móvil | Backend/decisión | Figma dice «(opcional)» pero el backend exige comentario; el testimonio general de la tienda se conserva sin frame |
| 28 | `30:1400` | Datos y seguridad · móvil | Backend | «Direcciones guardadas» (marcada «NUEVO · a confirmar») no existe en el backend |
| 29 | `44:1660` | Verificación en dos pasos · móvil | Backend + Figma | «Confiar en este dispositivo» no tiene soporte en el backend; elegir método y código por correo sin frame propio |
| 30 | `28:1486` | Te lo conseguimos · formulario | Decisión | Presupuesto con rangos (Figma: selector) es REQUIERE_DECISION; el estado enviado no tiene frame |
| 31 | `28:1531` | Solicitud de garantía · móvil | Backend | «Fotos de la falla» y el campo de motivo: la solicitud solo guarda la descripción |
| 32 | `28:1594` | Encargo · seguimiento público | Backend | La respuesta por token no trae tienda (DATO_EXISTE), fechas de cotización, tiempo de producción ni envío |
| 33 | `28:1660` | Página informativa · plantilla (Envíos) | Decisión + Figma | Tiempos y tarifas de Figma difieren del contenido (REQUIERE_DECISION); Devoluciones e Información sin frame |
| 34 | `55:2332` | Cotización pública · móvil | Backend | «Aceptar cotización» no tiene endpoint |
| 35 | `29:1650` | QR de mesa · menú | Decisión | Se conserva un paso de confirmación (nombre, teléfono, notas) que Figma no dibuja |
| 36 | `29:1781` | QR de pago en caja · elegir método | Backend | Sin número de cobro ni caja; el cajero fija el método (solo se dibuja el elegido) |
| 37 | `29:1830` | QR de pago · SINPE en curso | Figma | El formulario de datos no tiene frame |
| 38 | `29:1888` | QR de pago · pagado | Backend | El pago por QR no tiene correo ni ruta de comprobante («comprobante por correo», «Ver comprobante») |
| 39 | `29:1913` | QR de pago · vencido | Backend/producto | «Escanear otro QR»: no hay lector de QR para el comprador |
| 40 | `30:1599` | Correo · Confirmación de pedido | Backend + QA | Faltan «Enviamos a» y «Envío normal GAM» (el pedido no guarda dirección); no probado en Gmail ni Outlook |
| 41 | `30:1643` | Correo · Guía asignada | Backend/Figma + QA | «Paquete N de M» y «Otros paquetes» (DATO_EXISTE por `grupoPago`, maquetado sin medir); no probado en Gmail ni Outlook |
| 42 | `30:1669` | Correo · Seguimiento de estado | Figma + QA | Figma solo dibuja «En preparación»; no probado en Gmail ni Outlook |
| 43 | `30:1708` | Correo · Pago fallido | Decisión + QA | «Quedó guardado» de Figma contra «stock liberado» del código; no probado en Gmail ni Outlook |
| 44 | `30:1733` | Correo · Recuperación de carrito | Figma + QA | Tienda y «Quedan N» agregados en P11 sin medir contra Figma; no probado en Gmail ni Outlook |
| 45 | `30:1768` | Correo · Cupón de bienvenida | Backend/decisión + QA | Figma promete 30 días de vigencia y el cupón no vence en el backend; no probado en Gmail ni Outlook |
| 46 | `30:1793` | Correo · Código de verificación | Decisión (seguridad) + QA | El asunto de Figma lleva el código; no se aplicó por seguridad (pantalla de bloqueo); no probado en Gmail ni Outlook |
| 47 | `51:1820` | A · Carrito · notas, gift card, WhatsApp, guardar y asistente | Figma | Falta medir el frame completo (B19 lista E) |
| 48 | `51:2000` | B · Checkout · Entrega · envío internacional | Decisión D18 | Atajo internacional en escritorio sin respuesta |
| 49 | `51:2229` | E · Idioma y accesibilidad · hoja | Figma | «A−» se muestra y no reduce la fuente: el frame no define ese efecto |
| 50 | `51:2468` | G · Tienda con su color · perfil del negocio | Decisión D01/D20 | Mismas pendientes que `29:922` (colores remedidos iguales) |
| 51 | `54:2126` | Blog · listado · móvil | Backend | Chips de temas (no hay categoría) y buscador |
| 52 | `54:2219` | Blog · artículo · móvil | Backend | Categoría de las migas, «Productos de este artículo» y autor propio |

## 10. Decisiones aceptadas (`feat/figma/pendientes`)

2-oct-2026, hora de Costa Rica. Rama local sobre `54c64201` (merge de `origin/master`), sin push, PR, merge ni deploy. Un commit por grupo; los cambios de base de datos llevan migración Flyway y su bloque en `Hot_click_outlet/Actualizado.sql`; los textos nuevos tienen es, en y pt.

### 10.1 Commits

| Grupo | Commit | Qué hace |
| --- | --- | --- |
| Telegram | `fc588479` | Escapa Markdown en los valores, reintenta en texto plano ante «can't parse entities» y enmascara el token en los logs (`bot***`) |
| R6 | `72a24cce` | «Tarjeta de regalo» / «Gift card» / «Cartão-presente» en carrito y checkout |
| D19 | `b29bf73a` | A− pone la raíz en 87,5 % (`fs-sm`, 14 px) |
| R2 | `f3433900` | `formatTelefonoCR`: teléfonos de Costa Rica como `8888-1234` |
| R4 | `3f17581c` | `utils/stock.ts`: tope con el stock real; 99 solo si el stock no se conoce |
| R5 | `fb44117f` | Zona del FAB de WhatsApp: 155 px al final de las listas móviles y `scroll-padding-bottom` |
| D13 | `52325298` | Tiempos de envío desde una sola fuente, `src/config/tiemposEnvio.ts` (PROVISIONAL) |
| D12 | `526a9ffd` | Selector de presupuesto con `src/config/rangosPresupuesto.ts` (PROVISIONAL) y «Otro monto» |
| B16 | `e8516cee` | QR vencido: texto «abrí la cámara» en lugar de «Escanear otro QR» |
| B16 | `5e631f50`, V147 | El cliente elige entre los métodos que habilita la caja; «Cobro #P-<id>», caja y comprobante imprimible (`GET /api/pos/qr/pago/{token}/comprobante`, solo PAGADO) |
| B17 | `f68636fb`, V148 | `hot_click_pedido_tb.direccion_entrega`; confirmación con «Envío normal GAM. Enviamos a …»; guía con «Paquete N de M»; corrige el envío tratado como retiro en los correos |
| R3 | `4a8ae1af` | Paso en `?paso=` con guard (no se salta un paso por enlace ni al recargar); «Atrás» del navegador vuelve al paso anterior |
| R1 | `82352e08` | Texto con n-600 y red-600, placeholders con n-500 y token `--hc-primary-text` (AA); íconos, logo y fondos sin cambio |
| Docs | este commit (`docs(figma)`) | Este §10 e `INVENTORY.md` |
| Build | `db068105` | Regeneración intencional de `static/`, sin claves `VITE_*` (commit aparte) |

Hora de Costa Rica: de 16:01 a 19:31. El commit de docs va al final.

### 10.2 Estado por decisión

| Decisión | Estado | Dónde |
| --- | --- | --- |
| D01, D02, D03, D06, D07/B14, D09, D10, D11, D14, D15, D18, D20 | Se deja como está: no hubo que cambiar código | §2.1 |
| D04, D05, D08 | Ya cumplido: la cédula solo se pide en el panel SINPE (`PasoPago`: `InstruccionesSinpe`/`DatosRemitente`) y el consentimiento Ley 8968 sigue obligatorio | `PasoPago.tsx` |
| D12 | Hecho: selector de rangos (PROVISIONALES) | `config/rangosPresupuesto.ts` |
| D13 | Hecho: una sola fuente para checkout y `/envios` (PROVISIONALES) | `config/tiemposEnvio.ts` |
| D16 | Se conserva el texto actual del correo de pago fallido | `PagoFallidoEmailBuilder` |
| D17 | Se conserva: el asunto no lleva el código OTP | `OtpService` |
| D19 | Hecho: A− = 87,5 % | `fs-sm` |
| D21 | Se conserva el orden de la API | Home |
| B15 GAM | Ya cumplido: GAM por cantón destino, `esDestinoGAM(provincia, canton)` | `useCheckoutForm.ts` |
| B16 método | Hecho: elige el cliente entre los métodos que habilita la caja (V147) | `PosQrMetodos`, `PosPagoMetodo` |
| B16 número, caja, comprobante | Hecho: «Cobro #P-<id>», nombre de la caja y comprobante imprimible; no hay comprobante por correo | `PosPagoComprobante` |
| B16 «Escanear otro QR» | Hecho: texto «abrí la cámara», sin lector | `pos.pago.vencidoCamara` |
| B17 dirección y paquete N de M | Hecho (V148) | `CheckoutOrderFactory.aplicarDireccion`, `NotificacionGuiaEmailBuilder` |
| B17 cupón | No se promete vencimiento de 30 días (el copy no lo decía; un test lo asegura) | `NegocioEmailBuilder` |
| R1 | Hecho para texto (ver pendientes) | `hotclick-tokens.css`, `contrasteTokens.test.ts` |
| R2, R3, R4, R5, R6 | Hechos | §10.1 |
| R7 (bodega pública) | **No incluida** en las decisiones aceptadas; sigue abierta y es de prioridad alta | BG #6 |
| R8–R15 | Sin cambio | §2.3 |

Valores PROVISIONALES que hay que confirmar:

- **Tiempos de envío** (`tiemposEnvio.ts`): rápido 30 min – 2 h; normal GAM 2–4 días hábiles; fuera de la GAM 3–4 días hábiles.
- **Rangos de presupuesto** (`rangosPresupuesto.ts`): hasta ₡10.000; ₡10.000–25.000; ₡25.000–50.000; ₡50.000–100.000; más de ₡100.000; «Otro monto».

### 10.3 Nuevo conteo: 56 PASS / 34 PARTIAL / 0 BLOCKED

Criterio: una fila PARTIAL pasa a PASS solo si **todos** sus motivos de §9.4 eran decisiones que ya se tomaron (o se implementaron) y la parte que queda ya estaba medida. Sigue PARTIAL si queda un frame que falta, una medida que solo se toma en Figma, un dato del backend o un maquetado nuevo sin medir. «Falta QA en Gmail/Outlook» no impide el PASS, porque aplica a todos los PASS (son veredictos del agente).

- **Pasan a PASS (18):** #6 `29:922`, #8 `29:2308`, #9 `44:1775`, #13 `28:1083`, #14 `29:1248`, #15 `29:1344`, #18 `30:2268`, #19 `30:2385`, #21 `55:2220`, #22 `55:2284`, #35 `29:1650`, #39 `29:1913`, #43 `30:1708`, #45 `30:1768`, #46 `30:1793`, #48 `51:2000`, #49 `51:2229`, #50 `51:2468`. Para #14, los tiempos son los provisionales de §10.2.
- **Siguen PARTIAL, con avance:** #3 `9:171` (D21 resuelta; faltan datos), #30 `28:1486` (selector hecho; el estado enviado no tiene frame), #33 `28:1660` (tiempos de una sola fuente; Devoluciones e Información sin frame), #36 `29:1781` (método, número y caja hechos; la línea del número no está medida en Figma), #38 `29:1888` (comprobante hecho; la vista no tiene frame), #40 `30:1599` y #41 `30:1643` (dirección y «Paquete N de M» hechos; maquetado sin medir).
- **Siguen PARTIAL sin cambio:** las otras 27 filas de §9.4.

R1 cambia a propósito colores de texto de Figma (n-400/n-500 → n-600, red-500 → red-600) para cumplir AA; es la decisión aceptada y no baja ningún PASS.

### 10.4 Pendientes que quedan

- **R7:** DTO público de la bodega (seguridad, prioridad alta). No estaba en la lista aceptada.
- El correo de guía dice «2 a 5 días hábiles» fijo: el backend no lee `tiemposEnvio.ts`.
- `pos.pago.vencidoDesc` dice «15 minutos» y el backend vence el QR a los 30.
- Comprobante del QR por correo: no se hizo.
- `--hc-success` como texto sigue debajo de AA (4,39:1); no estaba en la decisión.
- Los íconos siguen con n-400/n-500 (no son texto).
- Rotar el token de Telegram.
- QA independiente con datos reales y correos en Gmail y Outlook.

### 10.5 Verificación final

2-oct-2026, 19:10–19:31 hora de Costa Rica, en Windows sobre `82352e08` (y `db068105` para `gate-spa`).

| Chequeo | Resultado |
| --- | --- |
| `tsc --noEmit` en `tsconfig.json`, `tsconfig.e2e.json` y `tsconfig.node.json` | 0 errores en los tres |
| `vitest run` | 111 archivos, 556/556 |
| `mvn -o test` (suite completa) | 190 clases, 1088 tests, 0 fallas |
| Playwright, suite completa | 461 casos: 412 pasan, 36 omitidos (medición sin sus variables, admin sin credenciales, `pending`), 13 fallan: los mismos 13 de §9.2, que ya fallaban antes de P01. Los dos casos de `acc-cuenta:343` que rompió R1 se corrigieron (25/25) |
| `shell-medicion` (`SHELL_MEDIR`) y `acc-medidas` (`ACC_MEDIDAS=1`) | 66/66 a ±1 px y 8/8 |
| ESLint sobre los 190 `.ts/.tsx` tocados | 0 problemas nuevos; los 20 que salen están en líneas que no cambió esta rama (`git blame`), los mismos de §4 |
| Gates (sin contexto de GitHub, no comentan PR), `BASE_SHA=00252fa3` | E17 i18n PASS (0 faltantes); E1 Flyway PASS (V147, V148); SCALE1 PASS con 2 avisos (`@Transactional` en `PosQrSessionService`); E11 sensibles PASS (pos, payment); E10 authz PASS; E2 tenant PASS con 1 aviso (falso positivo: `nombreCaja` busca la bodega de la sesión y filtra por empresa); E3 SPA PASS con el `static/` regenerado |
| gitleaks 8.30.1 (rango `00252fa3..HEAD` y árbol) | Sin hallazgos |
| `static/` | Regenerado con `vite build` sin archivos `.env` (solo existe `.env.example`, que Vite no lee) ni variables `VITE_*` en el entorno; sin claves de Clerk, PostHog, Sentry ni GA en los `.js`; commit aparte `db068105` |

