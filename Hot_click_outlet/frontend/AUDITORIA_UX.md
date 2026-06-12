# Auditoría UX/UI y propuesta de sistema visual unificado

**Fecha:** 11 junio 2026 · **Alcance:** frontend completo (tienda + admin) · **Referencias:** Brand Book HotClick v1.1 + dirección visual de Mercurio.pdf

> Principio rector de este documento: cada cambio se justifica por claridad, consistencia o valor de negocio — no por estética. La dirección de Mercurio se adopta en **estructura y densidad**, nunca en su paleta: los colores siguen siendo los del Brand Book (rojo actúa, azul confía, neutros trabajan).

---

## 1 · Auditoría de inconsistencias (sobre el código real)

### 1.1 Componentes duplicados — el producto no es un sistema único

| Hallazgo | Evidencia | Impacto |
|---|---|---|
| **Dos botones flotantes de WhatsApp** montados a la vez | `WhatsAppFab` (App.jsx, global) + `WhatsAppButton` (MainLayout) | Dos botones verdes superpuestos en la tienda. **Corregido hoy**: consolidado en `WhatsAppFab` con spec §15.4 (56/48px, oculto en /checkout y /pago). |
| **Tres sistemas de botón** conviviendo | `components/ui/Button.jsx` · clases `.hc-btn*` de index.css · botones con `style={{...}}` inline (Footer CTA, ServiciosHot, POS…) | El mismo "botón primario" se ve distinto según la página. Imposible garantizar "un solo rojo por vista" si cada página fabrica el suyo. |
| **Dos sistemas de badge** | `components/ui/Badge.jsx` (variants propios) · `.hc-badge` CSS · pills inline ad-hoc en ~20 páginas | Los estados (Pagado/Enviado/Cancelado) no se leen igual en MisPedidos, AdminOrders y emails. |
| **Cuatro asistentes/chat** | `ChatWidget`, `ShoppingAssistantWidget`, `HomeChatBar`, `ProductsAssistantPanel` | Cuatro UIs distintas para "hablar con HotClick". Solo `ProductsAssistantPanel` está montado; el resto es código muerto o semi-muerto que igual hay que mantener. |
| **Dos tarjetas de producto** | `ProductCard.jsx` (catálogo) vs `DealCard` local en ProductsPage (Ofertas) | La misma entidad (producto) tiene dos representaciones con radios, precios y jerarquías distintas. |

### 1.2 Desviaciones del Brand Book

| Hallazgo | Evidencia | Spec del manual |
|---|---|---|
| **Toasts arriba-derecha** | `Toast.jsx:24` → `fixed top-4 right-4` | Cap. 7.5: esquina **inferior izquierda**, 5 s, errores persisten. |
| **Tarjeta de producto fuera de spec** | `ProductCard.jsx`: imagen `h-36 sm:h-48` (no 1:1), radio `rounded-2xl` (16px), sin rating ni beneficio de envío, precio sin Sora 700 | Cap. 7 / §5.3: foto **1:1**, radio **12px**, nombre máx 2 líneas, **precio Sora 700**, prueba social + beneficio de envío. La etiqueta HOT/-% es el único rojo de la tarjeta. |
| **Hero de Home no es el hero de campaña** | HomePage: hero claro de 82vh con buscador AI y watermark | §5.3/15.5: hero de campaña sobre **azul 900** con promesa Sora 800 y CTA rojo único. El hero actual es la principal causa del "se siente vacío y sin marca". |
| **Catálogo sin rail de filtros** | ProductsPage: barra sticky + dropdown "Filtros" | §5.6: filtros en **rail izquierdo 240px** (sheet en móvil), orden visible, paginación numerada. |
| **Capas flotantes móviles compiten** | BottomNav + FAB WhatsApp + sticky CTA de producto | §15.4: WhatsApp **nunca tapa el CTA**. Hoy el FAB convive con el sticky CTA en detalle de producto (verificar solape en ≤375px). |

### 1.3 Espaciado y jerarquía — por qué "sobra blanco"

- **Cinco ritmos verticales distintos en una sola página**: HomePage usa `py-5/8`, `py-6/10`, `py-4/8`, `py-6/12`, `py-5/10`, `py-8/16` según la sección (líneas 138–962). No hay escala: cada sección "respira" diferente y el ojo no encuentra patrón.
- **El blanco no sobra: falta contenido anclado al color.** Tras la migración se neutralizó casi todo (correcto contra el naranja viejo), pero quedó **~95% neutro** cuando el manual prescribe la proporción **62% neutros · 20% texto · 10% azul · 6% rojo · 2% semánticos** (cap. 3.5). El azul guía (chips, iconos de sección, franjas informativas) prácticamente desapareció de la tienda.
- **37 títulos con 4 tamaños distintos** (`text-2xl`→`text-5xl`) en 7 páginas de tienda, sin patrón de sección. Mercurio resuelve esto con UNA receta: *título Sora fuerte terminado en punto + subtítulo gris inline + link "Ver más >" a la derecha*.
- **Reliquias del diseño anterior**: `hc-glass-card` (blur/glass) convive con tarjetas planas del manual → dos lenguajes en la misma vista (testimonios vs productos).

### 1.4 Lo que Mercurio hace y HotClick hoy no (gaps de estructura)

1. **Franja de confianza bajo el hero** (4 ítems con icono: disponibilidad · comunidad · quiénes somos · entrega). HotClick tiene una sección "features" pero enterrada a mitad de página y sin iconografía de color.
2. **Categorías como vitrina** (círculos con foto real de producto + nombre, primera sección tras el hero). HotClick tiene `CategoryBrowse` pero más abajo y con menos peso visual.
3. **Banners promocionales intermedios** ("Recomendados para vos") que rompen la monotonía del grid. HotClick no tiene ninguno entre secciones.
4. **"Vender es fácil" en 4 pasos con fotos humanas** sobre fondo distinto. HotClick tiene "Cómo comprar" con iconos pero sin franja diferenciada ni calidez.
5. **Testimonios como tarjetas con foto + nombre/ubicación** (prueba social concreta). HotClick los tiene en glass-cards genéricas.
6. **Sección editorial "Descubrí más"** (blog) en Home. Existe BlogPage pero no se promociona en Home.
7. **Footer con sellos**: métodos de pago aceptados + logos de aliados. El Footer actual no muestra ni SINPE/Visa/MC ni los convenios.

---

## 2 · Lista priorizada de problemas UX/UI

**P0 — rompen la comprensión o la spec (esta semana)**
1. ~~FAB de WhatsApp duplicado~~ ✔ corregido en esta auditoría.
2. Toasts arriba-derecha → mover abajo-izquierda (tapan el carrito/navbar y contradicen el manual).
3. Tarjeta de producto: llevar a spec (1:1, radio 12, precio Sora 700, beneficio de envío) y **eliminar DealCard** usando ProductCard con prop `variant="oferta"`. *Justificación: la tarjeta es el componente más visto del marketplace; su inconsistencia es la mayor fuente de "no parece un sistema".*
4. Crear componente `Section` (header + ritmo) y aplicarlo en Home. *Justificación: resuelve de raíz "espacios vacíos + jerarquía perdida" con un solo patrón.*

**P1 — recuperan identidad y dinamismo (próximas 2 semanas)**
5. Hero de campaña azul 900 en Home (promesa + CTA rojo + foto producto), reemplazando el hero 82vh.
6. Franja de confianza (4 beneficios con icono azul) bajo el hero.
7. Categorías como vitrina circular con foto, primera sección.
8. Banners promocionales reutilizables (azul 900 / blanco alternados — nunca dos rojos seguidos, cap. 11).
9. Rail de filtros 240px en /productos + paginación numerada + breadcrumb.
10. Footer: fila "Aceptamos" (SINPE · Visa · Mastercard) + logos de convenios.

**P2 — consolidación de sistema (mes)**
11. Unificar Button/Badge/Input: las páginas consumen SOLO los componentes compartidos; prohibir botones inline por lint rule o revisión.
12. Retirar `hc-glass-card` y demás reliquias (testimonios → tarjeta del manual con foto).
13. Dashboard admin según cap. 6: nav oscura n-900 con ítem activo rojo, KPIs Sora 700 con comparativa ▲▼, tablas `tabular-nums` alineadas a la derecha.
14. Consolidar los 4 asistentes en uno (o borrar los no montados).
15. Auditoría AA final (cap. 9) como definition of done.

---

## 3 · Propuesta de sistema visual unificado

### 3.1 Receta de sección (el patrón que falta)

Un único componente `Section` usado en TODA la tienda:

```
<Section
  title="Elegí una categoría."        ← Sora 700 · 28px (24 móvil) · n-900 · termina en punto
  subtitle="Lo tico se apoya."        ← Public Sans 400 · 15px · n-600 · inline tras el título
  action={{ label: 'Ver todas', to }} ← link azul 600 con chevron, alineado derecha
/>
```

- **Ritmo vertical único**: `py-10 sm:py-14` entre secciones (escala 4px: 40/56). Cero variantes por página.
- **Fondos alternados para guiar el ojo** (esto reemplaza el "blanco infinito"): `bg` → `surface` → `bg` → franja azul 50 (`--hc-blue-50`) para secciones de confianza/vender → azul 900 para campaña. El color de fondo pasa a ser información ("cambié de tema"), no decoración.

### 3.2 Dónde vuelve el color (sin romper "un rojo por vista")

| Elemento | Color | Por qué |
|---|---|---|
| Iconos de sección, chips de categoría activos, links "Ver más" | Azul 600 / fondo azul 50 | El azul es el color de navegación y confianza del manual; hoy casi no existe en la tienda. Devuelve orientación sin gastar el rojo. |
| Etiquetas HOT / -% / contador de carrito | Rojo 500 | Únicos rojos permitidos dentro de tarjetas (cap. 3.5). |
| CTA principal de la vista | Rojo 500 | Ya implementado (`hc-btn-primary`). Sigue siendo uno por vista. |
| Franjas de campaña y heros | Azul 900 | Identidad de campaña del manual (§5.3, cap. 11). Es lo que da sensación de "marketplace vivo" sin saturar. |
| Estados | Semánticos 4 (verde/ámbar/rojo/azul) con punto + texto | Ya en tokens; falta que TODOS los badges los consuman vía `Badge.jsx`. |

### 3.3 Espaciado y radios (cerrar la escala)

- Secciones `40/56px` · tarjetas padding `16px` · gutters de grid `16px` (móvil) / `24px` (desktop) · contenedor máx `1280px`. Todo lo demás es error de revisión (cap. 13.2).
- Radios: botones/inputs **10**, imágenes de producto **12**, tarjetas/modales **16**, pills **full**. ProductCard hoy usa 16 → pasa a 12 en imagen y 16 en tarjeta contenedora según §5.2.

### 3.4 Jerarquía tipográfica (3 niveles por vista, no más)

1. **H1/Hero** Sora 800 38–48px (solo uno por página).
2. **Título de sección** Sora 700 28px con punto final (receta 3.1).
3. **Cuerpo/UI** Public Sans 14–16. Precios SIEMPRE Sora 700. Datos (SKU, #orden) IBM Plex Mono.

Nunca más de dos niveles de título visibles a la vez (cap. 4.3) — hoy Home muestra cuatro.

---

## 4 · Propuesta por pantalla (estructura Mercurio × tokens HotClick)

### 4.1 Home `/`
Orden de secciones (de arriba a abajo):
1. **Hero campaña** — azul 900, promesa Sora 800 en dos líneas (blanco + última frase `#F0524A`), subcopy azul 200, CTA rojo «Ver ofertas», foto/bodegón de productos a la derecha. *Reemplaza el hero 82vh: misma altura ~420px, el doble de información.*
2. **Franja de confianza** — 4 ítems icono azul + título n-900 + sub n-600: «Estamos disponibles · Escribinos al WhatsApp», «Unite a la comunidad», «Pagá con SINPE sin comisión», «Envío a todo CR en 1–5 días». *Datos reales, no inventados.*
3. **Elegí una categoría.** — círculos 96px con foto de producto real (primera de cada categoría) + nombre; fila scrolleable en móvil.
4. **Lo más nuevo.** — grid 4/3/2 de ProductCard (ya existe la data).
5. **Banner promocional** — azul 900, un beneficio, un CTA.
6. **Ofertas HOT** — grid con etiquetas rojas (la vista actual de ofertas se enlaza aquí).
7. **Vender en HotClick es fácil.** — franja azul 50, 4 pasos (Publicá → Vendé → Enviá → Recibí) con foto/emoji + texto voseo.
8. **Opiniones que hablan por sí solas.** — tarjetas del manual (borde, radio 16, sin glass) con foto, nombre y provincia.
9. **Descubrí más.** — 4 tarjetas de blog.
10. Footer + fila «Aceptamos» y convenios.

### 4.2 Categorías / Catálogo `/productos`
- Breadcrumb desde categoría (§7.4) + título de sección con conteo.
- **Rail izquierdo 240px** (desktop): categoría, marca, precio, condición — los filtros actuales del dropdown, reubicados. En móvil: sheet (ya casi existe).
- Chips de categoría con icono arriba (patrón Mercurio nav). Orden visible (select "Ordenar por").
- Paginación numerada (no scroll infinito en desktop, §5.6).
- ProductCard con sello de emprendedor cuando el DTO exponga verificación (pendiente backend).

### 4.3 Producto `/productos/:id`
- Galería 1:1/5:4 izquierda + **columna de compra sticky** derecha (ya existe parcial).
- Jerarquía exacta §5.4: badge categoría azul → título Sora → rating + «Vendido por» → precio Sora 800 + tachado + badge -% → beneficio envío verde → cantidad + «Comprar ahora» rojo lg → «Agregar al carrito» secundario azul → fila de confianza (protección, devolución, garantía).

### 4.4 Checkout `/checkout`
- Ya cumple: una vista, SINPE primero con «Sin comisión», seleccionado azul + `#EFF4FE`.
- Falta: **el botón final repite el monto** («Pagá ₡42.500» — ya está «Confirmar SINPE · ₡X», unificar al patrón «Pagá ₡X»), stepper visual Carrito ✓ → Pago ● → Confirmación, y nota «Pago cifrado · Protección al comprador» al pie.

### 4.5 Dashboard `/admin`
- Nav lateral **oscura n-900** con ítem activo rojo (inset 2px) — hoy es superficie clara.
- Saludo + KPIs: máximo 4 por fila, cifra Sora 700, **comparativa siempre** (▲ 12.4% vs período); sin comparativa no es un KPI (cap. 6.2).
- Tablas: encabezado uppercase 10.5px sticky, números a la derecha con `tabular-nums`, acciones en menú ⋯.
- Gráficos: azul por defecto, rojo solo para "hoy"/críticos. Verde/ámbar solo semánticos.

---

## 5 · Plan de implementación (PRs en orden, cada uno shippeable)

| PR | Alcance | Esfuerzo | Resultado visible |
|---|---|---|---|
| **PR-1 · Fundación de sistema** | Componente `Section` + ritmo 40/56 · Toast abajo-izquierda · ProductCard a spec + variant oferta (borrar DealCard) | M | Toda página que use Section queda alineada; tarjetas idénticas en todo el sitio. |
| **PR-2 · Home viva** | Secciones 1–9 del §4.1 con datos existentes | L | La página más vista recupera marca, color y densidad comercial. |
| **PR-3 · Catálogo** | Rail filtros 240px + breadcrumb + paginación + chips | M | Descubrimiento de producto más rápido; spec §5.6 completa. |
| **PR-4 · Producto + Checkout** | Jerarquía §5.4 · «Pagá ₡X» + stepper + nota de cifrado | M | Embudo de compra consistente de punta a punta. |
| **PR-5 · Dashboard** | Nav oscura, KPIs con comparativa, tablas tabular-nums | M | El admin se siente "de la casa" (cap. 6). |
| **PR-6 · Consolidación** | Un solo Button/Badge/Input · retirar glass/asistentes muertos · auditoría AA cap. 9 | L | Cero duplicados; definition of done de accesibilidad. |

**Criterio de salida por PR** (del manual, §15.6): cero valores fuera de tokens en lo tocado · contraste AA verificado · copy en voseo revisado contra cap. 10/15.3 · `pnpm build` verde.

---

## 6 · Qué NO hacer (acordado con la dirección de marca)

- **No copiar la paleta de Mercurio** (índigo/lila): violaría el Brand Book. Lo que se adopta es su densidad, sus patrones de sección y su calidez editorial.
- **No volver a gradientes/glow/glass**: la riqueza visual vuelve por *color con significado* (franjas, chips, etiquetas), no por efectos.
- **No multiplicar rojos**: el dinamismo viene del azul (navegación/franjas) y de la densidad de contenido; el rojo sigue reservado al CTA y a las etiquetas HOT.
