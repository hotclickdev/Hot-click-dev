# S2 · Contra entrega por negocio

Rama `feat/contra-entrega-negocio`. Coincide con el contrato que asumió el Frontend en #171 (`contraEntregaApi.ts`), salvo el cargo (ver Pendiente).

## Configuración del negocio (panel)

`GET /api/negocio/contra-entrega` → `{ success, data: { acepta: boolean, minimo: number|null } }`

`PUT /api/negocio/contra-entrega` con cuerpo `{ acepta: boolean, minimo: number|null }` → mismo cuerpo guardado.

- El negocio sale del token. Solo el **propietario**. El personal recibe `403 {success:false, code:"SOLO_PROPIETARIO", message}`, y lo mismo pasa al impersonar. El comprador o una llamada sin token reciben 403/401 (rol EMPRENDEDOR).
- `acepta` faltante o que no sea booleano → `400 ACEPTA_INVALIDO`. No se guarda nada.
- `minimo`: `null`, o un entero > 0 (₡, sin decimales). Si es 0, negativo, decimal, string o > 100.000.000 → `400 MINIMO_INVALIDO`, y no se guarda. El tope es solo de cordura del campo; no es una regla de negocio.
- Con `acepta:false` el mínimo se guarda y se devuelve como `null`.
- Por defecto (filas existentes y negocios nuevos): `acepta:true` y `minimo:null`. Así se mantiene el comportamiento de hoy: manda la config global `hotclick.envio.normal.contra-entrega.habilitada`.

## Productos públicos

Los productos de catálogo, destacados y ficha que traen la tienda (`empresaNombre`/`empresaSlug`) ahora traen también:

- `empresaAceptaContraEntrega: boolean`
- `empresaContraEntregaMinimo: number` (solo si acepta y tiene mínimo)

Si el producto no los trae (producto del negocio principal o de una tienda no pública), el campo **no aparece**: nunca llega como `null`, y el front usa la config global (supuesto 1 de #171).

## Checkout (lo valida el backend, no solo la UI)

El efectivo por Envío Normal (contra entrega, no porque la bodega acepte efectivo) se rechaza si algún negocio del pedido no la acepta o si el subtotal de su paquete (productos, sin envío) no llega a su mínimo:

Cuando el efectivo entra por Envío Normal contra entrega (no porque la bodega acepte efectivo) y el negocio lo rechaza, los dos checkouts responden `400` con código estable y se revierte la transacción:

```json
{ "success": false, "code": "CONTRA_ENTREGA_NO_ACEPTADA", "message": "Este negocio no acepta contra entrega. Pagá con SINPE / Tarjeta.", "data": { "codigo": "CONTRA_ENTREGA_NO_ACEPTADA" } }
```

| `code` (= `data.codigo`) | Cuándo |
| --- | --- |
| `CONTRA_ENTREGA_NO_ACEPTADA` | El negocio tiene `acepta = false`. |
| `CONTRA_ENTREGA_MINIMO` | El negocio acepta, pero el subtotal de su paquete es menor que su `minimo`. |

- Checkout SINPE/EFECTIVO multi-negocio: se revisa paquete por paquete; el primero que falla define el código.
- Tienda pública (`/api/tienda/{slug}` pedido de invitado): mismos códigos.
- Si el efectivo no está permitido por otra razón (ni la bodega lo acepta ni hay Envío Normal contra entrega), sigue el `400` genérico "Algún negocio de tu carrito no acepta efectivo…", sin código.
- Si la bodega acepta efectivo (retiro/pago en bodega), la config de contra entrega no aplica.

## Migración

`V184__empresa_contra_entrega.sql` (aditiva, IF NOT EXISTS):
- `acepta_contra_entrega BOOLEAN NOT NULL DEFAULT TRUE`
- `contra_entrega_minimo_crc INTEGER NULL`, con CHECK `> 0`

## Pendiente (dueño)

- **Cargo de contra entrega por negocio** (`contraEntregaCargoPorNegocio` en `/api/public/checkout-config`, supuesto 3 de #171): **no se implementó**. No hay monto en la config. Exponer un monto que el backend no cobra en el total haría que lo mostrado no coincida con lo cobrado. Hace falta el monto del dueño y el cálculo en el total del backend. Mientras tanto el front no muestra cargo (sin campo = sin monto).
- El texto del aviso de «mínimo» está pendiente de Producto (lo dice el front).
