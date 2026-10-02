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
| Footer: "Preferencias de cookies" e "Idioma y accesibilidad" | **REQUIRES_DECISION** | Los footers `7:355` y `9:559` no dibujan los enlaces; solo la nota E dice "desde el pie". Añadirlos cambia la línea legal medida (71 y 59 px). Las APIs `abrirPreferenciasCookies()` y `abrirAccesibilidad()` existen y **nadie las llama**: hoy, tras aceptar o rechazar, las preferencias de cookies no se pueden reabrir desde la interfaz. Conviene que el usuario defina el diseño |
| Fila "Idioma y accesibilidad" en Mi cuenta | Sin referencia | No se inventó (decisión previa de SYS/ACC) |
| Cookies desktop a 24 px del borde | Pendiente, sin referencia | El aviso `45:2152` es móvil; no hay frame desktop. No se movió |
| Título de `BarraInterna` como `<p>` | Pendiente | Pasarlo a `<h1>` duplicaría el `h1` de las pantallas que ya lo tienen (p. ej. el carrito). Requiere revisar pantalla por pantalla |
| Header: altura, spacing, tipografía, variantes | Sin diferencias nuevas medidas | No se rehizo una medición de píxeles; las medidas de la pasada anterior (111, 79, 71, 160, 51, 53, 67) siguen vigentes |
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

Los de la tabla "PARTIAL / requiere decisión" no cambian: enlaces del footer, fila de accesibilidad en Mi cuenta, cookies en desktop, `<h1>` de `BarraInterna` y remodelación del header. La medición de píxeles del header no se repitió: en esta pasada solo se compararon las capturas.

### Resultados finales

- `tsc` (3 tsconfig): limpio. Vitest: 99 archivos, 488 tests. Build a directorio temporal: OK. ESLint de los archivos tocados: sin errores.
- E2E: SHELL 12 de 12; regresión (ACC, blog, catálogo, CHK, SRV, STORE, QR, tienda, Home): 88 pasan, 8 se saltan, 8 fallan, y los 8 fallan igual en `base` (`home-jobs` x4, `tienda-checkout:77`, `tienda-theme:115`, `catalogo-iconos:67`, `nav-categorias:83`).
