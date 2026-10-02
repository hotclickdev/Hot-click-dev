# SHELL · pasada global (1-oct-2026)

Rama `feat/figma/shell`, partida de `feat/figma/base` (`12accb60`, fast-forward: la rama no tenía commits propios). Archivo Figma `TmxYFj2nauu10WZnZ0t6yt`. Sin push, deploy ni merge a `master`.

## Corregido

| # | Pendiente | Qué se hizo | Referencia |
| --- | --- | --- | --- |
| 1 | `/sin-conexion` | Ruta registrada en `AppRoutes.tsx` (lazy `SinConexionPage`, pública). Ya la había pedido SYS en `ROUTES_REQUESTED.md`. No hay redirección automática hacia ella: ningún frame dibuja ese flujo, así que no se inventó. La franja `AvisoSinConexion` sigue siendo el aviso | `45:2264`, `45:2265` |
| 2 | `MainLayout` fondo blanco | Prop `fondo?: 'gris' \| 'blanco'` (por defecto `gris`, los 41 usos no cambian). Los módulos que hoy usan un contenedor blanco con alto fijo pueden migrar a `fondo="blanco"`; no se tocaron sus pantallas | Estados vacíos de ACC y 404/fallo (`n/0`) |
| 3 | Header | El buscador desktop (completo y compacto) muestra la búsqueda vigente (`?search=`) en `/productos`. "Buscar con foto" va a `/buscar/foto` (antes `/servicios`) | `30:1824` |
| 5 | Barra inferior | `/blog` y `/blog/*` marcan Inicio; `/servicios?vista=solicitudes` marca Cuenta; `/productos?cat=` marca Categorías. `/productos` sin `cat` sigue marcando Buscar | `54:2126`, `29:1535`, `43:1530` |
| 6 | Alias de color | `--color-hc-n-400`, `--color-hc-success-bg`, `--color-hc-red-50` en el `@theme` de `index.css`, apuntando a los tokens existentes (`#9AA1AE`, `#E9F7F0`, `#FEF2F1`). Hoy nadie los usa como clase; los módulos siguen con `var(--hc-…)` y pueden pasar a la clase | `hotclick-tokens.css` |
| 7 | Inputs móviles | La regla `max(16px, 1em)` (< 768 px, sin capa, ganaba a `text-[14px]`) ahora excluye `.hc-figma-ui` (raíz de `MainLayout`) y `.hc-tenant-theme` (tienda pública). Sigue activa en paneles, POS y portales. **Costo asumido:** en iOS los campos de 14/15 px del comprador hacen zoom al enfocar | 14 y 15 px en CHK, ACC, SRV |
| 8 | `ReturnVisitorBanner` | No está en ningún frame (ni Home `7:2` ni Mi cuenta `28:1196`, `30:1479`). Se oculta en `/perfil`, `/mis-pedidos` y `/wishlist`. Se conserva en Home y catálogo: quitarlo ahí es una decisión de comportamiento sin respaldo | Figma |

Además: la E2E `bottom-nav.spec.ts` describía la barra anterior (Productos/Servicios/Emprender) y fallaba en `base`; se reescribió para la barra actual y la aserción del FAB de WhatsApp sigue la decisión de SYS (visible sobre la barra, sin solaparse). Spec nuevo: `shell-global.spec.ts`.

## PARTIAL / requiere decisión

| Pendiente | Estado | Motivo |
| --- | --- | --- |
| Footer: "Preferencias de cookies" e "Idioma y accesibilidad" | **Hecho el 2-oct-2026 (B1)** | Botones en la línea legal que abren las hojas existentes; ver "Accesos del pie" al final. Los frames `7:355` y `9:559` no los dibujan: la altura móvil del pie pasa de 71 a 89 px y la de desktop no cambia (59) |
| Fila "Idioma y accesibilidad" en Mi cuenta | Sin referencia | No se inventó (decisión previa de SYS/ACC) |
| Cookies desktop a 24 px del borde | Pendiente, sin referencia | El aviso `45:2152` es móvil; no hay frame desktop. No se movió |
| Título de `BarraInterna` como `<p>` | Pendiente | Pasarlo a `<h1>` duplicaría el `h1` de las pantallas que ya lo tienen (p. ej. el carrito). Requiere revisar pantalla por pantalla |
| Header: altura, spacing, tipografía, variantes | Sin diferencias nuevas medidas | Medición repetida el 2-oct-2026 (66 medidas, ver "Línea base del chrome" al final): 4 correcciones, el resto a ±1 px |
| Selector de tema y filtro de color del buyer sheet | Sin cambios | Decisión de SYS respetada |

## Dependencias hacia otros módulos

- ACC/SRV/CHK/STORE: pueden sustituir `var(--hc-n-400)`, `var(--hc-success-bg)`, `var(--hc-red-50)` por las clases nuevas y los contenedores blancos por `fondo="blanco"`. No es obligatorio.
- La regla `header, aside, footer { … !important }` de `index.css` no se tocó: STORE la resuelve con `div role="banner"`. **Resuelta en P12** (ver al final).

## Verificación

- `tsc` con los tres tsconfig: limpio.
- Vitest: 99 archivos, 487 tests, todos pasan (incluye 3 casos nuevos del helper de la barra).
- Build: `vite build` a un directorio temporal, OK. `static/` no se tocó.
- ESLint sobre los archivos tocados: sin errores nuevos. `ReturnVisitorBanner.tsx` conserva 1 error (`setState` en efecto) y 1 aviso que ya tenía en `base`.
- E2E: `bottom-nav.spec.ts` y `shell-global.spec.ts`, 12 de 12. Regresión de módulos (ACC, blog, catálogo, CHK, SRV, STORE, tienda): 59 pasan, 8 se saltan, 6 fallan (`home-jobs` x4, `tienda-checkout:77`, `tienda-theme:115`); esos 6 fallan igual en `base`.
- No hecho: QA de las ~90 pantallas. La captura visual comparada con Figma se hizo después, ver la sección siguiente.

## Verificación visual contra Figma (1-oct-2026)

Capturas reales con Playwright (Chrome) en 390 y 1440 px, API simulada con los mocks de ACC (`tests/helpers/accFixtures.ts`), sesión sembrada y espera de 2,3 s para que termine `PageProgressBar`. Se generan con `SHELL_SHOTS=<carpeta> npx playwright test tests/shell-capturas.spec.ts` (se omite sin esa variable). Las imágenes no se versionan. Con la API vacía los listados quedan sin productos: lo que se compara es el chrome de SHELL (header, barra inferior, footer, banner), no el contenido de cada módulo.

| Ruta | Frame Figma | 390 | 1440 | Resultado |
| --- | --- | --- | --- | --- |
| `/sin-conexion` | `45:2264` | sí, también con el navegador sin red | sí | **Corregido**: la barra inferior no marcaba Inicio y Figma sí. Franja negra de 36 px y mensaje coinciden. PARTIAL: faltan "Vistos recientemente" y "Favoritos" (datos locales, de SYS) |
| `/blog` | `54:2126` | sí | sí | Barra interna y Inicio activo coinciden. Contenido de SRV (chips, buscador) fuera de SHELL |
| `/productos?cat=1` | `43:1530` | sí | sí | Barra interna, chips y Categorías activo coinciden |
| `/servicios?vista=solicitudes` | `29:1535` | sí | no aplica | Barra interna y Cuenta activo coinciden; sin ReturnVisitorBanner. Falta la pestaña "Encargos" (BLOCKED por backend, ya documentado en ACC) |
| `/perfil` | `28:1196`, `30:1479` | sí | sí | Header (77 px), menú lateral de 260 px, saludo y accesos coinciden; sin ReturnVisitorBanner |
| `/mis-pedidos` | sin id de frame en el inventario | sí | no | Barra interna y Cuenta activo; sin banner. Contenido de ACC |
| `/wishlist` | `30:1224` | sí | no | Barra interna y Cuenta activo; sin banner. El corazón no se rellena de rojo (diferencia de CAT ya documentada) |
| `/productos?search=` | `26:722`, `30:1824` | sí | sí | Desktop: el buscador muestra la búsqueda vigente, con "Foto" y "Buscar", y el header mide 111 px. Móvil: Buscar activo coincide |
| `/login` | `28:1143` | sí | no | Barra interna "Tu cuenta" y sin barra inferior coinciden. Falta "Continuar con Google" (solo existe con Clerk) |
| `/carrito` | `28:989`, `45:1692` | sí | sí | Barra interna, Pedido activo y estado vacío coinciden. No hay frame de escritorio para el vacío |
| `/descubri` | `27:939` | sí | sí | Barra interna y sin barra inferior coinciden. El contenido depende de datos |
| `/buscar/foto` | `27:882` | sí | sí | Barra interna coincide; falta la etiqueta "NUEVO · por programar" (CAT, ya documentada) |

Pasadas del 390 y 1440 px también para Home y para el comprador anónimo (header con "Ingresar").

### Diferencias encontradas

1. **Corregida**: `/sin-conexion` no marcaba Inicio en la barra inferior (Figma `45:2264` lo marca). `barraInferiorHelpers.ts` y un caso nuevo en su test.
2. **Sin corregir, sin referencia consistente**: el frame `43:1530` dibuja la barra inferior y el header con radio de 14 px, pero el componente canónico de la barra (`7:358`) y `54:2126` no lo tienen. No se aplicó.
3. **Fuera de SHELL**: el buscador móvil de resultados (`26:722`) muestra la cámara dentro del campo y la implementación muestra la X de limpiar (CAT). El Blog vacío pinta un bloque blanco de alto fijo sobre el fondo gris (SRV; candidato a `fondo="blanco"`).
4. **No es un defecto**: la barra roja del tope es `PageProgressBar` durante 2 s en cada cambio de ruta; el modal de cupón de bienvenida a los 2 s es `PromoWelcomePopup` (SYS), controlado por `hc-promo-seen`. Ninguno está en los frames.

### Pendientes que siguen abiertos

Los de la tabla "PARTIAL / requiere decisión" no cambian (los enlaces del footer se hicieron el 2-oct-2026, B1): fila de accesibilidad en Mi cuenta, cookies en desktop, `<h1>` de `BarraInterna` y remodelación del header. La medición de píxeles del header se repitió el 2-oct-2026 (ver "Línea base del chrome" al final).

### Resultados finales

- `tsc` (3 tsconfig): limpio. Vitest: 99 archivos, 488 tests. Build a directorio temporal: OK. ESLint de los archivos tocados: sin errores.
- E2E: SHELL 12 de 12; regresión (ACC, blog, catálogo, CHK, SRV, STORE, QR, tienda, Home): 88 pasan, 8 se saltan, 8 fallan, y los 8 fallan igual en `base` (`home-jobs` x4, `tienda-checkout:77`, `tienda-theme:115`, `catalogo-iconos:67`, `nav-categorias:83`).

## Línea base del chrome (2-oct-2026)

Medición de header, barra inferior, banner y pie contra la metadata de Figma (archivo `TmxYFj2nauu10WZnZ0t6yt`, origen del frame restado), tolerancia ±1 px. Se ejecuta con `SHELL_MEDIR=<archivo.json> npx playwright test tests/shell-medicion.spec.ts` (se omite sin esa variable; escribe el JSON y un resumen). Chrome, fuentes reales cargadas, API simulada (`mockApisAcc` más las categorías), sesión sembrada donde la pantalla la pide y carrito de 2 ítems donde Figma dibuja el badge.

**Resultado: 66 medidas, 66 dentro de ±1 px** después de las correcciones. Frames: `12:809`, `30:1480`, `30:2269` (carrito, 30:2268), `30:2386`, `12:551`, `28:1144`, `45:2199`, `29:1933` (pago exitoso, 29:1932), `12:582` (con sus 5 ítems), `12:483`, `12:489`, `9:550` y `9:559`. Rutas: Home, `/productos`, `/perfil`, `/carrito`, `/checkout`, 404 y `/pago/exito`, a 390 y 1440 según tengan frame.

| # | Medida | App antes | Figma | Real o del script | Acción |
| --- | --- | --- | --- | --- | --- |
| 1 | Header del carrito desktop | 79 (fila en y16) | 83 (`30:2269`, fila en y18) | **Real** | Variante `carrito` de `MainLayout`/`HeaderEscritorioCompacto` (`py-[18px]`). El cuerpo baja 4 px: "Tu pedido" y115 -> 119 y resumen y173 -> 177, iguales a Figma |
| 2 | Icono del carrito en el header del carrito | negro | rojo (`30:2269`) | **Real** (pendiente anotado en `COMPONENT_OWNERSHIP.md`) | `text-hc-red-500` solo en esa variante |
| 3 | Corazón del header móvil | icono en y14 | y16 (`12:557`), alineado con el carrito | **Real**: el enlace medía 26 px de alto por la caja de línea | `className="flex"` en el enlace |
| 4 | Corazón del header desktop completo | y26 | y28 (`12:832`) | **Real**, misma causa | `className="flex"` en el enlace |
| 5 | Chips del Home móvil (x 0), acciones (alto 26), avatar, `/pago/exito` sin estado de pago | | | Del script: selector que medía el contenedor con `-mx-4` o el enlace en vez del icono; estado de pago sin simular | Selectores y simulación corregidos |
| 6 | `/checkout` móvil | sin barra | barra interna | Supuesto mío equivocado: la pantalla usa `variante="propia"` y CHK dibuja su barra | Retirado de la medición (es de CHK) |
| 7 | Buscador del header compacto en `/perfil` (848,5 contra 875) | | | **Datos**: el badge del carrito ensancha las acciones y Figma `30:1480` no lo dibuja | Sin carrito mide 875. Sin cambio |

Medidas que ya coincidían sin tocar nada: header global móvil 160 (marca 127 × 30, buscador 358 × 48, chips 33), barra inferior 67 con sus 5 ítems, banner + pie móvil 138 (67 + 71), header completo desktop 111 (marca, buscador de 795 × 46, fila de categorías de 34), banner + pie desktop 143 (84 + 59), header compacto de Mi cuenta 79 con buscador de 875 y avatar de 32, header mínimo 71, barra interna 51 (flecha 22 en x16/y14, título en x50), barra de marca de la 404 53 y la del pago exitoso 55 (isotipo 26, wordmark 80 × 21).

Notas:

- La cifra de 77 px de `/perfil` en la tabla de capturas de arriba no se reproduce: el header mide 79, igual que `30:1480`.
- Los íconos del header del carrito son de 21 px y con 22 de separación en `30:2269`; la app usa 22 y 20 como en `30:1480`. Diferencia de 1 px del dibujo de Figma, no se cambió.
- El buscador del carrito mide 884 en Figma porque no dibuja el badge del carrito; con ítems la app lo muestra (función). Depende de datos.
- 404 y `/pago/exito` en desktop no tienen frame propio: solo se verificó que no haya desbordes.
- Prueba permanente de las correcciones 1 y 2: `tests/shell-global.spec.ts` (header de 83 px en el carrito y de 79 en Mi cuenta, carrito en rojo).
- `COMPONENT_OWNERSHIP.md` aún lista el carrito rojo como pendiente de SHELL; queda hecho (no se editó ese documento en esta pasada).

## Accesos del pie (B1, 2-oct-2026)

`FooterComprador` suma "Preferencias de cookies" e "Idioma y accesibilidad" como botones al final de la línea legal (`abrirPreferenciasCookies()` y `abrirAccesibilidad()`; las hojas son de SYS). Detalle de la hoja, el foco y las pruebas en `SYS.md` ("Pasada B1").

| Medida | Figma | App antes | App ahora |
| --- | --- | --- | --- |
| Banner + pie desktop (`9:550` + `9:559`) | 143 (84 + 59) | 143 | 143 (la línea legal mide 724 px de 1200; © en x1159, 161 de ancho) |
| Pie legal móvil (`12:489`) | 71 | 71 | 89 (segunda línea de 18 px con los dos accesos) |
| Banner + pie móvil (`12:483` + `12:489`) | 138 | 138 | 156 |
| Barra inferior (`12:582`), WhatsApp (`52:2418`) | 67; 56 × 56 en (318, 705) | igual | sin cambio |

- La diferencia móvil de 18 px no tiene frame contra el cual corregirla (Figma no dibuja los accesos); queda registrada como consecuencia de B1. La medición `tests/shell-medicion.spec.ts` espera 156 y 89 con ese comentario.
- En móvil el pie solo se ve en pantallas `raiz`; en `interna`, `marca` y `propia` es solo de escritorio. Allí el acceso a la hoja de accesibilidad depende de la fila de Mi cuenta (ACC), que sigue sin frame.
- En la captura móvil al final de la página, el botón de WhatsApp quedaba sobre "Términos". B2 (2-oct-2026) no movió el botón: en las pantallas `raiz` el spacer móvil pasa de 72 a 155 px para que el texto legal quede 16 px arriba. En internas sin barra el `bottom` es 16 px, no 83. Detalle en `SYS.md` ("Pasada B2").
- Sin desbordes horizontales a 390 ni a 1440.

## P12 — infraestructura del shell (2-oct-2026)

| Pendiente | Qué se hizo | Comprobación |
| --- | --- | --- |
| Regla `header, aside, footer` con `!important` | Fuera de `.hc-figma-ui` y `.hc-tenant-theme` sigue igual (paneles, POS, portales, `/registro`). Dentro, el mismo valor (superficie, borde y texto del tema) pasa a `@layer base`: una utilidad del componente gana. | Estilos calculados de todos los `header`/`aside`/`footer` en 18 rutas a 390 y 1440, antes y después: cambian solo el encabezado del paquete del carrito de escritorio (blanco -> n/50, la clase que ya tenía por `38:1359`) y el texto del pie de la tienda (`--t-muted`). `PasoEntrega` (n/50) y los avisos de `/emprende` (borde del tema o primario, por estilo en línea) también quedan con su propio valor; no se renderizaron en la medición. Costo: en alto contraste, un `header` de la superficie Figma con clase de borde propia ya no toma el borde de accesibilidad (igual que el resto de esa superficie). |
| Regla de 16 px en inputs móviles fuera de `MainLayout` | `QrPagina` (mesa y pago) lleva `hc-figma-ui`, como `RecuperarContrasenaPage` en P08. | Buscador de `29:1650` a 14 px a 390 (antes 16). Mis opiniones mide 13 px (la nota de 16 px estaba vieja). `TiendaNoDisponible` y `/registro` siguen fuera. |
| WhatsApp flotante | Pago por QR: ya oculto (`whatsappOculto` cubre `/checkout` y `/pos`), sin cambio de código. `/emprendimientos` móvil: la nota F (`52:2422`) lo hace global y ningún documento pide quitarlo ahí: **REQUIERE_DECISION**, no se tocó. | `qr-mesa-pago.spec.ts` (P12, 390). |
| `LoginHeader` | Borrado: ningún import. `RegisterHeader` sigue en uso. | `tsc` limpio. |
| URL fija en `PagoFallidoEmailBuilder` | `EmailLayoutHelper.urlSitio(ruta)` arma el enlace sobre `app.url` (sin barra final, cae a `https://hotclick.lat`); `urlSeguimiento` lo reutiliza. | `PagoFallidoEmailBuilderTest` (caso nuevo con `app.url` de prueba). |
| `set-state-in-effect` | `RecuperarCarritoPage`: `loading`/`error` arrancan según haya token. `usePosPagoQr`: la vista sin token arranca en error, la carga usa la promesa (setState en los callbacks) y la elección de vista pasa a `vistaDesdeInfo` (se quitó la rama `PAGADO` inalcanzable: `vistaDesdeQuery` ya la cubre). | ESLint limpio en ambos; `qr-mesa-pago`, `pos-pago-express` y `cart-responsive` pasan. |
| `stock: 99` | **No se cambió.** `RecuperarCarritoPage` agrega con `stock: 99` aunque desde P11 el backend manda el stock real; también lo usan los asistentes (`useCartAssistant`, `useProductsAssistant`, `aiChatHelpers`, `useAiChat`) y el tope por defecto de `cartStore` y `MiniCartItems`. Usar el stock real cambiaría cuánto se puede agregar (y qué pasa con stock 0): decisión de producto. | — |

Verificación: `tsc` (app y e2e) limpio; ESLint de los archivos tocados limpio; Vitest 34 de 34 (`features`, `carrito`, `flotantes`); `mvn -o test` de los 7 tests de correo (26 casos) pasan; Playwright 74 de 74 (`qr-mesa-pago`, `cart-responsive`, `shell-global`, `store-perfil`, `bottom-nav`, `pos-pago-express`, `tienda-theme`, `checkout-responsive`, `acc-cuenta`), con un caso nuevo a 390 (QR) y uno a 1440 (carrito).

## P13 — componentes compartidos (2-oct-2026)

**Alias nuevos** (`@theme` de `index.css`, solo `var()` de tokens existentes): `--color-hc-surface-3`, `--color-hc-text-secondary`, `--color-hc-danger-bg`, `--color-hc-glass-bg`, `--color-hc-focus-ring` y `--shadow-hc-1`. `surface-3` y `glass-bg` quedan disponibles: hoy nadie los usa como clase.

**Migrado** (sin rediseño; mismo color):
- 83 clases `*-[var(--hc-*)]` en 31 archivos del comprador pasan al alias (`bg-hc-danger-bg`, `text-hc-text-secondary`, `outline-hc-focus-ring`, `shadow-hc-1`, `text-hc-n-900`...). Incluye `CodigoDescuento`, `CheckoutSinpePending`, `CodigosNotasCarrito`, `HojaAgregadoAlPedido`, `EstadoVacio`, `features/pos-pago/*`, `POSPagoPage`, `selfCheckout/*`, `pago/*`, servicios, Cuenta, ayuda, información y las páginas de la tienda.
- 30 estilos en línea simples (`color`, `background`, `background` + borde de 1 px, borde del spinner) en 10 archivos: `CheckoutPaidGiftCard`, `CheckoutEmpty`, `CheckoutLoading`, `CheckoutPayError`, `CheckoutTilopayCard`, `ExpressCheckout`, `SmartField` (ayuda), `TilopayRespuestaPage`, `PagoLoading` y `TilopayCardForm` (textos y marco). Solo donde el elemento no tenía otra clase del mismo tipo.

**Comprobación:** color, fondo, bordes, contorno, sombra y `accent-color` calculados de cada elemento en 19 rutas (carrito, checkout, pago, QR de mesa y de pago, servicios, ayuda, información, cotización, encargo, tienda, blog, favoritos, recuperar carrito, registro de empresa, emprendé) a 390 y 1440: 0 diferencias antes y después; dos líneas base seguidas también dan 0. Spinner de `/pago/tilopay/respuesta`: borde superior transparente y el resto `--hc-accent`, igual que antes. `cart-responsive.spec.ts` suma el aviso de cupón inválido a 390 y 1440 (`bg-hc-danger-bg` = `--hc-danger-bg`) y la igualdad clase/variable de los alias usados.

**No migrado (documentado):**

| Qué | Por qué |
| --- | --- |
| `components/ui` (`Badge`, `Spinner`, `ThemeToggle`, `UpgradePrompt`, `PlanLoadError`), paneles, POS y `layouts` | Tailwind declara los alias en `:root` (`--color-hc-x: var(--hc-x)`), así que resuelven el valor raíz. `.hc-sistema-theme`, `.hc-superadmin-theme` y `.hc-seller-theme` redefinen tokens en un contenedor: ahí `bg-hc-surface` y `bg-[var(--hc-surface)]` no dan lo mismo. Los alias que ya se usan dentro de esos temas tienen el mismo efecto. Pasar a `@theme inline` lo corregiría, pero cambia colores de los paneles: **REQUIERE_DECISION**. |
| `HowToBuySection`: `blue-400`, `blue-500`; `primary-hover`, `link`, `shadow-2` | No tienen alias y no estaban en la lista de P13. |
| `CheckoutPaidGiftCard`: círculo `rgba(34,197,94,0.12)` / `0.25`; `TilopayCardForm`: aviso `#f59e0b` / `#fbbf24`; `TiendaWhatsAppFab`: `#25D366` | Colores sin token: no se inventa uno. |
| `TilopayCardForm` (campos con borde de 1,5 px), `SmartField` (colores calculados), `PagoLoading` (`color-mix` y degradado), `TiendaProductoCard` (color según `agregado`) | No son un alias directo; la regla global `!important` de `input`/`select` ya decide el color de los campos. |
| Unificar `TiendaProductoCard` y `ProductCard` | Misma geometría (`5:23`), pero otro comportamiento: colores del vendedor (`--t-*`), enlace a `/tienda/:slug/producto/:id`, suma al pedido aislado de la tienda, estado `agregado` y productos a cotizar que abren la ficha. Unificarlas no deja el comportamiento igual. |

Verificación: `tsc` (app y e2e) limpio; ESLint de los 42 archivos tocados sin errores nuevos (`TiendaProductoPage` conserva su `set-state-in-effect` de `base`); Vitest 323 de 323 (se actualizó la clase esperada en `codigoDescuento.test.ts`); Playwright 86 de 87 en `cart-responsive`, `qr-mesa-pago`, `pos-pago-express`, `checkout-responsive`, `checkout-cta`, `store-perfil`, `tienda-checkout`, `acc-cuenta`, `srv-servicios` y `descubri-pago`. El que falla es `tienda-checkout:77`, que ya fallaba en `base` (ver la verificación de SHELL arriba).

## P14 — estados globales y casos límite (2-oct-2026)

**Ya en PASS por su frame (no se tocan):** sin resultados `27:804`, pedido vacío `45:1692`, favoritos, pedidos y solicitudes vacíos, 404 `45:2198`, sin conexión `45:2264`, fallo del servidor `45:2322` y recuperar carrito `29:2036`.

**Barrido con la API simulada** (46 rutas del comprador a 390 y 1440): con 500 y con la red cortada no hay errores de página ni desborde horizontal y cada ruta muestra un estado (lista vacía, «Tu pedido está vacío», «No se pudo abrir esta tienda» con Reintentar, etc.). Con 404, los detalles muestran su estado propio: producto, tienda, cotización, encargo, seguimiento, recuperar carrito, blog, QR de mesa y QR de pago.

**Corregido (texto largo sin espacios se recortaba sin salto ni puntos suspensivos):** se añade `wrap-anywhere` (`overflow-wrap: anywhere`; solo parte la palabra si no cabe, el texto normal no cambia):
- Ficha (`ProductoCabecera`): nombre de la tienda (con `min-w-0`), título y descripción.
- Pedido: nombre del producto en móvil (`FilaProductoCarrito`), título del paquete (`PaqueteCarritoTarjeta`) y «Sumá otro producto» (`SumaMismaTienda`, que además quedaba debajo del botón Agregar).
- Filtros del catálogo (`Casilla`).
- Tienda: nombre, lema y datos del encabezado (`TiendaEncabezadoNegocio`), «Sobre nosotros» (`TiendaHomePage`), filas de «Cómo comprarle» (`TiendaComoComprarle`) y marca, nombre y descripción de `TiendaProductoPage`.
- Aviso flotante (`components/ui/Toast`): `left-4` + `max-w-sm` medía 400 px en una pantalla de 390; ahora `max-w-[min(24rem,calc(100vw-2rem))]` y el texto con `min-w-0 wrap-anywhere`. Mismo aspecto en escritorio.

**Documentado sin tocar:**

| Qué | Por qué |
| --- | --- |
| Chips con `whitespace-nowrap` (filtros del catálogo, categorías de la tienda) | Están en un carril con desplazamiento horizontal; un nombre muy largo alarga el chip, no la página. |
| Tarjetas del catálogo y nombre del producto en el pedido de escritorio | `line-clamp-2` y `truncate` del diseño: recortan sin desbordar. |
| Respuesta 200 con `data: null` | Los interceptores de `api.ts` y `tiendaService` dejan el sobre `{success, data}` y la ficha o la cotización se pintan vacías (₡0); `TiendaProductoPage` quedaría en blanco si el producto llega vacío. El backend responde 404 en esos casos (`NoSuchElementException`), así que no se reproduce; cambiar el interceptor afecta a todos los servicios: **REQUIERE_DECISION**. |
| Estados sin frame (carga, esqueletos, errores de secciones) | Siguen con los componentes que ya existen (`Spinner`, esqueletos de cada página, `EstadoVacio`, `PantallaFalloServidor`, `PantallaSinConexion`, `NotFoundPage`); no se dibuja nada nuevo. |

Verificación: `tsc` (app y e2e) limpio; ESLint de los 11 archivos sin errores nuevos (siguen los de `base`: `set-state-in-effect` en `TiendaProductoPage` y `TiendaHomePage`, `only-export-components` en `Toast`); Vitest 70 de 70 en `components/ui`, carrito, tienda, producto y catálogo. Nuevo `estados-globales.spec.ts` (10 casos a 390 y 1440: ficha, pedido y tienda con texto largo, aviso flotante dentro de la pantalla, 500 en ficha y cotización); sin la corrección fallan 6. Playwright 61 de 63 en `estados-globales`, `cart-responsive`, `store-perfil`, `store-capturas`, `prod-estados`, `catalogo-cta`, `catalogo-iconos`, `tienda-no-disponible`, `tienda-pdp-comprar`, `tienda-theme`, `tienda-vacia`, `tienda-checkout` y `home-sin-conexion` (1 omitido). Fallan `tienda-checkout:77` y `catalogo-iconos:67` («Ver más»), que también fallan en `base`.

## P15 — responsive 390 / 1440 (2-oct-2026)

**Barrido** (fuera del repo): 44 rutas públicas y 6 con sesión (`mockApisAcc`) a 390 y 1440, con productos, tienda, categorías, pedido y favoritos simulados. Mide desborde horizontal, elementos fuera de la pantalla, texto recortado (ancho y alto) sin puntos suspensivos, controles tapados por elementos fijos al final de la página, barra inferior en 1440, objetivos táctiles (WCAG 2.5.8: 24 px o la excepción de espaciado) y tamaño de los campos.

**Resultado:** 0 desbordes, 0 elementos fuera, 0 recortes en las 100 vistas; ninguna pantalla muestra la barra inferior en 1440. Las pantallas con frame de escritorio (Home `9:171`, catálogo `30:1824`, ficha `29:2072`, tienda `29:2308`, pedido `30:2268`, checkout `30:2385`, Mi cuenta `30:1480`) siguen dentro de sus medidas: 129 casos verdes en los specs de medición (`shell-global`, `acc-medidas`, `cart-responsive`, `checkout-responsive`, `store-perfil`, `catalogo-cta`, `servicios-responsive`, `qr-mesa-pago` y otros diez).

**Corregido:** la regla móvil de 16 px de `index.css` (evita el zoom de iOS fuera de `.hc-figma-ui` / `.hc-tenant-theme`) no cubría `password`, `url` ni los `input` sin `type`, y `PhoneField` fijaba `fontSize: 14` en línea. En `/registro` y `/registro-empresa` (sin frame, fuera de `.hc-figma-ui`) la contraseña y el teléfono medían 14 px frente a 16 del resto del formulario, e iOS hacía zoom al enfocarlos. Ahora la regla incluye esos tipos y `PhoneField` pasa el tamaño por `--react-international-phone-font-size`: 16 px en móvil, 14 en escritorio, mismo alto (40 y 44). Alcanza también a paneles y POS en móvil, que es lo que la regla pretendía.

**Documentado sin tocar:**

| Qué | Por qué |
| --- | --- |
| Pie móvil: enlaces de 14 a 18 px de alto con filas a 16 px | No cumplen 2.5.8 (ni tamaño ni espaciado). El pie está medido contra `12:489` y darle 24 px lo alarga: **REQUIERE_DECISION**. |
| Flecha «Volver» 22 × 22 de `BarraInterna`, corazón del header 22 × 22, «Ver todo», «Ver detalle», «Vaciar pedido», preguntas de `/envios` | Miden lo de Figma y cumplen 2.5.8 por la excepción de espaciado (ningún otro control a menos de 12 px del centro). |
| Campos de 16 a 18 px de alto | Son el texto dentro de una caja de 40 a 48 px que es su `label`. |
| WhatsApp tapa el «Agregar» de una tarjeta en `/productos` a 390 | Decisión de SYS pendiente (`QA_GLOBAL.md` #4). |
| 1440 de pantallas sin frame de escritorio (cotización, QR, encargo, seguimiento, servicios, informativas, registro) | Siguen con su columna centrada; no se dibuja un escritorio nuevo. |
| Campos de 14 y 15 px del comprador | Figma los pide así; el zoom de iOS es el costo que ya asumió SHELL. |

Verificación: `tsc` (app y e2e) limpio; ESLint de `PhoneField` y del spec sin errores; Vitest de `components/ui` 21 de 21. Nuevo `responsive-barrido.spec.ts` (30 casos: 14 rutas a 390 y 1440 sin desborde, fuera de pantalla, recortes ni errores de página, y el registro con un solo tamaño de campo); sin la corrección falla el de 390. Playwright 100 de 103 en `responsive-barrido`, `registro-vender`, `emprende`, `acc-cuenta`, `qr-mesa-pago`, `smoke`, `emprendedor-wizard`, `a11y-fuente` y `checkout-responsive` (2 omitidos). Fallan `emprende:51`, `smoke:131` y `smoke:237`, que también fallan en `base`.

## P16 — formato de datos (2-oct-2026)

**Regla:** los montos se escriben `₡6.200`: símbolo pegado, punto de miles, sin espacio, NBSP (U+00A0) ni espacio estrecho (U+202F). `Intl.NumberFormat('es-CR')` y `NumberFormat.getInstance(es-CR)` de Java agrupan con NBSP (`₡6 200`) y `String.format("%,d")` depende del locale del servidor; ninguno cumple.

**Un formateador por lado:** frontend `formatPrice` / `formatMiles` (`utils/format.ts`), ahora con `useGrouping: 'always'` para que un motor con agrupación mínima de 2 dígitos no deje `6200`. Backend: nuevo `utils/FormatoColones` (`miles`, `colones`) con el patrón que ya usaba `EmailLayoutHelper.CRC` (`#,##0` con punto); `EmailLayoutHelper.monto` delega en él y se quita la constante estática `CRC` (`DecimalFormat` no es seguro entre hilos). No hay formatos nuevos.

**Corregido (llegaba NBSP, coma o el número sin separar):**

| Dónde | Ahora |
| --- | --- |
| WhatsApp del carrito (`cartStore.toWhatsAppMessage`, `toLocaleString` daba `₡12 400`) | `formatPrice` |
| Precio tachado de `AIProductCard`, `fmt` de los asistentes de carrito y de productos | `formatPrice` / `formatMiles` |
| Descripción SEO de respaldo de la ficha (`productoHelpers`) | `formatPrice` |
| Encargos: rango de presupuesto, WhatsApp de cotización, confirmación del precio y KPI «Ticket prom.» | `formatPrice` |
| `formatoColon` (planes del wizard, prototipo y paneles), `formatMonto` en colones (cotizaciones) y `formatColones` (POS pago) | Delegan en `formatPrice` / `formatMiles` |
| Backend: WhatsApp de pedido (`WhatsAppHelpers`, `WhatsAppService`), meta SEO de producto (`SpaSeoSupport`), precios del chat (`ChatPrecioPersonalizado`, catálogo del prompt RAG, presupuesto de la memoria y del chat público), publicación de Facebook, Telegram al cliente, nota del evento APROBADO y errores de mínimo/máximo de encargos | `FormatoColones` |
| Correos (`ConfirmacionPedido`, `RecuperacionCarrito`, `PedidoAdmin`, `EncargoEmailSender`) | Ya daban `₡15.900`; ahora salen de `FormatoColones` |

**Auditado sin cambio:** fechas (`formatDate` y las fechas cortas de pedido, encargo, seguimiento y servicios arman el mes con tres letras), porcentajes (`-20%`, `IVA 13%`, `10% desc.`: entero pegado al `%`), cantidades (`x2`, `3 paquetes × ₡4.000`), números de pedido (se muestran como llegan; `#Q-58` solo en autoservicio, como Figma). Los correos no formatean fechas ni teléfonos.

**Documentado sin tocar:**

| Qué | Por qué |
| --- | --- |
| Teléfono: el campo del checkout muestra `8888 1234` y el número SINPE `7019-6686` | Los dos vienen de Figma (checkout y QR de pago); unificarlos **REQUIERE_DECISION**. `formatPhone` (`8888-1234`) de `checkoutHelpers` no tiene usos. |
| Helpers propios de paneles y POS (`formatMontoPos`, `fmt` de `components/admin` y `components/pos`, recibo de WhatsApp del POS, `formatoTarifa` de recolección) y avisos internos de Telegram para admin y vendedor (`%,d`) | Fuera de la superficie del comprador; `formatMontoPos` además llena un campo editable y cambiar el separador puede romper su lectura. |
| Hora de `formatDateTime` (ICU puede meter espacios duros en «a. m.») | Se ve como un espacio y no hay spec registrada para la hora. |

Verificación: `tsc` (app y e2e) limpio; ESLint sin errores nuevos (el `only-export-components` de `cartAssistantHelpers` ya estaba); Vitest 507 de 507 (`format.test.ts` suma agrupación de 4 dígitos, sin NBSP, WhatsApp del carrito y textos de encargos; `posPagoFormat` exige `60.720`); JUnit 62 de 62 en 17 clases (nuevo `FormatoColonesTest`; `ChatPrecioPersonalizadoTest` exige `Desde ₡15.000 hasta ₡40.000`; los tests de correo comparan `₡15.900` y `₡95.900` literales). Playwright 41 de 41 en `formato-datos` (nuevo, 2 casos: carrito sin montos con espacio y mensaje de WhatsApp), `emprendedor-wizard` (el plan ahora espera `₡9.900/mes`; antes `₡9 900/mes`), `cart-cta`, `qr-mesa-pago` y `srv-servicios`. Sin la corrección de `cartStore` falla el caso de WhatsApp.
