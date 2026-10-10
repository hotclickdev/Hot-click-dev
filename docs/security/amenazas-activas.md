# Amenazas activas

Lista que el merge exige actualizar si cambia login, roles, tenant, Stripe o el copilot. Estados: `cubierto`, `hueco`, `solo-prompt`. `solo-prompt` no cuenta como control.

| id | superficie | abuso | control | prueba | estado |
| --- | --- | --- | --- | --- | --- |
| auth-rol | login | Un vendedor llama un endpoint de admin | `@PreAuthorize` y `SecurityConfig` | `gate-authz` | cubierto |
| tenant-pedido | tenant | El negocio A lee un pedido del B | alcance por empresa | `EmprendedorPedidoTest` | cubierto |
| tenant-producto | tenant | El negocio A cambia un producto del B | alcance por empresa | `EmprendedorProductoTest` | cubierto |
| tenant-bodega | tenant | `empresaId` de otra empresa en el query | el id ajeno se ignora | `BodegaListadoScopeTest` | cubierto |
| tenant-carrito | tenant | Borrar el carrito de otra sesión | `sessionId` | `CartAbandonadoSecurityTest` | cubierto |
| stripe-firma | stripe | Webhook sin firma | `Webhook.constructEvent` en `StripeWebhookSupport` | sin test que rechace el payload | hueco |
| copilot-sesion | copilot | Chat sin negocio resuelto | `TenantContext` nulo corta antes de Claude | `AiCopilotServiceChatStreamTest` | cubierto |
| copilot-args | copilot | El modelo manda `empresaId` en la tool | el schema no tiene ese campo; el id entra por la sesión | gate `seguridad-merge` | cubierto |
| copilot-mutacion | copilot | El modelo aplica un cambio de pedido | `proponer_*` y confirmación por botón | sin test de que no ejecuta | hueco |
| publico-tienda-rapida | login | Martillar el enlace público de tienda rápida (bcrypt y alta de cuenta) | `PrefixLimit` 5/min por IP + prefijo y GET 20/min en `RateLimitingFilter`; token de 144 bits | `TiendaRapidaRateLimitTest` | cubierto |
| auth-rutas-publicas | login | Rutas SPA nuevas (`/planes`, `/negocios`) abren datos privados | solo `permitAll` de la página; las APIs siguen con su regla | `gate-authz` | cubierto |
| pago-efectivo | tenant | Checkout en efectivo con una bodega que no lo acepta | `SinpeCheckoutService.exigirEfectivoAceptado` | `EfectivoAceptadoTest` | cubierto |
