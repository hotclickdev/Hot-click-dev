# Inventario módulos secundarios

## Parte A — Comercial

### CRM
**BE:** `CrmController` → `/api/crm/clientes` (listar/CRUD/buscar, `POST …/puntos`, `POST …/wa`, `GET …/wa/historial`) — plan NEGOCIO_PLUS.  
**FE:** `/admin/clientes` vía `AdminClientesRoute` → `AdminClientes` | `SistemaClientes`; también tab CRM en `AdminUsers` (`CrmTab`); POS `ClienteSelector`; detalle con `ajustarPuntos`.  
**Flujo:** Alta/lista de clientes de tienda, puntos y búsqueda para venta/POS; no es pipeline de leads. Sin máquina de estados (cliente activo por uso).  
**Posible muerto:** endpoints WA del CRM sin callers en `frontend/src`. UI CRM duplicada (Clientes + tab Usuarios).

### Cotizaciones
**BE:** `CotizacionController` `/api/cotizaciones` + `CotizacionClienteController` `/api/cotizaciones/clientes`.  
**FE:** `/admin/cotizaciones`, `/nueva`, `/:id`; público `/cotizacion/:token` (`CotizacionPublicaPage`).  
**Estados:** `BORRADOR` → `ENVIADA` → `APROBADA` | `RECHAZADA` (`Cotizacion.java`).  
**Flujo:** Admin crea/edita, cambia estado, duplica, comparte link/WA; cliente ve cotización por token.  
**Posible muerto/huérfano:** sin ítem en sidebars; vendedor remapea `/admin/cotizaciones` → prefijo seller sin ruta equivalente; ADMIN plataforma sale de tenant-ops (`esRutaTenantOpsParaAdmin`).

### Gift cards
**BE:** `GiftCardController` — admin list/create/delete + `GET /gift-cards/validar`.  
**FE:** `/admin/gift-cards` (`PlanGate giftCards` PYME); checkout `ejecutarValidarGiftCard`.  
**Estados:** `ACTIVA` | `AGOTADA` | `VENCIDA` | `CANCELADA`.  
**Flujo:** Emitir/cancelar en admin; validar y descontar saldo en checkout.  
**Posible huérfano:** link en `buildSistemaLinks` apunta a `/admin/…` pero vendedor suele remapease fuera de AdminLayout sin ruta seller.

### Cupones
**BE:** `CuponController` `/api/cupones` (solicitar/validar/listar/stats ADMIN); `TiendaCuponController` `/api/tienda/cupones/validar` (tenant slug/JWT).  
**FE:** `/admin/cupones` (IT marketplace); checkout usa `/cupones/validar`.  
**Estados:** flags `usado` / `usosActuales` vs `maxUsos` (no enum).  
**Flujo:** popup bienvenida → email código → validar en checkout; admin ve stats/filtro usado.  
**Posible muerto:** `TiendaCuponController` sin callers FE.

### Ofertas / promociones
**BE:** sin controller propio — `ProductoController` (`PATCH …/oferta`, oferta por categoría, `en-oferta`); aprobación en `SolicitudAprobacionController` `/ofertas` + `MisSolicitudesController`.  
**FE:** `/admin/ofertas` → `AdminOfertas` | `SistemaPromociones`; catálogo `OfertasView`; bandeja `OfertasPendientes`.  
**Estados solicitud:** `PENDIENTE` → aprobar/rechazar. Producto: flag `enOferta` + `%`.  
**Flujo:** tenant aplica % a productos; platform revisa ofertas pendientes; dueño ve insights en Sistema.

---
