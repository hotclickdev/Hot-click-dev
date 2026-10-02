# Cierre de la migración Figma (P21, 2-oct-2026)

Punto de entrada único al estado final de `feat/figma/base`. Junta lo que estaba repartido en `INVENTORY.md`, `PROGRESS.md`, `SHELL_GLOBAL.md`, `BACKEND_GAPS.md`, `B19-CIERRE.md` y los documentos de cada módulo. **No cambia ningún estado:** cada fila sigue con la evidencia que tiene en `INVENTORY.md`.

| | |
| --- | --- |
| Rama | `feat/figma/base` (local; sin push, merge, PR ni deploy) |
| HEAD al documentar | `8e07c61c` |
| `master` | `b355fd20` (sin tocar) |
| Pantallas | 90: **38 PASS — agent verified / 52 PARTIAL**; 0 OLD_DESIGN, MISSING, BLOCKED ni UNKNOWN |
| Frontend implementable sin decisión externa | Ninguno (B19, confirmado en P01–P20) |

Los PASS son veredictos del agente, medidos con API simulada. Falta un QA independiente con datos reales y correos probados en Gmail y Outlook antes de darlos por definitivos (`QA_GLOBAL.md`, B19 §10).

## 1. Commits P01–P20

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

El detalle de cada bloque está en su fila de `PROGRESS.md` y en su sección de `SHELL_GLOBAL.md` (P12–P20) o del documento del módulo (P01–P10).

## 2. Decisiones humanas pendientes (lista consolidada)

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
