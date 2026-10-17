# Contrato S4-19 · Pedido con correo ya registrado

No hay endpoint nuevo ni campo nuevo: la respuesta del checkout es **idéntica** tenga o no cuenta el correo (Seguridad: no revelar a terceros si el correo existe).

| Método | Ruta | Auth | Cambio |
|---|---|---|---|
| POST | `/api/tienda/{slug}/pedidos` | anónimo o con sesión | ninguno en la respuesta |
| POST | checkout del marketplace (`/api/payments/...` invitado) | anónimo o con sesión | ninguno en la respuesta |

### Comportamiento
- El pedido de invitado con un correo que ya tiene cuenta **se crea igual** (no se bloquea) y queda en esa cuenta: aparece en «Mis pedidos» cuando la persona inicia sesión.
- El aviso de iniciar sesión va **solo dentro del correo de confirmación**, que recibe el dueño de la casilla: «Este correo ya tiene cuenta en HotClick: iniciá sesión para ver esta compra en «Mis pedidos»», con enlace a `/login?redirect=%2Fmis-pedidos`.
- Cuentas invitadas (`GUEST-…`) no reciben ese aviso.

### Qué hace el front
- En la confirmación del checkout de invitado, mostrar **siempre** (sin preguntar al backend) un texto neutro, por ejemplo: «¿Ya tenés cuenta? Iniciá sesión para ver tus compras en «Mis pedidos»», con enlace a `/login?redirect=%2Fmis-pedidos`.
- No agregar ningún endpoint del tipo «¿existe este correo?».

### Errores (sin cambios)
| Código | Cuándo |
|---|---|
| 400 | correo mal formado u otros datos inválidos del pedido |
| 409 | tienda pausada (`TIENDA_PAUSADA`) |
| 429 | topes del checkout de invitado |
