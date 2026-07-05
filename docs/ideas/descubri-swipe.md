# Descubrí — swipe de productos con cupón

> One-pager de ideación — 2026-07-04. Objetivo: conversión en la misma visita.

## Problema

¿Cómo hacemos que el visitante indeciso de hotclick.lat llegue a productos que le gustan en menos de un minuto, de forma que se sienta una experiencia propia de HOTCLICK y termine comprando en esa visita?

## Dirección recomendada

Una ruta `/descubri`, mobile-first, con tarjetas fullscreen de productos del inventario actual (solo imágenes, sin videos). Deslizar a la derecha guarda en wishlist, a la izquierda descarta; en PC funciona con flechas del teclado y botones. Un score simple en el navegador (categoría + marca + rango de precio de los likes) reordena el mazo en la misma sesión — se siente inteligente sin necesitar ML ni tráfico masivo.

Productos de emprendimientos aparecen mezclados con badge "De [nombre]" y enlazan a su `/tienda/{slug}` (sin checkout cruzado — el aislamiento por tenant se respeta).

Al décimo swipe o al juntar 3 guardados, pantalla de cierre: "Ver mis elegidos" + cupón de descuento válido hoy.

**Jugada SaaS futura:** "aparecer en Descubrí" puede venderse como beneficio de los planes pagos de los emprendimientos — potencia sus ventas y monetiza la vitrina.

## Supuestos a validar (antes de escribir código)

- [ ] Las fotos del inventario se ven bien fullscreen — auditar las 30-50 mejores
- [ ] Hay suficiente catálogo activo (mínimo ~30 productos con foto) para que el mazo respire
- [ ] GA4 está configurado y reportando (`src/utils/ga4.js` ya existe) — mirar los números una semana
- [ ] El % del cupón no come el margen del outlet — decidir monto (o usar envío gratis como premio)

## Alcance del MVP

- Ruta `/descubri` + entrada visible: banner en HomePage y botón en ProductsPage
- Datos del catálogo público existente; scoring en el cliente, sin backend nuevo
- Like → `wishlistStore` existente; "Ver mis elegidos" → wishlist/carrito
- Cupón pre-creado en AdminCupones que se revela al final (personalizado por categoría queda para fase 2)
- Tarjetas de emprendimientos con badge → link a su tienda (si tienen productos cargados)
- Eventos GA4: `descubri_inicio`, `descubri_like`, `descubri_descarte`, `descubri_cupon`, `descubri_comprar`
- Íconos SVG minimalistas, sin emojis (convención del proyecto)

## No haremos (todavía)

- **Videos / feed TikTok** — no hay contenido; cuando existan videos, `Producto.video_url` ya existe y se integran al mismo formato
- **ML o "IA en tiempo real"** — sin volumen de datos es teatro; el scoring por reglas da el mismo efecto percibido
- **Quiz asesor** — buena idea, fase 2; puede ser la puerta de entrada al mazo
- **Checkout cruzado de emprendimientos** — rompe el aislamiento por tenant; badge + link a su tienda es suficiente
- **Cupón generado dinámicamente por usuario** — requiere backend nuevo; un código pre-creado valida la idea igual

## Preguntas abiertas

- ¿Qué premio al final: % de descuento, monto fijo en ₡, o envío gratis?
- ¿Los emprendimientos aparecen gratis al inicio y luego se vuelve beneficio de plan pago?
- ¿Nombre público de la experiencia? ("Descubrí", "HotSwipe", "Modo Outlet"…)

## Fases posteriores (si el MVP valida)

1. **Fase 2:** quiz corto de 2 preguntas como puerta de entrada que pre-filtra el mazo; cupón personalizado por categoría top del usuario
2. **Fase 3:** videos en las tarjetas cuando exista contenido grabado; medición de watch-time
3. **Fase SaaS:** mazo `Descubrí` embebible por tienda `/tienda/{slug}` + aparición en el mazo principal como feature de plan pago
