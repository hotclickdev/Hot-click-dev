# CHK · Carrito, checkout, pago y hojas

Rama `feat/figma/chk`. Archivo Figma `TmxYFj2nauu10WZnZ0t6yt`. Este documento lo mantiene CHK; INVENTORY y PROGRESS los actualiza el supervisor.

## Hoja "Agregado a tu pedido" `45:1607` (móvil)

Veredicto: PASS reportado por agente (móvil). Desktop: REQUIERE_DECISION.

Componente nuevo: `components/comprador/HojaAgregadoAlPedido.tsx`, sobre `HojaInferior` (velo n/900 opaco, esquinas 22, agarradera 40x4: coincide con `45:1612`).

| Medida (390x844) | Figma | App |
| --- | --- | --- |
| Hoja y / alto | 516 / 328 | 516 / 328 |
| Título "Agregado a tu pedido" y / ancho / alto | 546,5 / 191 / 21 | 546,5 / 190,7 / 21 |
| Nombre y / alto | 606 / 16 | 606 / 16 |
| Precio de la tarjeta y / alto | 612,5 / 19 | 612,5 / 19 |
| Texto del aviso de envío y / alto | 684 / 32 | 684 / 32 |
| Botones y / alto (Seguir, Ver pedido) | 772 / 44, 42 | 772 / 44, 42 |
| Botones ancho | 175, 173 | 175, 173 |
| Fondo del aviso, botón primario | #E9F7F0, #E73B33 | idénticos (medidos en píxeles) |

Diferencias conocidas: ancho del precio Sora 60 vs 58,2 (métricas de fuente, igual que PROD). Para igualar alturas de Sora se fijaron `leading` de 19 y 18 px (Chrome da 20 y 19 con `normal`), y el título lleva `tracking-normal` (el `h2` global aplica -0,02em).

Reglas de contenido (lo que Figma dibuja y lo que no):
- "Tu pedido · N productos" cuenta líneas del carrito; el total suma `precio x cantidad` del carrito.
- El aviso verde de envío ya pagado se muestra solo si el carrito tiene otro producto del mismo negocio (mismo `empresaId`, o mismo nombre si no hay id). Figma solo dibuja ese caso. **El caso "primer producto del paquete" no está dibujado: hoy se omite el aviso. Pendiente de decisión de diseño.**
- Token ausente: `bg-hc-success-bg` no existe como utilidad (SHELL); se usa `bg-[var(--hc-success-bg)]`. Pedir a SHELL el alias `--color-hc-success-bg`.

## Dependencia: cableado desde la ficha (excepción autorizada, archivos de PROD)

Cambio mínimo en archivos de PROD:
- `pages/producto/useProductDetail.ts`: estado `hojaAgregadoAbierta`; en `agregarAlPedido({ conAviso: true })`, si `matchMedia('(max-width: 1023.98px)')` coincide abre la hoja y no muestra el toast; en desktop se conserva el toast y el botón "Añadido". Constante `MEDIA_MOVIL`. Se eliminó código muerto de "Comprar ahora": `handleComprarAhora`, `showSticky` y su `IntersectionObserver`.
- `pages/ProductDetailPage.tsx`: importa y renderiza `<HojaAgregadoAlPedido abierta onCerrar producto cantidad />` al final del `MainLayout`; lee `hojaAgregadoAbierta` y `setHojaAgregadoAbierta` del hook.
- La ficha no se rediseñó. `cartStore.addItem` y la analítica no cambiaron.

## Flujo móvil verificado (Playwright, 390x844, API simulada)

1. Ficha normal con otro producto del mismo negocio en el carrito: Agregar abre la hoja con aviso de envío; "Ver pedido" navega a `/carrito`.
2. "Seguir comprando" cierra la hoja, queda en `/productos/150`, `body.overflow` se restablece y el botón Agregar sigue operativo.
3. Sin carrito previo: la hoja abre sin aviso de envío.
4. Producto con tallas: abre la hoja (Zapatos, Bruma Café, 1 unidad, total del carrito).
5. Personalizado precio fijo: sin notas no agrega (toast de aviso, comportamiento previo); con notas abre la hoja.
6. Cotizable: solo existe "Solicitar encargo" (envía el encargo y navega a `/encargo/:token`); no usa la hoja.
7. Agotado: solo "Agotado" deshabilitado; no hay camino de compra, la ficha mantiene el botón de atrás sobre la foto.
8. Desktop 1440: no abre la hoja; sigue el toast y el header con carrito.

## REQUIERE_DECISION

- Qué debe pasar tras Agregar en desktop: Figma no define hoja ni cajón desktop. Hoy: toast + botón "Añadido" + enlace al carrito del header.
- Aviso de envío cuando el producto es el primero de su negocio (ver arriba).

## Tests

- `tests/pdp-comprar-ahora.spec.ts` se reemplazó por `tests/pdp-agregar-hoja.spec.ts` (Agregar, hoja, Ver pedido a `/carrito` sin pedir cuenta; Seguir comprando). Pasa contra Vite en :3400.
- `tests/ui-sin-emoji.spec.ts`: se retiró la línea de `TitleAndBadges.tsx` (archivo borrado). Ese spec tiene otros 9 casos que ya fallaban en la base por archivos borrados por otras migraciones (home, admin, etc.); no son de CHK.

## Pendiente de CHK

Carrito, checkout (datos, entrega, pago), pago exitoso/fallido, recuperar carrito, despacho del vendedor, estados de pago pendiente y tarjeta de regalo, pantallas `51:1820`, `51:2000` y `45:1692`: sin comparar contra Figma en esta pasada. Claves i18n de `product.*` (`buyNow`, `trust*`, `quantity`, `outOf`, `maxAvailable`) son de PROD: no se borraron.
