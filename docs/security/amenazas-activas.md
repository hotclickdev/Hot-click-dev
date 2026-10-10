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
| auth-rutas-publicas | login | Rutas SPA nuevas (`/planes`, `/negocios`) abren datos privados | solo `permitAll` de la página; las APIs siguen con su regla | `gate-authz` | cubierto |
| pago-efectivo | tenant | Checkout en efectivo con una bodega que no lo acepta | `SinpeCheckoutService.exigirEfectivoAceptado` | `EfectivoAceptadoTest` | cubierto |
| csp-sin-pixel | login | Script o píxel de terceros (Meta) cargado desde la CSP envía datos de navegación sin consentimiento | `SecurityHeadersWriter`: sin `connect.facebook.net` ni `graph.facebook.com`; `img-src` sin `*.facebook.com`; solo queda `frame-src www.facebook.com` para videos embebidos | `CspSinMetaPixelTest` | cubierto |
| auth-email-publico | login | `GET /email/*.png` público expone algo más que los íconos de correo | `permitAll` solo para `GET /email/*.png` (un nivel, solo PNG) en `SecurityAuthorizationRules`; el resto sigue con su regla | `ServiceWorkerPrecacheTest` | cubierto |
| csp-img-ytimg | login | Ampliar `img-src` abre la carga de imágenes de cualquier host | solo se suma `https://i.ytimg.com` en `SecurityHeadersWriter`; scripts y frames sin cambios | `ServiceWorkerPrecacheTest` (CSP incluye `i.ytimg.com`) | cubierto |
