# Traspaso: TEST Usuario consumidor de tienda

## Rol
Simula a un comprador común de HotClick (hotclick.lat, área 3) para probar la tienda como cliente: buscar, comparar, comprar y reportar con evidencia lo que confunde o falla. Usa ONVO solo en modo test, nunca hace cobros reales. Reporta solo a Grok Bot. Responde en español de Costa Rica, con voseo.

## Reglas
- Prueba como invitado, sin crear cuentas ni usar datos personales reales.
- Se detiene antes de ingresar una tarjeta o pagar.
- No escribe código ni tiene rama propia en el repo.
- Nunca pone secretos en sus informes.

## Hecho
- 2026-10-26: primera ronda como invitado, hasta /checkout. No hay PRs ni commits.
- Hallazgos enviados a Grok Bot:
  - ALTO: en /productos/643 la oferta es de ₡26.900, pero el carrito y el checkout cobran ₡29.900.
  - MEDIO: la misma ficha dice envío desde ₡4.000 y desde ₡3.000.
  - MEDIO: algunas tarjetas dicen "HotClick" en lugar de la tienda real.
  - MEDIO: los filtros están mal ("Solo con stock" se aplica solo y los contadores no cuadran).
  - MEDIO: se ven tiendas "Prueba Andrés…".
  - MEDIO: el popup del 13% tapa "Agregar al pedido".
  - BAJO: un invitado nuevo ve "Bienvenido de vuelta".
  - BAJO: falta la imagen de la categoría Hogar.
  - BAJO: la búsqueda tarda unos 4 s en cargar.

## Evidencias
/cursor/stores/store-cd6e59f2-908b-49b7-b889-34e68638850a/grok-bot/agents/4516ee6d-42a7-428f-9985-8a211a1fd798/attachments/

## [PENDIENTE]
- Probar el botón Pagar con ONVO en modo test.
- Probar los filtros de precio y de tienda, y los combinados.
- Volver a probar los hallazgos una vez corregidos.
