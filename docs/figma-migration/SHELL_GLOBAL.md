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
- La regla `header, aside, footer { … !important }` de `index.css` no se tocó: STORE la resuelve con `div role="banner"`.

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
