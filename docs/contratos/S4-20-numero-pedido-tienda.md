# Contrato S4-20 · Número de pedido propio de cada tienda

No hay endpoint nuevo. Se agrega el campo **`numeroTienda`** (entero, `null` en pedidos anteriores a V182) a las respuestas que ya traen el pedido.

| Método | Ruta | Auth/rol | Campo nuevo |
|---|---|---|---|
| GET | `/api/pedidos/{id}` | vendedor de la tienda del pedido, comprador dueño o ADMIN (sin cambios en el guard) | `data.numeroTienda` |
| GET | `/api/admin/dashboard` | vendedor de la tienda (scope del negocio) o ADMIN | `data.ultimoPedido.numeroTienda` |
| Cualquier respuesta que serializa la entidad `Pedido` | | igual que hoy | `numeroTienda` |

### Reglas
- Cada tienda numera desde 1, sin huecos visibles por otras tiendas; dos tiendas pueden tener el pedido 1.
- Lo asigna el backend al crear el pedido (checkout, tienda propia, POS, QR, manual). El cliente no lo puede fijar.
- Los pedidos viejos conservan `numeroPedido` y quedan con `numeroTienda: null`.

### Qué mostrar en el front
- Si `numeroTienda` no es `null`: «Pedido #<numeroTienda>».
- Si es `null`: seguir mostrando `numeroPedido` (pedidos viejos).
- No mostrar `id` en pantalla.

### Ejemplo (fragmento de `GET /api/pedidos/{id}`)
```json
{ "success": true, "data": { "id": 4821, "numeroPedido": "ORD-20261016-AB12", "numeroTienda": 37, "estadoPedido": "PENDIENTE" } }
```

### Errores (sin cambios)
| Código | Cuándo |
|---|---|
| 401 | sin token |
| 403 | pedido de otra tienda |
| 404 | pedido inexistente |
