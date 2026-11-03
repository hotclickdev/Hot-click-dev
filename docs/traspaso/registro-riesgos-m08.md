# Registro de riesgos: M-08 (sobreventa post-cobro) y M-08b

Fecha: 27-oct-2026 (CR). Origen: PR #368 (`fix/m08-sobreventa-post-cobro`) y PR #370 (`fix/m08b-personalizado-checkout-sin-stock`).
Dueño del registro: HotClick Bugs. Entradas confirmadas por escrito por HotClick Seguridad (APTO sobre `e86ecb1ec` en #368 y `de152d6ca` en #370) y avaladas por el Mentor. El gate SCALE1 se omite con el label `skip-scale-gate` en ambos PRs (salida prevista por CI/CD).

## Falsos positivos del gate SCALE1

| ID | Archivo:línea | Qué marca el gate | Por qué es falso positivo | Límite |
| --- | --- | --- | --- | --- |
| SCALE1-FP-1 | `PaymentOrderConfirmationService:123` | `pedidoRepository.saveAll(grupo)` junto a un loop | Está fuera del `for` (líneas 117-122), corre una sola vez y en lote (`batch_size=20`). El grupo se carga con una sola query. | El tamaño del grupo es la cantidad de bodegas de origen del checkout. Es un límite implícito, no un tope duro. |
| SCALE1-FP-2 | `PaymentOrderConfirmationService:126` | `pagoRepository.save(pago)` junto a un loop | Es un único save, fuera del loop. | Una fila por llamada. |
| SCALE1-FP-3 | `StockReservationService:84` (#370) | `productoRepository.save(p)` por ítem | Ya existía antes del PR; #370 solo cambió la indentación. Un save por ítem del checkout bajo `PESSIMISTIC_WRITE`. | Tamaño del carrito. |

## Hallazgos abiertos

| Severidad | Dónde | Hallazgo | Acción |
| --- | --- | --- | --- |
| BAJO | `StockReservationService.liberarReservas` (:197, #370) | Salta los productos personalizados. Las reservas de personalizados creadas antes del deploy podrían dejar `stockReservado` desfasado. | Correr una query de control al desplegar y corregir los desfases que aparezcan. |
| INFO | `PaymentCheckoutRequest.items` | No tiene `@Size(max)`. | Agregar un tope en un PR aparte. |

## Pendiente de decisión
- Subir el tope implícito de SCALE1-FP-1 a un tope duro (validar bodegas de origen por checkout) si el negocio llega a grupos grandes.
