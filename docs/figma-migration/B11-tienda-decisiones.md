# B11 — Decisiones Figma de tienda

Fecha: 2-oct-2026. Investigación. Sin cambios de tienda, layout, WhatsApp, rutas, CSS ni backend.

B9 y B10 dejaron D01, D20 y D02 como el siguiente grupo. B8 no las contestó. `STORE.md` las tiene en «Decisiones abiertas».

La ausencia de un control en un frame no se toma como instrucción de borrarlo.

## Estado Git

| | |
| --- | --- |
| Branch | `feat/figma/base` |
| HEAD al investigar | `589288dd` |
| Master | `b355fd20` |
| PASS / PARTIAL | 37 / 53 |

## D01 — Barra inferior

### Figma

`29:922` dibuja el perfil móvil (portada, encabezado, buscador, tarjetas, «Cómo comprarle») sin barra inferior. `STORE.md` lo midió a 0–1 px en ese cuerpo.

`51:2468` es el mismo perfil con color de tienda y tampoco dibuja la barra.

`29:1159` (directorio) no tiene barra inferior, y el código tampoco la pone ahí.

No hay otro frame de STORE que dibuje la barra de tres ítems «Catálogo», «Pedido», «HotClick».

### Código actual

`TiendaBottomNav` se monta en `TiendaLayout` en todo `/tienda/:slug/*`. Es `md:hidden`. Los ítems salen de `tiendaBottomNavItems.ts`:

- Catálogo → `/tienda/:slug`
- Pedido → `/tienda/:slug/carrito`, con badge del pedido aislado
- HotClick → `/`

En el perfil móvil el header va con `soloEscritorio`: `TiendaHeader` no se ve. La portada tiene Volver y Compartir, sin ícono de pedido. En ese viewport el tab Pedido es el enlace en pantalla hacia `/tienda/:slug/carrito`.

En producto, carrito y checkout de la tienda el header sí muestra «Pedido de esta tienda», además de la barra.

La barra del marketplace (`nav.hc-bottom-nav`) no se monta en la tienda. `tests/tienda-theme.spec.ts` lo afirma y también exige la barra de la tienda en 375 px.

### Función actual

La barra es la entrada móvil al pedido aislado (`tiendaStore`) desde el perfil. El carrito de la tienda no es `cartStore`.

Quitarla en el perfil, sin otro control, deja sin enlace visible al pedido. El sustituto que nombra `STORE.md` (ícono de pedido junto a Compartir) no está dibujado en `29:922`.

### Evidencia adicional

En subrutas móviles el header ya enlaza al pedido. La dependencia fuerte es el perfil, donde el header está oculto a propósito para que la portada ocupe su lugar.

### Clasificación

DECISIÓN HUMANA

### Conclusión

El cuerpo de `29:922` ya está medido. La barra es un control que el frame no dibuja y que el perfil móvil usa para no perder el pedido aislado. Quitarla iguala el frame y corta esa entrada. Mantenerla deja una diferencia documentada. No hay un tercer dibujo que fije el reemplazo. No es backend. No hay un cambio de UI que cierre D01 sin elegir una de esas dos.

## D20 — WhatsApp

### Figma

`51:2262` es el botón flotante global del Home (HotClick, `50686667888`). No es el de la tienda.

`29:922` y `51:2468` no dibujan un FAB de WhatsApp. El color de `51:2468` ya se aplica (`--t-secondary`, `--t-accent`).

### Código actual

Hay dos mecanismos distintos.

El FAB global (`WhatsAppFab` en `AppChrome`) no se monta en `/tienda/:slug`. `whatsappOculto` lo apaga cuando `esRutaTienda` es verdadero.

El de la tienda es `TiendaWhatsAppFab`: `hidden md:flex`, fijo abajo a la derecha, número `empresa.whatsapp`. Solo desde `md`. En móvil no hay FAB. El contacto móvil es la acción «WhatsApp» dentro de `TiendaEncabezadoNegocio`, en el encabezado del perfil.

`TiendaLayout` monta el FAB de tienda en todas las subrutas. En móvil la barra ocupa el borde inferior (`pb-20` en el main) y el FAB de tienda no está, así que no se solapan. En escritorio la barra de tienda no se ve y el FAB queda en `bottom-4 right-4`. El pie de la tienda no es fijo.

### Mobile

Sin FAB flotante de tienda y sin FAB global. WhatsApp del vendedor en el encabezado del perfil.

### Desktop

FAB del vendedor, no el de HotClick. El frame móvil `29:922` no lo dibuja. No hay frame de escritorio de ese botón.

### Clasificación

DECISIÓN HUMANA

### Conclusión

El color de D20 ya coincide con `51:2468`. Lo que queda es el FAB de escritorio y el enlace móvil del encabezado, que los frames del perfil no dibujan. El FAB global no está en esta ruta: no hay doble botón que corregir con CSS. Quitar el de la tienda apaga el contacto al vendedor. No es un ajuste de la posición de B2. No hay implementación desbloqueada. La fila sigue atada a D01 solo en la barra; el WhatsApp es otro control.

## D02 — Header desktop

### Figma

`29:2308` dibuja el header del marketplace: marca HotClick, buscador, Ingresar, favoritos, carrito con insignia y fila de categorías. Debajo, el cuerpo del perfil está medido a 0–1 px (portada 220, encabezado 164, lateral 320, productos desde x=480).

### Código actual

`/tienda/:slug` no usa `MainLayout` ni `HeaderComprador`. Usa `TiendaLayout` y `TiendaHeader` (`div role="banner"`, fondo `--t-secondary`).

El header muestra el nombre de la tienda, el enlace «Marketplace» hacia `/` y «Pedido de esta tienda» hacia `/tienda/:slug/carrito`. El badge sale de `tiendaStore.totalItems()`. Las tarjetas llaman a `agregarAlCarrito` de ese store. El carrito global (`cartStore`, persistido aparte) no entra en este header.

En el perfil, el banner está oculto bajo `md` y visible desde escritorio. `tests/store-perfil.spec.ts` exige el banner y el enlace «Pedido de esta tienda» a 1440.

### Diferencias

El header visible no es el del frame. El cuerpo debajo del header sí está medido contra `29:2308`.

### Impacto funcional

Sustituir `TiendaHeader` por el header del marketplace cambiaría el destino y el conteo del carrito: el header enlazaría a `/carrito` y contaría `cartStore`, mientras las tarjetas seguirían sumando a `tiendaStore`, salvo que también se rehiciera el pedido aislado, el carrito `/tienda/:slug/carrito` y el checkout de la tienda.

Eso no es un cambio de color ni de spacing. Mezcla dos pedidos.

### Clasificación

DECISIÓN HUMANA

### Conclusión

`29:2308` pide el header del marketplace. El código conserva el de la tienda para no mostrar el carrito global encima de un pedido aislado. Las dos lecturas siguen abiertas. No hay un frame que dibuje el header de tienda que el código usa, ni una instrucción que diga cómo conviven los dos carritos. No es backend. No se desbloquea un reemplazo de header.

## Matriz final

| Decisión | Estado | ¿Implementable? | Motivo |
| --- | --- | --- | --- |
| D01 | DECISIÓN HUMANA | No | `29:922` no dibuja la barra. En el perfil móvil es el enlace al pedido aislado. El frame tampoco dibuja un reemplazo. |
| D20 | DECISIÓN HUMANA | No | El FAB global no está en la tienda. El de la tienda es de escritorio y el contacto móvil está en el encabezado. Esos controles no están en `29:922` ni en `51:2468`. El color ya coincide. |
| D02 | DECISIÓN HUMANA | No | `29:2308` dibuja el header del marketplace. El código usa el header de la tienda y `tiendaStore`. Cambiarlo mezcla dos carritos. |

## Bloque de implementación desbloqueado

Este bloque no desbloquea implementación.

D01, D20 y D02 preguntan si se conservan la barra, el WhatsApp del vendedor y el header del pedido aislado. Los frames del perfil no los dibujan. Quitarlos o sustituirlos cambia el acceso al pedido de la tienda. No hay un diff de UI que cumpla el criterio de implementación sin esa elección.

## Siguiente bloque

Dentro de B8, después de checkout (B10) y tienda (B11), el siguiente par con dos frames en conflicto es Figma-D09 y Figma-D10: el chrome de la gift card (`55:2220`, `55:2284`) frente al paso de pago `29:1344`.

Ese par tampoco está contestado. No queda en B8 una decisión que ya cumpla frame suficiente, código existente, sin backend y sin decisión humana pendiente.
