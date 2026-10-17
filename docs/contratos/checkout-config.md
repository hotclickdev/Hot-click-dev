# Contrato · GET /api/public/checkout-config

- **Auth:** pública. Sin datos sensibles.
```json
{ "contraEntregaNormal": true, "maxUnidadesPorProducto": 3, "pagoPorTienda": false }
```
| Campo | Origen |
|---|---|
| `contraEntregaNormal` | `hotclick.envio.normal.contra-entrega.habilitada` (#159) |
| `maxUnidadesPorProducto` | tope de `GuestCheckoutGuard` (lo valida el backend; excedido → 429) |
| `pagoPorTienda` | `hotclick.checkout.pago-por-tienda`, `false` por defecto. Se enciende cuando ONVO Marketplace cobre un cargo por tienda (S3-17). |

**Pendiente del dueño:** `contraEntregaCargoPorNegocio` no se publica todavía: el monto del cargo no está decidido y el backend no inventa montos.

Errores: ninguno propio (200 siempre).
