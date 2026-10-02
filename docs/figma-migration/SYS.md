# SYS: estados y sistemas (404, fallo, sin conexión, instalar, cookies, popups, accesibilidad, WhatsApp)

Rama `feat/figma/sys` (desde `feat/figma/base` `e7717b64`). Archivo Figma `TmxYFj2nauu10WZnZ0t6yt`. Medidas tomadas con Playwright en 390 (y 1440 donde se indica), fuentes reales Sora, Public Sans e IBM Plex Mono con `document.fonts.ready`, API simulada con `context.route('**/api/**')`, offline con `setOffline`, 500 con la API simulada, cookies y popups con localStorage/sessionStorage. Las posiciones son de Figma menos el origen del frame.

## Veredictos

| Pantalla | Nodo | Veredicto | Resumen |
| --- | --- | --- | --- |
| Página no encontrada · móvil | `45:2198` | PASS (móvil) | Barra de marca (`variante="marca"`), mensaje, buscador y accesos planos sin flechas, con los SVG originales. Sin frame desktop |
| Fallo del servidor · móvil | `45:2322` | PASS (móvil) | Ya existía (PR #93). Corregidos alturas y tracking del Sora; ícono de alerta ahora es el SVG original |
| Instalar la app · tarjeta | `55:2658` | PASS (móvil) | Ya existía. Corregidos alturas de título, subtítulo, beneficios y botones; la nota "NUEVO · por programar" y el texto del hook no llegan a la UI. Reglas de la nota (2.ª visita, nunca la primera página, 30 días) intactas |
| Sin conexión · móvil | `45:2264` | PARTIAL | Geometría igual a Figma. Home la muestra ante un error de red sin datos (A1, 2-oct-2026) y la ruta `/sin-conexion` está registrada. Medida con vistos y favoritos sembrados (imágenes sintéticas); fotos reales no verificadas. El isotipo flotante se retiró (B1). El WhatsApp sigue a 16 px sobre la barra (B2) y no está en el frame: por eso sigue PARTIAL |
| Aviso de cookies · móvil | `45:1946` | PASS (móvil) | B4 (2-oct-2026): tarjeta medida a 390 en x 12, y 560, 366 × 205 (0 px). El componente no se movió. Desktop sin frame (`left` 24, `bottom` 24) y no bloquea este PASS |
| Preferencias de cookies · hoja | `45:2166` | PASS (móvil) | Hoja desde y 90, secciones en 179, 266 y 361, pie en 644; todas iguales a Figma |
| C · Cupón de bienvenida | `51:2163` | PASS (móvil) | Hoja igual a Figma con el campo de correo de 42 px (decisión del usuario: el frame de 26 px es un frame comprimido, no la referencia final). El paso "cupón enviado" no existe en Figma y se resolvió con el mismo sistema |
| D · ¿Aún pensando? | `51:2196` | PASS (móvil) | Hoja en y 525, alto 319, igual a Figma. La variante de favoritos no existe en Figma |
| E · Idioma y accesibilidad | `51:2229` | PARTIAL (móvil medido) | Hoja y 490, alto 354 (igual a Figma); idioma, tamaño de fuente, alto contraste, reducir movimiento y Listo en las posiciones de Figma. Sin tema ni filtro de color (decisión del usuario). B3 (2-oct-2026): al abrir, el chip marcado es A y la raíz sigue en 16 px; A+ aplica `fs-lg` (18 px). A− se muestra y no reduce la fuente (el frame no define ese efecto): sigue PARTIAL |
| F · Botón flotante de WhatsApp | `51:2262` | PASS (móvil) | 56 × 56 en x 318, y 705, igual a Figma. **Desktop: provisional sin frame** (abajo a la derecha, margen de 16 px, decisión del usuario) |

## Medidas Figma contra app (antes y ahora)

| Elemento | Figma | Antes | Ahora |
| --- | --- | --- | --- |
| 404: barra | 53 alto, logo 28 | header global + buscador + chips + footer + banner | 28 / 53 |
| 404: "404" mono 14 | y 89, 26 de ancho | y 208 | y 89, 25,2 |
| 404: título | Sora 22, y 117, x 75,5, 239 de ancho, 28 alto | 24 px, 250 de ancho (tracking -0,02em) | 22 px, x 75,5, 238,9, 28 |
| 404: buscador | y 219, 350 × 44 | y 369, 358 × 48 | y 219, 350 × 44 |
| 404: filas de accesos | 44/45, ícono 18 en x 35, texto en x 65 | 49, ícono 20 hecho a mano, flecha | 44/45, x 35 / 65, SVG original |
| Fallo: barra | 51; título Sora 17 en y 14,5 (21) | 58; 25,5 de alto | 51; y 14,5; 21 |
| Fallo: h1 | y 167, 311 de ancho, 25 alto | y 174, 298, 30 | y 167, 310,2, 25 |
| Fallo: botones | Reintentar 46, WhatsApp 48 | 50,5 y 52,5 | 46 y 48 |
| Cookies: tarjeta | x 12, y 560, 366 × 205 | banda ancha de 768 con degradado y blur | 12, 560, 366 × 205 |
| Cookies: botones | 163 × 48 y 161 × 46 | 2 botones pequeños | iguales |
| Instalar: tarjeta | 358 × 216 sin anotaciones | 231,5 | 216 |
| Instalar: título / subtítulo | 20 / 14 | 24 / 18 | 20 / 14 |
| Instalar: botones | 158 × 42 y 156 × 40 | 47 y 45 | 42 y 40 |
| Exit: hoja | y 525, alto 319 | modal centrado con degradado | y 525, 319 |
| A11y: chips | 79 / 76 / 93 × 33 | panel flotante de 288 px | 78,6 / 75,1 / 92,8 × 33 |
| A11y: hoja | y 490, alto 354 | panel flotante, con tema y filtro de color | y 490, alto 354 (con filtro de color llegó a 466; tras sacarlo: 354) |
| A11y: "Alto contraste" / "Reducir movimiento" / "Listo" | y 698+4 / 736+4 / 774 | 702 / 740 / 886 con el filtro | 702 / 740 / 774 |
| WhatsApp FAB | 56 × 56 en (318, 705) | solo desktop (`hidden md:flex`), 56 en (1368, 828) | móvil (318, 705); desktop (1368, 828) |

## Cookies en desktop (corrección)

Antes de SYS el aviso era una banda centrada (`max-w-3xl`) con degradado y blur. SYS lo cambió en desktop a la misma tarjeta de móvil, abajo a la izquierda a 24 px (`lg:bottom-6 lg:left-6`). **No es una posición respaldada por Figma**: no existe frame desktop del aviso ni de la hoja. Estado: **REQUIRES_DESIGN_REFERENCE / pendiente de frame desktop**; se mantiene provisionalmente y no se declara PASS en desktop.

## Decisión: botón flotante de WhatsApp y botón con el isotipo

Evidencia (búsqueda en todos los frames del archivo, 622 mil caracteres de metadata, y en el código):

1. **Funcionalidad global.** Sí. `WhatsAppFab` se monta en `App.tsx` mediante `ConditionalWhatsAppFab` (`app/AppChrome.tsx`), no en `MainLayout`. Estaba oculto en `/login`, `/registro`, `/carrito`, `/checkout`, `/pago`, `/admin`, `/pos`, tienda del vendedor y prototipo, y **solo se veía desde 768 px** (`hidden md:flex`): en móvil nunca apareció.
2. **Dónde aparece en Figma.** El botón verde de WhatsApp solo está dibujado en el frame `51:2262` (nodo `52:2418`, 56 × 56 con su sombra). La nota de diseño `52:2422` dice: "F · Botón flotante de WhatsApp sobre la barra inferior (móvil) y abajo a la derecha (desktop)". No hay un FAB con el isotipo del asistente en ningún frame. Lo que se ve con el isotipo en la app **no es del asistente**: es el disparador del panel de accesibilidad (`AccessibilityPanel`). El asistente se abre desde chips, tarjeta y búsqueda, no tiene botón flotante.
3. **Estados en que aparece.** WhatsApp: todos los de compra salvo los de la lista de ocultamiento. Isotipo/accesibilidad: los mismos, salvo checkout, pago, admin, tienda del vendedor y prototipo.
4. **Cuándo se ocultan.** Ambos con el asistente abierto (como antes). En la ficha de producto móvil (barra de compra de 83 px y botón "Hacer una pregunta por WhatsApp" propio, `29:1632`) se ocultan los dos (`max-lg:hidden`). Cookies, instalar y hojas (z superior) los tapan mientras están abiertas.
5. **Posición.** Móvil (< 1024 px, donde existe la barra inferior): WhatsApp a 16 px del borde derecho y 16 px sobre la barra de 67 px (`bottom: 83px + safe-area`), igual a Figma. El botón del isotipo queda 12 px encima (`bottom: 151px`). Desktop (>= 1024 px): WhatsApp en `right 16, bottom 16` (como estaba, decisión del usuario: se mantiene); el isotipo, 12 px encima. Sin frame desktop: provisional.
6. **Con la barra inferior.** Se apoyan 16 px encima, sin superponerse (medido: barra y 777, WhatsApp y 705 a 761).
7. **Con la barra de compra de la ficha.** Ya no se superponen: ambos se ocultan en móvil. Medido en `/productos/1` a 390: solo queda la barra (y 761, 83). No hizo falta tocar `MainLayout` ni `pages/producto`.
8. **Desktop y móvil.** Móvil como Figma. Desktop: Figma solo dice "abajo a la derecha"; 16 px cerrado por el usuario (sin frame, provisional).

~~El botón con el isotipo se conserva de forma temporal~~ **Retirado el 2-oct-2026 (B1).** Figma (nota E) dice que "idioma y accesibilidad" se abre desde Mi cuenta y desde el pie, y ningún frame dibuja el botón flotante. El pie ahora abre la hoja con `abrirAccesibilidad()` y las preferencias de cookies con `abrirPreferenciasCookies()` (ver "Pasada B1" al final); `MOSTRAR_BOTON_FLOTANTE` y el botón se eliminaron. La fila "Idioma y accesibilidad" de Mi cuenta (ACC) sigue sin frame.

## API que expone SYS

- `abrirAccesibilidad()` (`components/ui/accessibility/abrirAccesibilidadApi.ts`): abre la hoja "Idioma y accesibilidad" desde cualquier módulo.
- `abrirPreferenciasCookies()` (`components/ui/cookies/preferenciasCookiesApi.ts`): abre la hoja de preferencias de cookies (Figma dice "desde el pie de página").
- `esSinConexion(error)` (`components/comprador/estados/conexionHelpers.ts`) y `PantallaSinConexion`: para estados de error de red.
- `ListaAccesos variante="plana"`: filas sin flecha (404). El valor por defecto no cambia (lo usa Mi cuenta).
- `Interruptor`, `OpcionChip`, `estilosHoja` en `components/ui/sistema/`: primitivas de las hojas.

## Dependencias para otros agentes

- **SHELL** (`FooterComprador`): ~~agregar enlaces~~ hecho el 2-oct-2026 (B1): "Preferencias de cookies" → `abrirPreferenciasCookies()` e "Idioma y accesibilidad" → `abrirAccesibilidad()`. `MainLayout` podría tener una prop `fondo="blanco"`: la 404 y el fallo son `n/0` en Figma y el layout pinta `n/50`; hoy la 404 lo resuelve con `min-h-[calc(100dvh-125px)] bg-hc-n-0` (aproximación de móvil).
- **ACC** (Mi cuenta): fila "Idioma y accesibilidad" → `abrirAccesibilidad()`.
- **HOME / quien muestre errores de red**: `if (esSinConexion(error)) return <PantallaSinConexion onReintentar={...} />`. Hecho el 2-oct-2026: `HomePage` muestra `PantallaSinConexion` ante un error de red sin datos, además de `PantallaFalloServidor` ante un 5xx.
- **SUP**: ruta `/sin-conexion` (`ROUTES_REQUESTED.md`); `App.tsx` y `app/AppChrome.tsx` fueron editados con el cambio mínimo (ver abajo).
- **CHK**: se consume `HojaInferior` sin editarla (velo `n/900` opaco, 22 px, agarradera 40 × 4).
- **PROD**: nada. Los botones flotantes ya se ocultan en la ficha móvil.

## Ediciones fuera de la carpeta de SYS (puntos de montaje)

- `App.tsx`: se agregó `<AvisoSinConexion />` y se quitó `<SocialProofController />`.
- `app/AppChrome.tsx`: `ConditionalWhatsAppFab` usa `whatsappOculto`; se eliminó `SocialProofController`.
- `pages/SinConexionPage.tsx` (nuevo): página de la ruta pedida.
- `app/HtmlClassManager.tsx`: se quitó el filtro de color (y su SVG) y se limpia `html.style.filter`.

## Desmontaje de SocialProofToast (decisión del usuario)

Quitado: `SocialProofToast` (inventaba compradores y acciones cada 15 a 30 s; no está en Figma; riesgo Ley 7472), su hook `useSocialProof`, el componente huérfano `SocialProof.tsx` (nadie lo importaba) y las claves `socialProof.*` y `socialProofToast.*` en es/en/pt. Verificado con grep: sin referencias. También se eliminaron `LanguageSelector.tsx` (no se usaba en ningún lado), `A11yPanelContent.tsx` y `a11yUi.tsx` (reemplazados por la hoja nueva). `LanguageRadiogroup` y `a11yConstants` se quedan: los usa Configuración del panel.

## Decisiones cerradas por el usuario

1. Selector de tema: eliminado de la hoja del comprador (Figma no lo dibuja). No se trasladó a otra pantalla. En marketplace el tema siempre es claro (`HtmlClassManager`); el panel admin sigue con su propio selector (`ThemeToggle`, `SeccionApariencia`), fuera del alcance del comprador.
2. Filtro de color / visión: sacado de la hoja. No se movió ni se reimplementó. Se retiraron `COLOR_FILTERS`, las claves `a11y.filtro*` (es/en/pt), el SVG de filtros y la aplicación de `html.style.filter` en `HtmlClassManager`, que ahora limpia cualquier filtro que haya quedado de una sesión anterior (el valor persistido en `uiStore` queda inerte; el store no se tocó). Idea fuera de alcance: si se quisiera conservar el simulador de daltonismo, podría vivir en Apariencia del panel admin.
3. Campo de correo del cupón: se mantiene en 42 px.
4. WhatsApp desktop: abajo a la derecha, 16 px.
5. Cookies desktop: provisional (ver sección arriba).

## Pendientes REQUIRES_DECISION

- Tamaño de fuente, efecto de A−: el chip se muestra y no reduce la raíz (el frame `51:2229` no define un tamaño menor que 16 px). La fila E sigue PARTIAL. El chip marcado al abrir ya es A (B3).
- Variante de favoritos del aviso de salida y estado "cupón enviado": sin frame.

## Verificación

- `tsc --noEmit` limpio; `vitest run` 88 archivos, 400 tests; `vite build` a carpeta temporal correcto.
- eslint sobre lo tocado: sin errores nuevos. Quedan los preexistentes de `CookieBanner.tsx` (react-refresh por exportar helpers que importan `utils/*`, no son de SYS) y 2 avisos de dependencias en `ExitIntentModal`.
- i18n: es/en/pt en el mismo commit; namespaces `estadosComprador`, `cookies`, `promo`, `exitIntent`, `a11y`.

## No verificado

- Fotos reales de vistos y favoritos en Sin conexión (se usaron imágenes sintéticas).
- ~~Estado activo "Inicio" de la barra inferior en Sin conexión~~ Verificado el 2-oct-2026 en `/` y en `/sin-conexion`.
- Modo oscuro del panel admin con la hoja de accesibilidad (la hoja es del comprador).
- Navegadores reales con `beforeinstallprompt`: se simuló el evento.
- Texto propuesto para INVENTORY y PROGRESS: ver el informe final de SYS.

## Pasada del 2-oct-2026: A1 (Home sin conexión) y A4 (apilado)

### A1. Home sin conexión (`45:2264`)

- `HomePage.tsx`: si el catálogo y los destacados no tienen datos y alguna de las dos consultas falla por red (`esSinConexion`), devuelve `PantallaSinConexion`. Mismo patrón que `esFalloServidor`; el 5xx sigue mostrando el fallo del servidor. "Reintentar" vuelve a pedir las dos consultas (no recarga la página), igual que el fallo del servidor. Con datos ya cargados, el Home normal sigue visible aunque no haya red.
- Medido a 390 con la franja de 36 px (navegador sin red) y con 4 vistos y 2 favoritos sembrados: vistos y279 (miniaturas 80 × 76 en x 20, 110, 200, 290), favoritos y391 (76 × 76 en x 20 y 106), Reintentar en (20, 489) de 350 × 48. Todo a 0 px de Figma. "Inicio" activo en la barra. Sin desbordes y sin errores de página ni de consola (se excluyen los fallos de recurso y el `console.error` de `useBranding`, que son consecuencia de la caída simulada).
- Desktop: el frame es solo móvil. Se muestra la misma pantalla, sin variante nueva y sin desbordes a 1440.
- Pruebas: `tests/home-sin-conexion.spec.ts` (6 casos: pantalla, Reintentar, 500, `/sin-conexion`, posiciones con datos guardados, desktop).

### A4. Apilado de elementos fijos

Orden real medido: flotantes (WhatsApp, isotipo) 40 < header y barra inferior 50 < tarjeta de instalar 55 < aviso de actualización 60 < aviso de cookies **65** < hojas (`HojaInferior`: cupón, salida, idioma y accesibilidad, preferencias de cookies) 70. Se comprobó quién recibe el clic en el centro de cada control a 390 (y a 1440 donde aplica).

| Caso | Resultado |
| --- | --- |
| Hoja de accesibilidad abierta | Cubre WhatsApp, isotipo, barra inferior y header; "Listo" recibe el clic. Correcto |
| Preferencias de cookies abiertas desde el aviso | Sus botones reciben el clic. Correcto |
| Aviso de cookies sin hojas | Sus tres botones reciben el clic y queda sobre los flotantes y la barra. Correcto |
| Cupón de bienvenida abierto cuando sale el aviso de cookies (12 s) | **Defecto**: el aviso (z 9999) tapaba el título y el campo de correo del cupón (z 70) |
| Mismo caso a 1440 | Sin solapamiento: el aviso queda abajo a la izquierda y la hoja está centrada |
| Tarjeta de instalar, aviso de actualización | Sin solapamiento con la barra (la tarjeta termina en y 756 y la barra empieza en 777). El aviso de cookies siempre tapó al de actualización; no se cambió |
| `MiniCartDrawer` | Nada lo abre (`setCartDrawerOpen(true)` no se llama fuera del propio componente); sin efecto |

Corrección (única de A4): `CookieBanner.tsx`, `z-[9999]` -> `z-[65]`. Las hojas pasan a cubrir el aviso, como cualquier modal, y el aviso sigue sobre la barra, la tarjeta de instalar y el aviso de actualización. Verificado que la prueba falla con el valor anterior (390) y pasa con el nuevo (390 y 1440). Pruebas: `tests/sys-apilado.spec.ts` (4 casos).

No se tocó el solapamiento de WhatsApp con el contenido ni la posición `bottom: 83px` en páginas internas (B2), ni el botón con isotipo (B1).

## Pasada B1 del 2-oct-2026: accesos del pie y retiro del isotipo flotante

Decisión B1 (tuya): "Preferencias de cookies" e "Idioma y accesibilidad" se abren desde el pie y el botón flotante con el isotipo se elimina. Los frames del pie (`7:355`, `9:559`) no dibujan los accesos; solo la nota E (`51:2590`) dice "desde el pie". No se inventó diseño: van como texto en la misma línea legal, con el estilo de los demás enlaces.

- **Pie** (`FooterComprador.tsx`): dos `<button>` que llaman a `abrirPreferenciasCookies()` y `abrirAccesibilidad()`. Sin navegación falsa. Foco visible con el anillo global de `:focus-visible`. Claves nuevas `comprador.footer.preferenciasCookies` e `idiomaAccesibilidad` en es/en/pt.
- **Hoja de accesibilidad** (`AccessibilityPanel.tsx`): se eliminaron el botón del isotipo, `MOSTRAR_BOTON_FLOTANTE` y las condiciones de ruta que solo existían para ese botón (con ellas, el enlace del pie no hacía nada en `/pago`). La hoja, el radiogroup de idioma y los controles no cambiaron. Al abrirla, el foco entra en el idioma vigente (`HojaIdiomaAccesibilidad.tsx`); al cerrarla vuelve a quien la abrió.
- **Cookies**: la hoja de preferencias ya existía y ya devolvía el foco; solo se conectó. Se abre antes y después de haber respondido el aviso, se cierra con Esc y con "Guardar preferencias", y se puede reabrir.
- **No cambió**: `WhatsAppFab` (misma posición: 390 en (318, 705) de 56 × 56; 1440 en (1368, 828)), tamaño de fuente (B3), criterio de cookies (B4), posición de WhatsApp en páginas internas (B2).
- **Efecto en la altura del pie**: desktop sin cambio (143 = 84 + 59 de Figma; los accesos entran en la misma línea, que mide 724 px de 1200). Móvil: el pie legal pasa de 71 a 89 px (segunda línea de 18 px) y banner + pie de 138 a 156. Figma no dibuja esos accesos, así que no hay referencia contra la cual corregir; la diferencia es consecuencia directa de B1.
- **Alcance real del acceso**: el pie solo se ve en móvil en las pantallas `raiz` (Home, catálogo, categorías); en las `interna`, `marca` y `propia` el pie es solo de escritorio. Desde esas pantallas en móvil (carrito, ficha, login, cuenta, checkout) la hoja ya no se alcanza, mientras que antes el isotipo sí estaba. La fila "Idioma y accesibilidad" de Mi cuenta (ACC) no tiene frame y no se inventó. Queda documentado como decisión pendiente, no se resolvió aquí.
- **Visual**: hoja abierta desde el pie a 390 en y490, alto 354, igual a `51:2229`. Pie a 1440 sin cambios de altura ni de posición del texto legal (x120) ni del © (x1159, 161 de ancho).
- **Pruebas**: `tests/pie-accesos.spec.ts` (9 casos a 390 y 1440: accesos visibles, cookies abre/cierra/reabre, idioma con `radiogroup`, `aria-checked`, flechas, Esc y foco, sin isotipo, WhatsApp igual, sin desborde, Enter con teclado y foco visible). Se actualizaron `idioma.spec`, `ui-sin-emoji.spec` y `sys-apilado.spec`, que abrían la hoja con el isotipo.
- **`idioma.spec`**: dos casos (English y Português) siguen fallando, pero en la aserción del enlace "Products/Produtos" del header anterior, después de abrir la hoja y cambiar el idioma. No los causa B1; ya fallaban en `master`.
- El CSS `.hc-isotipo-placa` de `index.css` quedó sin uso. No se tocó `index.css` en esta pasada.

## Pasada B2 del 2-oct-2026: posición del WhatsApp flotante

No hay un `bottom` nuevo para todas las pantallas. El ancla de Home (`52:2418`, 56 × 56 en x 318, y 705) y el desktop (nota `52:2422`, margen 16 px) no se movieron. Icono, tamaño, `wa.me` y las rutas donde el botón no se monta tampoco.

- **Con barra inferior** (`MainLayout` publica la prop real, no un mapa de rutas): `bottom: 83px` (67 + 16). Así quedan `/`, `/productos`, `/categorias`, el resumen de `/perfil`, el listado de `/mis-pedidos` y `/sin-conexion`.
- **Sin barra** (`/servicios`, detalle `?pedido=`, `/perfil?vista=seguridad` y el resto de internas): `bottom: 16px`. El offset de 83 px las dejaba 67 px demasiado altas. No hay frame; se reutiliza el margen de la nota de desktop.
- **Pie móvil** (solo `raiz`): el spacer pasa de 72 a 155 px para que, al final del scroll, «Términos» y los accesos de B1 queden 16 px arriba del botón. Figma no dibuja ese final de página. El botón fijo no se sube, porque eso rompería y 705.
- **Con barra y sin pie móvil**: spacer de 72 px, como antes.
- **Sin barra y con el botón visible**: spacer de 88 px para que el envío del formulario pueda quedar por encima. No se agrega si el botón está oculto (carrito, checkout, pago, ficha).
- **Desktop** (`lg`): sigue `bottom: 16px` y `right: 16px`. En 1440 el © y «Términos» no cruzan el botón.
- **Sigue PARTIAL** donde el frame no dibuja el botón (`/servicios`, `/sin-conexion`) o Home tiene otras pendientes (fotos, badges). El recuento no cambia: 35 PASS / 55 PARTIAL.
- **Pruebas**: `flotantesHelpers.test.ts` y `tests/whatsapp-fab-b2.spec.ts`. `pie-accesos.spec.ts` sigue exigiendo (318, 705) y (1368, 828). B4 no se tocó.

## Pasada B3 del 2-oct-2026: tamaño de fuente

Figma `52:2389` marca el chip **A** (blue/50, borde blue/600). A− y A+ van sin marcar. El frame no dice cuántos px aplican fuera de la hoja.

- **A** queda en `fontSize: 'normal'`. Sin preferencia guardada, A sale marcado y `<html>` no lleva `fs-lg` ni `fs-xl`. La raíz sigue en 16 px.
- **A+** guarda `lg` (18 px, clase `fs-lg`). Si la sesión ya tenía `xl` (20 px), no se rebaja: A+ sigue marcado y la clase `fs-xl` se conserva.
- **A−** se dibuja. Pulsarlo no cambia la raíz. No hay un `font-size` menor: el frame no lo define.
- No se tocaron `index.css`, el default del store, WhatsApp, el pie, las cookies ni el radiogroup del idioma.
- La fila `51:2229` sigue PARTIAL. El recuento no cambia: 35 PASS / 55 PARTIAL.
- **Pruebas**: `fuenteAccesibilidad.test.ts` y `tests/a11y-fuente.spec.ts` (390 y 1440).

## Pasada B4 del 2-oct-2026: criterio del aviso de cookies

Figma `45:1946` es solo móvil. La tarjeta `45:2152` está en x 12, y 560, 366 × 205. No hay frame desktop ni un estado dibujado después de guardar.

- Medido a 390×844, con las fuentes listas y el resorte ya asentado: la tarjeta queda en x 12, y 560, 366 × 205 (0 px de diferencia). `CookieBanner.tsx` no se modificó.
- «Solo esenciales», «Aceptar todo» y «Guardar preferencias» escriben `hotclick-cookie-consent` y ocultan el aviso. «Configurar» abre la hoja `45:2166`, que sigue PASS.
- El aviso sigue en `z-[65]`, debajo del cupón. No se cambió el `z-index`, ni los 12 s, ni la hoja de preferencias.
- En 1440 no hay coordenada que afirmar. Solo se comprobó que no hay desborde horizontal. `left: 24px` y `bottom: 24px` se dejan como están.
- La fila `45:1946` pasa a PASS móvil. El recuento queda en 36 PASS / 54 PARTIAL. El escritorio sin frame no bloquea ese PASS.
- **Pruebas**: `tests/cookies-b4.spec.ts`. `sys-apilado.spec.ts`, `pie-accesos.spec.ts`, `whatsapp-fab-b2.spec.ts` y `a11y-fuente.spec.ts` siguen sin editarse.
