# Checkout multivendedor: un pago a HotClick, un paquete por vendedor

## Qué había

- El checkout usaba una sola bodega para todo el pedido (`bodegaId` del request o `1`).
- `Pedido` tenía una sola empresa y bodega, y la billetera acreditaba el total del pedido a esa empresa.
- La encomienda cobraba ₡2.500 fijos.
- `/api/gift-cards/validar` exigía un JWT con empresa: un comprador del marketplace no podía validarla.

## Diseño

**Un checkout crea N subpedidos, uno por bodega de origen, que comparten `grupo_pago`.**

- El subpedido principal es el primero creado, y el `Pago` se asocia a él con el monto total del grupo.
  Así no cambia el esquema de `Pago` ni el de las pasarelas.
- Las pasarelas reciben una copia en memoria del principal con el total del grupo (solo leen número, id y total).
- Todo lo que parte de un pago (confirmar, fallar, expirar, cancelar, comprobante SINPE aprobado, rechazado o
  pendiente) actúa sobre todos los subpedidos del grupo mediante `PedidoGrupoService`.
- Un checkout con productos de una sola bodega sigue creando un solo pedido, con `grupo_pago` igual que el resto.

### Bodega de origen de cada producto

`producto.bodega`, luego `empresa.bodegaVentaOnline` y por último la bodega del request (default `1`, HotClick
coordina la recolección).

### Envío por paquete

El request acepta `envios: [{ bodegaId, metodoEnvio }]`. Si no viene, se usa `metodoEnvio` para todos los paquetes,
lo que mantiene compatibles la tienda por slug, el QR de mesa y los clientes viejos.

- `ENCOMIENDA_PROPIA`: **₡0 en el checkout**. El flete lo cobra la empresa de transporte al retirar.
- `RETIRO_EN_TIENDA`: se valida por paquete, contra la bodega de ese paquete.

### Descuentos

- **Cupón de una empresa:** se aplica solo al paquete de esa empresa. Un cupón global se aplica a cada paquete.
- **Descuento SINPE:** usa el porcentaje de la empresa de cada paquete.
- **Tarjeta de regalo:** es de una empresa, así que se aplica solo al paquete de esa empresa, hasta su total.

### Billetera

Cada subpedido acredita a su empresa. La comisión se calcula sobre `total − envío` y el envío se suma entero al
neto: el vendedor recibe su venta menos la comisión más el envío que pagó.

### Tarjeta de regalo pública

`GET /api/gift-cards/validar` responde sin sesión y dice a qué tienda aplica. Tiene límite de 10 consultas por
minuto por IP.

## Esquema

`V142__pedido_grupo_pago.sql`: columna `grupo_pago VARCHAR(40)` e índice en `hot_click_pedido_tb`.
