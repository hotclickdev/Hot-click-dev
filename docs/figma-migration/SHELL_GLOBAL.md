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
- No hecho: captura visual comparada con Figma de los cambios (los cambios son lógica de rutas, CSS global y estado activo; los de header y barra se comprobaron por aserciones, no por píxeles) ni QA de las ~90 pantallas.
