# Hot Click: manual de marca Figma (obligatorio)

Este es el manual de marca de Hot Click. Todo lo nuevo o rediseñado sigue el diseño de Figma sin desviarse. No hay excepciones con diseños anteriores: el diseño de visitante previo al 2-oct-2026 quedó eliminado.

## Fuentes de verdad (en este orden)
1. **Figma**: archivo `TmxYFj2nauu10WZnZ0t6yt`, página `4:2`, [Figma Hot Click](https://www.figma.com/design/TmxYFj2nauu10WZnZ0t6yt/Sin-t%C3%ADtulo?node-id=4-2). Conector `user-Figma`, solo lectura. Antes de `get_design_context`, leé la skill `figma-design-to-code`.
2. **Imagen aprobada por el usuario** (2-oct-2026, "excelente, es el diseño que buscaba"): [`ficha-video.png`](ficha-video.png) en esta carpeta. Su HTML/CSS fuente con los valores exactos está en [`fuente/index.html`](fuente/index.html) (con sus imágenes en `fuente/a/`; `fuente/render.py` regenera el PNG). Copia de trabajo en `/workspace/figma-audit/mockups/`.
3. Componentes y tokens que ya existen en el repo, reutilizados antes de crear nada.

## Reglas
1. **Partí siempre de la plantilla de Figma.** Antes de implementar cualquier página, sección o componente, buscá en Figma el frame o patrón más parecido y armá el diseño a partir de él. No se diseña desde cero ni se reutiliza el estilo viejo.
2. **Lo que Figma no tiene se deriva de Figma.** Si falta una pantalla, un paso intermedio (A→C sin B) o un estado (vacío, error, carga, modal, toast), componelo con los patrones, tokens y componentes de Figma y de la imagen aprobada. Documentá de qué frame se derivó.
3. **Todo rediseño se tiene que ver como la imagen aprobada:** moderno, limpio, con tarjetas claras, el mismo ritmo de espaciado y los mismos controles.
4. **No se viola el manual.** Nada de degradados, sombras pesadas, colores, tipografías o radios fuera de los tokens. Tampoco banners flotantes ni elementos que Figma no tenga.
5. **Al eliminar algo del diseño viejo, se registra** en `docs/figma-migration/ELIMINADOS_VISITANTE.md`: qué era, dónde estaba, qué hacía, el commit y si podría hacer falta. Así se puede recuperar.
6. **Roles:** el trabajo de visitante no toca los paneles de emprendedor, administrador, Pyme ni Negocio Plus, salvo que el usuario lo autorice explícitamente.
7. **Contacto directo del vendedor (regla de negocio, 3-oct-2026).** El visitante **no** ve canales que permitan vender por fuera de HotClick (WhatsApp, Instagram u otras redes, teléfono, correo, sitio web externo) de tiendas con plan **EMPRENDEDOR** (o sin plan): esa venta pierde la comisión. Solo **PYME** y **NEGOCIO_PLUS** pueden mostrarlos. Lo decide el backend (`ContactoPublicoPolicy` / `ContactoPublicoService`, campo `contactoDirecto` en `/api/tienda/{slug}` y `/api/public/branding`); el frontend nunca lo infiere. En la UI se dibuja un botón de contacto solo si **hay dato y `contactoDirecto === true`** (`contactoVisible()` en `pages/tienda/tiendaHelpers.ts`). Para emprendedores, cualquier "contactar" lleva a la plataforma (soporte de HotClick, Mis pedidos), nunca al vendedor. El botón flotante, el chat y las páginas de ayuda usan el WhatsApp de HotClick (`50686667888`).

## Tokens (tomados de Figma y de la imagen aprobada)
- **Tipografía:** Sora para títulos y precios (700–800; título de ficha 22/28, sección 17, precio 26/800). Public Sans para el resto (texto 14/21, secundario 12–13).
- **Neutros:** `#FFFFFF`, n50 `#F8F9FB`, n100 `#F1F3F6`, n200 `#E4E7EC` (bordes), n400 `#9AA1AE`, n500 `#6E7682`, n600 `#4D5560`, n900 `#14171C` (texto).
- **Azul (acentos, links, selección):** b50 `#EFF4FE`, b100 `#DEE9FC`, b600 `#1747A8`.
- **Acción principal:** rojo `#E73B33`, para botones primarios, el botón agregar y el play.
- **Éxito o stock:** `#178A50`.
- **Radios:** 12 en botones e inputs, 14 en tarjetas, 16 en bloques destacados, 999 en chips y pills, 28 en el marco del móvil.
- **Espaciado:** márgenes laterales de 16, separaciones de 8, 10 y 12 entre elementos, padding de tarjeta de 12–14.
- **Bordes y sombras:** borde de 1px en n200. Sombras mínimas: `0 1px 3px rgba(20,23,28,.12)` para lo seleccionado, `0 2px 6px rgba(0,0,0,.1)` para botones flotantes redondos.
- **Controles:**
  - chips pill con borde b100 y texto b600;
  - control segmentado: fondo n100, radio 12, padding 4 y opción activa blanca con texto b600;
  - botón primario rojo de alto 48 con texto blanco 600/15; botón secundario con borde n200;
  - input enfocado con borde b600 de 1.5px y halo b100 de 3px.

## Patrón aprobado: Video del producto (ficha)
- Va entre **Opiniones** y **"También te puede gustar"**.
- **Solo aparece si el producto tiene video.** Nunca se muestra una caja vacía o negra.
- Contenido:
  - título "Video del producto" en Sora 17/700, con "Publicado por {tienda}" abajo;
  - control segmentado YouTube, Instagram, TikTok y Otra red (ícono arriba y nombre abajo);
  - tarjeta 16:9 (9:16 para Reels, Shorts y TikTok) con miniatura, play rojo de 60px al centro, badge de plataforma y duración;
  - línea final con "Ver en {plataforma} ↗" y "Se reproduce aquí mismo".
- El embed se carga en diferido. La plataforma se detecta por la URL y "Otra red" acepta enlace o `<iframe>`.
- El formulario del vendedor (plataforma, enlace o embed, "Guardar video") es del panel de emprendedor. Solo se implementa con autorización.

## Flujo para crear o rediseñar algo
1. Leé este manual y abrí la imagen aprobada.
2. Ubicá en Figma el frame o patrón base. Usá `get_metadata` y `get_screenshot` por sección, que es barato, y `get_design_context` solo para lo que se implementa.
3. Reutilizá los componentes y tokens del repo. Si falta un token, agregalo al sistema y no lo dejes como valor suelto.
4. Implementá y capturá con Playwright a 390px y 1440px.
5. Compará lado a lado con Figma o con la imagen aprobada e iterá hasta que la estructura y el estilo coincidan.
6. Registrá lo derivado y lo eliminado. Hacé un commit local por bloque y no hagas push, merge ni deploy sin el OK del usuario (ver la skill `hot-click-dev-workflow`).

## Checklist antes de dar algo por terminado
- [ ] Parte de un frame o patrón de Figma (anotá cuál).
- [ ] Solo usa los tokens de arriba: sin hex sueltos, degradados ni fuentes extra.
- [ ] Tiene los estados vacío, error y carga en el mismo estilo.
- [ ] Probado en móvil 390 y escritorio 1440, comparado lado a lado.
- [ ] Lo eliminado quedó registrado en `ELIMINADOS_VISITANTE.md`.
- [ ] No tocó paneles de otros roles sin autorización.
- [ ] Ningún contacto directo del vendedor (WhatsApp, redes, teléfono, correo, web) sin `contactoDirecto` del backend (solo PYME y NEGOCIO_PLUS).
