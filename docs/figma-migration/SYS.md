# SYS: estados y sistemas (404, fallo, sin conexión, instalar, cookies, popups, accesibilidad, WhatsApp)

Rama `feat/figma/sys` (desde `feat/figma/base` `e7717b64`). Archivo Figma `TmxYFj2nauu10WZnZ0t6yt`. Medidas tomadas con Playwright en 390 (y 1440 donde se indica), fuentes reales Sora, Public Sans e IBM Plex Mono con `document.fonts.ready`, API simulada con `context.route('**/api/**')`, offline con `setOffline`, 500 con la API simulada, cookies y popups con localStorage/sessionStorage. Las posiciones son de Figma menos el origen del frame.

## Veredictos

| Pantalla | Nodo | Veredicto | Resumen |
| --- | --- | --- | --- |
| Página no encontrada · móvil | `45:2198` | PASS (móvil) | Barra de marca (`variante="marca"`), mensaje, buscador y accesos planos sin flechas, con los SVG originales. Sin frame desktop |
| Fallo del servidor · móvil | `45:2322` | PASS (móvil) | Ya existía (PR #93). Corregidos alturas y tracking del Sora; ícono de alerta ahora es el SVG original |
| Instalar la app · tarjeta | `55:2658` | PASS (móvil) | Ya existía. Corregidos alturas de título, subtítulo, beneficios y botones; la nota "NUEVO · por programar" y el texto del hook no llegan a la UI. Reglas de la nota (2.ª visita, nunca la primera página, 30 días) intactas |
| Sin conexión · móvil | `45:2264` | PARTIAL | Geometría igual a Figma. Falta que HOME/SUP la enchufen (ver dependencias); fotos reales de vistos y favoritos no verificadas |
| Aviso de cookies · móvil | `45:1946` | PASS (móvil) | Tarjeta 366 × 205 en x 12, y 560, botones 163 × 48 y 161 × 46. **Desktop: REQUIRES_DESIGN_REFERENCE** (no hay frame; provisional, ver abajo) |
| Preferencias de cookies · hoja | `45:2166` | PASS (móvil) | Hoja desde y 90, secciones en 179, 266 y 361, pie en 644; todas iguales a Figma |
| C · Cupón de bienvenida | `51:2163` | PASS (móvil) | Hoja igual a Figma con el campo de correo de 42 px (decisión del usuario: el frame de 26 px es un frame comprimido, no la referencia final). El paso "cupón enviado" no existe en Figma y se resolvió con el mismo sistema |
| D · ¿Aún pensando? | `51:2196` | PASS (móvil) | Hoja en y 525, alto 319, igual a Figma. La variante de favoritos no existe en Figma |
| E · Idioma y accesibilidad | `51:2229` | PARTIAL (móvil medido) | Hoja y 490, alto 354 (igual a Figma); idioma, tamaño de fuente, alto contraste, reducir movimiento y Listo en las posiciones de Figma. Sin tema ni filtro de color (decisión del usuario). Diferencia real: Figma resalta "A" (la del medio) por defecto y la app resalta "A−" porque el tamaño por defecto del store es el más pequeño de las tres opciones; arreglarlo exige un tamaño nuevo o reetiquetar: REQUIRES_DECISION |
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

El botón con el isotipo se **conserva** de forma temporal: Figma (nota E) dice que "idioma y accesibilidad" se abre desde Mi cuenta y desde el footer, pero ninguno de los dos frames dibuja ese acceso. Está detrás de la constante `MOSTRAR_BOTON_FLOTANTE` de `AccessibilityPanel.tsx`. Cuando SHELL (footer) y ACC (Mi cuenta) llamen a `abrirAccesibilidad()`, pasarla a `false`.

## API que expone SYS

- `abrirAccesibilidad()` (`components/ui/accessibility/abrirAccesibilidadApi.ts`): abre la hoja "Idioma y accesibilidad" desde cualquier módulo.
- `abrirPreferenciasCookies()` (`components/ui/cookies/preferenciasCookiesApi.ts`): abre la hoja de preferencias de cookies (Figma dice "desde el pie de página").
- `esSinConexion(error)` (`components/comprador/estados/conexionHelpers.ts`) y `PantallaSinConexion`: para estados de error de red.
- `ListaAccesos variante="plana"`: filas sin flecha (404). El valor por defecto no cambia (lo usa Mi cuenta).
- `Interruptor`, `OpcionChip`, `estilosHoja` en `components/ui/sistema/`: primitivas de las hojas.

## Dependencias para otros agentes

- **SHELL** (`FooterComprador`): agregar enlaces "Preferencias de cookies" → `abrirPreferenciasCookies()` e "Idioma y accesibilidad" → `abrirAccesibilidad()`. `MainLayout` podría tener una prop `fondo="blanco"`: la 404 y el fallo son `n/0` en Figma y el layout pinta `n/50`; hoy la 404 lo resuelve con `min-h-[calc(100dvh-125px)] bg-hc-n-0` (aproximación de móvil).
- **ACC** (Mi cuenta): fila "Idioma y accesibilidad" → `abrirAccesibilidad()`.
- **HOME / quien muestre errores de red**: `if (esSinConexion(error)) return <PantallaSinConexion onReintentar={...} />`. Hoy `HomePage` solo distingue `esFalloServidor` (5xx).
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

- Tamaño de fuente: Figma resalta "A" por defecto; la app resalta "A−" (ver fila de E).
- Variante de favoritos del aviso de salida y estado "cupón enviado": sin frame.

## Verificación

- `tsc --noEmit` limpio; `vitest run` 88 archivos, 400 tests; `vite build` a carpeta temporal correcto.
- eslint sobre lo tocado: sin errores nuevos. Quedan los preexistentes de `CookieBanner.tsx` (react-refresh por exportar helpers que importan `utils/*`, no son de SYS) y 2 avisos de dependencias en `ExitIntentModal`.
- i18n: es/en/pt en el mismo commit; namespaces `estadosComprador`, `cookies`, `promo`, `exitIntent`, `a11y`.

## No verificado

- Fotos reales de vistos y favoritos en Sin conexión (se usaron imágenes sintéticas).
- Estado activo "Inicio" de la barra inferior en Sin conexión (depende de la ruta donde se muestre).
- Modo oscuro del panel admin con la hoja de accesibilidad (la hoja es del comprador).
- Navegadores reales con `beforeinstallprompt`: se simuló el evento.
- Texto propuesto para INVENTORY y PROGRESS: ver el informe final de SYS.
