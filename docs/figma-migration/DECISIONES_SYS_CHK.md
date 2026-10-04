# Decisiones abiertas de SYS y CHK: análisis contra Figma y código

> **Estado al cierre (P21, 2-oct-2026):** las decisiones pendientes, los huecos de backend, los tests que ya fallaban y cómo verificar están en `CIERRE_MIGRACION.md`. Los estados de las pantallas están en `INVENTORY.md`. Este documento conserva el detalle del módulo.

Fecha: 2026-09-30. Análisis de solo lectura. Archivo Figma `TmxYFj2nauu10WZnZ0t6yt` (una sola página, 12 secciones). Código leído en los worktrees `base` (SYS, `437d0b13`) y `chk` (rama `feat/figma/chk`, commit `d1451060` más trabajo sin commitear del carrito).

## Cómo se obtuvo la evidencia de Figma

- `get_metadata` de la página completa (622 mil caracteres, leída entera con scripts): árbol de todos los frames, nombres de todos los nodos de texto (incluidas las notas de diseño).
- `get_design_context` y `get_screenshot` de `51:2163`/`52:2315` (cupón), `45:1607` (hoja), `51:2229` (accesibilidad) y `29:2072` (ficha desktop).
- `use_figma` en modo solo lectura (sin escribir nada): propiedades de auto-layout del campo `52:2315`, de su hoja `51:2168`, alturas de todos los campos hermanos con el mismo estilo, y las 58 interacciones de prototipo (reacciones) de todo el archivo.
- Hallazgos generales del archivo que aplican a varias decisiones:
  - Hay frames desktop (1440) solo para: Home, Home al scrollear, Catálogo, Ficha de producto, Perfil del negocio, Carrito, Checkout y Mi cuenta. No hay frame desktop de: cookies, hoja "Agregado a tu pedido", cupón, accesibilidad ni WhatsApp.
  - No existe ningún frame, texto ni nodo con "oscuro", "claro", "daltónico", "toast", "snackbar", "cajón" ni "drawer".
  - La nota de diseño `51:2584` (frame "Nota · funciones existentes por aprobar") describe cada pieza: E (`51:2590`), F (`52:2422`), D (`51:2589`). Se cita en cada decisión.
  - Los frames de Mi cuenta (`28:1196`, `30:1479`) y los footers no dibujan ningún acceso a "Idioma y accesibilidad" ni a "Preferencias de cookies", aunque la nota E dice que se abre desde ahí. Solo el mapa de flujo `34:1355` lista los nombres "Idioma y accesibilidad" y "Preferencias de cookies" como nodos sueltos, sin conexiones.
  - Interacciones de prototipo relevantes: "Agregar al pedido" de la ficha móvil (`28:982`) lleva a la hoja `45:1607`; en la hoja, "Seguir comprando" (`45:1636`) es BACK y "Ver pedido" (`45:1638`) va al carrito `28:989`. Ningún botón de la ficha desktop (`29:2155`, `29:2160`) tiene interacción. Los botones del cupón (`51:2192/2194`) y "Listo" de accesibilidad (`51:2260`) tienen interacciones de cableado del prototipo (BACK o carrito) que no aclaran nada de las decisiones.

---

## 1. Selector de tema (claro/oscuro) quitado del panel de accesibilidad

### a) Qué muestra Figma
Hoja `51:2234` (frame `51:2229`, 390 x 354 en y 490): título con ícono (24 px), grupo Idioma (chips 79/76/93 x 33), grupo Tamaño de fuente (chips A-/A/A+ 47/40/47 x 33), fila "Alto contraste" con interruptor 40 x 24, fila "Reducir movimiento" con interruptor 40 x 24 y botón "Listo" 358 x 42. No hay fila ni chips de tema. La nota E (`51:2590`) enumera: "Idioma (español, inglés, portugués), tamaño de fuente, alto contraste y reducir movimiento". No hay en todo el archivo ningún frame en modo oscuro del marketplace ni texto "oscuro"/"claro"/"tema".

### b) Qué hace el código
Antes (`03c4bf6a^`, `A11yPanelContent.tsx`) el panel tenía botones Claro/Oscuro (`setTheme`). Ahora `HojaIdiomaAccesibilidad.tsx` no los tiene. `utils/temaPorRuta.ts` + `app/HtmlClassManager.tsx` fuerzan `light` en toda ruta que no sea del panel (`/admin`, `/emprendedor`, `/pyme`, `/negocio-plus`); la preferencia `theme` solo se aplica en esas rutas. `AccessibilityPanel` (host de la hoja y del botón con el isotipo) devuelve `null` en `/admin`, `/checkout`, `/pago`, `/tienda` y prototipo. El panel admin tiene su propio `ThemeToggle` (`AdminMobileHeader`, `SidebarContent`, POS, `SeccionApariencia`).

### c) Estado completo o parcial
Completo. El frame no está recortado (354 de alto, todo el contenido y el botón "Listo" visibles) y la nota E enumera el contenido sin tema.

### d) Cambio necesario
Ninguno. Efecto de la decisión de SYS: el selector solo tenía efecto sobre una preferencia que el marketplace ignora; en el panel admin, donde sí aplica, la hoja no se monta y el admin ya tiene su toggle. Las claves `theme.*` de i18n siguen en uso por `ThemeToggle`.

### e) Veredicto
**DECISION_RESPALDADA_POR_FIGMA.** Quitar el selector es lo que dibuja Figma (hoja y nota E) y además no pierde funcionalidad (el tema nunca se aplicaba en las pantallas donde se mostraba la hoja). Sin acción pendiente.

---

## 2. Filtro de color / visión conservado en "Idioma y accesibilidad"

### a) Qué muestra Figma
Nada. El grupo "Filtro de color / visión" no está en el frame `51:2229`, ni en la nota E, ni en ningún otro frame (búsqueda de "filtro", "daltón", "visión" en todos los nodos: solo coincide "visible" en textos no relacionados). Tampoco se dibuja en Mi cuenta (`28:1196`, `30:1479`) ni "Datos y seguridad" (`30:1400`).

### b) Qué hace el código
`HojaIdiomaAccesibilidad.tsx` mantiene un grupo extra con 5 chips (`COLOR_FILTERS`: Normal, Sin color, Dalton. verde, Dalton. rojo y tritanopia) que escribe `colorFilter` en `uiStore` (persistido) y `HtmlClassManager` aplica `html.style.filter` (escala de grises o matrices SVG de deuteranopia, protanopia, tritanopia) en TODO el sitio, también en pantallas de compra. Dato clave: el texto i18n existente (`a11y.filtroColorDesc`) dice "Simula distintos tipos de visión del color para verificar el contraste". Es decir, la función es un **simulador** de daltonismo (herramienta de verificación), no una ayuda que corrija la visión de un comprador. Esto debilita el argumento de SYS de que es "accesibilidad real". Solo se usa en este panel (no hay otro uso en el código ni tests, salvo `tema-por-ruta.spec.ts`).

### c) Estado completo o parcial
Completo en lo que dibuja: la hoja de Figma está entera y no incluye el grupo. Conservarlo hace la hoja más alta que la de Figma (estimación sin medir: unos 100 a 115 px más si los chips ocupan dos filas, es decir, hoja de unos 460 px en vez de 354).

### d) Cambio necesario
- Opción A (estado actual): ninguno. Desviación visible de Figma.
- Opción B (quitar el grupo): editar `HojaIdiomaAccesibilidad.tsx` (borrar el bloque y 3 líneas de store), tamaño chico. Riesgo: se pierde la función; el código de `HtmlClassManager` y `a11yConstants.COLOR_FILTERS` quedaría muerto salvo que se quite también (cambio un poco mayor: `uiStore`, `HtmlClassManager`, i18n es/en/pt, `tema-por-ruta.spec.ts`).
- Opción C (moverlo fuera del comprador): por ejemplo a la configuración del panel admin (`SeccionApariencia`), donde tiene sentido como herramienta de verificación. Tamaño medio, sin impacto en otros agentes (ACC solo agregará el acceso `abrirAccesibilidad()`).
Impacto en otros agentes: ninguno de forma directa.

### e) Veredicto
**REQUIERE_DECISION_DEL_USUARIO.** Figma no lo respalda ni lo prohíbe expresamente (la nota enumera cuatro funciones, lo que sugiere que no forma parte del diseño aprobado). El código lo tiene como funcionalidad existente. Recomendación: B/C, es decir, sacarlo de la hoja del comprador porque es un simulador (no una ayuda al comprador) y no está en Figma; si el usuario valora la función, moverlo a la configuración del admin en vez de mantenerlo en la hoja. Si el usuario prefiere no perderlo hoy, dejar A temporalmente y anotarlo como desviación consciente.

---

## 3. Campo de correo del cupón de bienvenida: 26 px en Figma, 42 px en código

### a) Qué muestra Figma
Frame `51:2163`, hoja `51:2168` (390 x 299, y 545), nodo `52:2315` "Campo correo": 358 x 26. Contenido: ícono 16 en (13, 5) y texto "tu@correo.com" en (37, 5), 16 de alto.

### b) Qué hace el código
`components/ui/promoWelcome/PromoWelcomeForm.tsx`: `label` con `p-3` (12 px), borde 1 px, radio 12, ícono 16, `input` `h-4`: 12 + 16 + 12 + 2 de borde = 42 px.

### c) Estado completo o parcial
Es un **frame comprimido**, con evidencia directa leída por la API de Figma:
- El nodo `52:2315` declara `paddingTop/Bottom/Left/Right = 12`, `gap = 8`, radio 12, borde n/200 (el mismo estilo de todos los campos), pero tiene `layoutSizingVertical = FILL` dentro de una hoja que es `HUG` (la hoja se ajusta a su contenido). Un hijo con altura FILL dentro de un padre HUG no tiene una altura propia que "rellenar", y por eso Figma lo dejó en un valor que no sale del relleno declarado (12 + 16 + 12 + borde = 42). Es el único campo de este estilo con esa configuración (los demás son HUG).
- Los otros 4 campos del archivo con exactamente el mismo estilo (padding 12, radio 12, borde) miden todos **42** y son `HUG`: campo "Cupón" del checkout (`37:1641` y `51:1966`, 300 x 42), campo de "Gift card" (`52:2166`, 300 x 42) y un campo "Correo" (`52:2200`, 263 x 42).
- Los textos de la hoja tienen un hueco de 14 px entre ítems (`itemSpacing = 14`) y la hoja es HUG: con el campo a 42 la hoja mediría 315 y arrancaría en y 529 (el dibujo de 299 es consecuencia del colapso).
- El ícono en y 5 y el texto en y 5 (en un campo de 26) están a 5 px del borde, no a 12: no corresponden al relleno declarado de 12.
- Un campo táctil de 26 px queda por debajo de cualquier tamaño mínimo de objetivo táctil (44 px recomendado).

### d) Cambio necesario
Ninguno: el código ya mide 42, igual que el resto de campos de Figma. Esperado en la medición con 42: hoja de 315 px de alto en y 529 (16 px más alta que el dibujo). Sin impacto en otros agentes.

### e) Veredicto
**DECISION_RESPALDADA_POR_FIGMA** (por los datos de Figma, no por intuición): 42 px es el valor de diseño del componente (relleno 12 declarado en el propio nodo y 4 campos gemelos a 42); los 26 px son un artefacto de auto-layout. Recomendación: dejar 42 y registrar en `SYS.md` que la hoja de Figma quedará 16 px más alta por este motivo. Opcionalmente avisar al diseñador para corregir el nodo `52:2315`.

---

## 4. Cookies (`45:1946`, `45:2166`) y botón flotante de WhatsApp (`51:2262`) en desktop

### a) Qué muestra Figma
- **WhatsApp:** frame móvil `51:2262`: botón 56 x 56 en (318, 705). La nota F (`52:2422`) dice: "Botón flotante de WhatsApp sobre la barra inferior (móvil) y **abajo a la derecha (desktop)**". Ningún frame desktop lo dibuja (en los 8 frames desktop no aparece el botón verde).
- **Cookies:** solo móvil: tarjeta `45:2152` 366 x 205 en (12, 560) sobre el Home (`45:1946`) y hoja `45:2166`. No hay nota que mencione desktop ni frame desktop. Los frames desktop de Figma no incluyen aviso de cookies.

### b) Qué hace el código (worktree `base`)
- WhatsApp (`WhatsAppFab.tsx`): `fixed right-4` y `bottom 83px + safe-area` en móvil, `lg:bottom-4` en desktop, es decir 16 px del borde derecho e inferior. Igual que antes de SYS (`bottom-4 right-4`), con la diferencia de que antes solo aparecía desde 768 px. El botón del isotipo (accesibilidad) queda encima en `lg:bottom-[84px]`, `right-5`.
- Cookies (`CookieBanner.tsx`): móvil `inset-x-3 mx-auto max-w-[366px]` con `bottom 79px`; desktop `lg:left-6 lg:bottom-6` (24 px). **Esto no es "lo actual"**: antes de SYS (`0536ef45^1`) el aviso era una banda centrada `max-w-3xl` con degradado. SYS decidió mover la tarjeta abajo a la izquierda en desktop; es una decisión de SYS sin respaldo de Figma (aunque razonable porque deja libre la esquina derecha del WhatsApp).

### c) Estado completo o parcial
- WhatsApp: **parcial pero con dirección explícita.** Figma define la esquina (abajo a la derecha) por texto, sin medida de margen.
- Cookies: no definido para desktop.

### d) Cambio necesario
Ninguno si se acepta el estado actual. Alternativa si el usuario quiere otra posición de cookies: editar solo clases de `CookieBanner.tsx` (una línea), riesgo bajo. Para el margen del WhatsApp: una clase en `WhatsAppFab.tsx` y el desplazamiento del isotipo en `AccessibilityPanel.tsx` (también `flotantesHelpers.ts`). Sin impacto en otros agentes.

### e) Veredicto
- **WhatsApp desktop:** esquina **DECISION_RESPALDADA_POR_FIGMA** (nota F: abajo a la derecha, ya implementada). El margen exacto de 16 px **REQUIERE_DECISION_DEL_USUARIO (menor)**: no medido en desktop; 16 px es el margen medido en móvil (Figma) y se mantiene por coherencia. Recomendación: dejar 16 px.
- **Cookies desktop:** **REQUIERE_DECISION_DEL_USUARIO (menor)**, sin evidencia en Figma. Opciones: (1) tarjeta abajo a la izquierda a 24 px (actual; evita el WhatsApp); (2) misma tarjeta centrada abajo; (3) pedir al diseñador un frame desktop. Recomendación: dejar (1) hasta tener el frame, anotando que es una extrapolación de SYS (no "lo que había").

---

## 5. Comportamiento en desktop tras "Agregar" en la ficha de producto

### a) Qué muestra Figma
- Móvil: la ficha `28:839` tiene la barra de compra; "Agregar al pedido" (`28:982`) tiene interacción de prototipo hacia la hoja `45:1607` (confirmación, "Seguir comprando" = volver, "Ver pedido" = carrito `28:989`).
- Desktop: ficha `29:2072`. Muestra el header global con el ícono de carrito y una insignia roja "2" (screenshot), el botón rojo "Agregar al pedido" (`29:2155`/`29:2160`) **sin interacción de prototipo** y sin ningún frame de confirmación asociado. No existe en el archivo ninguna hoja, modal, cajón ni toast en desktop (búsqueda de "toast", "snackbar", "cajón", "drawer", "añadido": 0). El estado "Añadido" del botón tampoco existe en Figma.

### b) Qué hace el código (worktree `chk`)
`pages/producto/useProductDetail.ts`, `agregarAlPedido({conAviso})`: agrega al carrito; si `matchMedia('(max-width: 1023.98px)')` coincide abre `HojaAgregadoAlPedido`; si no, muestra el toast `product.added` y el botón pasa a "Añadido" 1,4 s (`justAdded`). Esto es el comportamiento que la ficha ya tenía en todos los tamaños antes de CHK (CHK solo añadió la rama móvil y quitó "Comprar ahora"/`showSticky`, código muerto). El header actualiza la insignia del carrito.

### c) Estado completo o parcial
Figma solo define el camino móvil. En desktop no hay estado dibujado (ni siquiera el toast actual). El corte en 1024 px es de CHK (tablet 768 a 1023 px recibe la hoja móvil); Figma no define tablet.

### d) Cambio necesario
- Opción A (actual): ninguno. Toast + "Añadido" + insignia del header, sin respaldo en Figma pero sin regresión.
- Opción B: usar la misma hoja en desktop (centrada como modal o igual de inferior): cambio chico en `useProductDetail.ts` (quitar la condición de `matchMedia`), pero la hoja de 390 de ancho en 1440 es una invención de diseño, hay que decidir el ancho/posición. Riesgo medio de desviarse del diseño.
- Opción C: pedir a diseño un frame (mini-carrito o confirmación desktop). Bloquea solo ese caso.
Impacto: PROD (archivos de la ficha) y CHK (`HojaAgregadoAlPedido`); ninguno en SYS.

### e) Veredicto
**REQUIERE_DECISION_DEL_USUARIO.** Figma no define nada en desktop. Recomendación: mantener A (no hay regresión y la insignia "2" del header de Figma indica que el carrito del header es el feedback persistente) y pedir el frame desktop a diseño; no inventar la variante B.

---

## 6. Aviso de envío en la hoja `45:1607` cuando el producto es el primero de su negocio

### a) Qué muestra Figma
Hoja `45:1607`, tarjeta de aviso `45:1626` (358 x 52, y 158 dentro de la hoja, fondo `#E9F7F0`): "Paquete de Casa Luna 506 · el envío ya lo pagás en este paquete, este producto no suma otro envío." (`45:1631`). El contenido de la hoja es coherente con ese caso: "Tu pedido · 2 productos ₡29.400" = Auriculares ₡11.900 + Sofá ₡17.500, ambos de Casa Luna 506 (el sofá aparece en la ficha desktop `29:2072`). No hay otra variante de la hoja en el archivo. Texto relacionado en el carrito: `37:1602` "Sumá otro producto de Bruma Café: el envío ya está pagado" (bloque "Sumá de la misma tienda"), y reglas de envío por paquete ("Envío (3 paquetes) × ₡4.000", `37:1364`, "Cada tienda despacha su paquete").

### b) Qué hace el código (worktree `chk`)
`HojaAgregadoAlPedido.tsx`: `comparteEnvio = Boolean(negocio) && mismoPaquete.length > 1`, donde `mismoPaquete` son las líneas del carrito (ya con el producto recién agregado) del mismo `empresaId` (o mismo nombre). Con `comparteEnvio` muestra el aviso (copy `comprador.hoja.envioPagado`, idéntico a Figma); si no, lo omite sin reemplazo.

### c) Estado completo o parcial
Figma muestra solo **un** estado (el de otro producto del mismo negocio). El otro estado (primer producto de su negocio) no está dibujado. El texto del aviso afirma "no suma otro envío", lo que para un primer producto sería falso: abre un paquete nuevo con su propio envío (según las reglas de paquetes del carrito en Figma). Por eso omitir el aviso es lo único que no inventa una afirmación falsa, pero no es una decisión de Figma. Efecto visual al omitir: la hoja queda 52 + el hueco más baja que los 328 de Figma (se mide solo en el caso mismo negocio, que es el que sí está respaldado).

### d) Cambio necesario
- Opción A (actual): ninguno.
- Opción B: mostrar un aviso distinto para el primer producto (por ejemplo, reutilizando el texto del carrito "Sumá otro producto de {negocio}: el envío ya está pagado"). Ese texto está en Figma pero en el contexto del carrito; trasladarlo a la hoja sería extrapolar. Cambio chico en `HojaAgregadoAlPedido.tsx` + i18n es/en/pt.
- Opción C: pedir a diseño la variante.
Impacto: solo CHK.

### e) Veredicto
**REQUIERE_DECISION_DEL_USUARIO.** Figma no define el caso. Recomendación: mantener A (omitir) hasta que diseño dibuje la variante; es veraz y no introduce copy nuevo. Si se prefiere un aviso, B es la opción menos inventiva, pero necesita aprobación del texto.

---

## Tabla resumen

| # | Decisión | Veredicto | Cambio necesario | Requiere decisión del usuario |
| --- | --- | --- | --- | --- |
| 1 | Selector de tema fuera de la hoja de accesibilidad | DECISION_RESPALDADA_POR_FIGMA | Ninguno | No |
| 2 | Filtro de color / visión en la hoja | REQUIERE_DECISION_DEL_USUARIO | Ninguno (A) o quitarlo / moverlo a admin (B/C, chico a medio) | Sí. Recomendación: sacarlo de la hoja del comprador (es un simulador y no está en Figma) |
| 3 | Campo de correo del cupón, 26 vs 42 px | DECISION_RESPALDADA_POR_FIGMA (42; el 26 es un frame comprimido) | Ninguno | No |
| 4a | WhatsApp en desktop: esquina | DECISION_RESPALDADA_POR_FIGMA (nota F) | Ninguno | No |
| 4b | WhatsApp en desktop: margen 16 px | REQUIERE_DECISION_DEL_USUARIO (menor) | Ninguno | Sí (menor). Recomendación: dejar 16 |
| 4c | Cookies en desktop: tarjeta abajo a la izquierda a 24 px | REQUIERE_DECISION_DEL_USUARIO (menor); sin evidencia (y no era "lo actual": antes era banda centrada) | Ninguno o 1 línea de clases | Sí (menor). Recomendación: dejar hasta tener frame desktop |
| 5 | Qué pasa tras "Agregar" en desktop | REQUIERE_DECISION_DEL_USUARIO | Ninguno (A) | Sí. Recomendación: mantener toast + "Añadido" + header y pedir frame |
| 6 | Aviso de envío cuando es el primer producto del negocio | REQUIERE_DECISION_DEL_USUARIO | Ninguno (omitir) | Sí. Recomendación: mantener omitido hasta que haya variante dibujada |

## Qué no se pudo verificar

- Alturas reales en la app de las hojas modificadas (sin dev server): la cifra de ~100 a 115 px extra por el filtro de color (decisión 2) es una estimación por conteo de chips, no una medición; la hoja del cupón con el campo a 42 (315 de alto, y 529) es una deducción del auto-layout de Figma y de lo que SYS informó, no una nueva medición.
- Las interacciones de prototipo solo se leyeron por API (58 reacciones). Los botones de cookies, accesibilidad, WhatsApp y los de la ficha desktop no tienen destino documentado distinto al ya citado. La ausencia de una variante en Figma se concluye de nombres de nodos y capturas de los frames citados; no se inspeccionó visualmente cada uno de los 90 frames.
- Si la hoja de Idioma y accesibilidad se abre desde Mi cuenta o el footer (nota E): los frames de Figma no lo dibujan, así que ese acceso es cableado por SHELL/ACC sin referencia visual.
- Comportamiento de `HojaInferior` en desktop (para cookies y hojas): no se probó en navegador; la hoja de preferencias de cookies tiene solo frame móvil.
- No se ejecutó la app ni se leyó el estado del carrito real: la regla `mismoPaquete` se analizó solo por lectura del código y de los textos de Figma. Los 3 casos con tallas, personalización y cotizable que CHK reportó como verificados no se repitieron.
- El estado sin commitear del worktree `chk` (carrito) no se analizó: está fuera del alcance de estas 6 decisiones.
