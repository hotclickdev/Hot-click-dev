# Auditoría estática READ-ONLY — POS / CAJA

Veredicto: el POS operativo real hoy es **EMPRENDEDOR/ADMIN** vía bypass de roles; los roles **CAJERO/GERENTE/SUPERVISOR** siguen en el front pero están **inactivos en BD**. Hay riesgos de **IDOR al cerrar turno**, **confianza ciega en precios/descuento**, y **bugs de unwrap ResponseDTO** en cuadre/historial.

---

## 1. Mapa de componentes

| Capa | Archivos |
|------|----------|
| HTTP | `PosController`, `PosQrController`, `TurnoCajaController` |
| Negocio | `PosVentaService`, `PosQrService` → `PosQrSessionService` / `PosQrVentaService` / `PosQrPedidoFactory`, `TurnoCajaService` |
| Front caja | `AdminPOS` + `useAdminPOS`, `AdminPOSCaja`, `AdminPOSHistorial`, `POSShell`, `posService`, `posStore` |
| Pago público | `/pos/pago/:token` → `POSPagoPage` + `usePosPagoQr` |
| Auth | `@PreAuthorize` + `SecurityAuthorizationRules` + permisos V24 |

---

## 2. Flujos POS

### A) Venta directa (efectivo / sin QR)

```
apertura turno → venta (carrito) → cobro → POST /api/pos/venta → recibo
```

1. Steps UI: `loading → apertura|venta → cobro → recibo` (`posHelpers.ts:28`, `AdminPOSSteps.tsx:8-58`).
2. SINPE/TARJETA en cobro **no** llaman venta directa: abren sesión QR (`useAdminPOS.ts:142-146`).
3. `PosVentaService.crearVenta` arma pedido `origen=POS`, `estadoPedido=ENTREGADO`, `metodoEnvio=RETIRO` (`PosVentaService.java:99-116`).
4. Stock con `findByIdForUpdate` + `descontarPorVentaPOS` (`PosVentaService.java:124-137`).
5. Turno: solo si hay turno ABIERTO del usuario; si no, **sigue la venta** y loguea warn (`PosVentaService.java:168-175`).

### B) Pago QR (cajero + cliente)

```
cajero POST /api/pos/qr
  → cliente GET/POST /api/pos/qr/pago/{token}...
  → webhook ONVO o confirmar-sinpe
  → PosQrPedidoFactory.crearPedidoPOS
  → cajero poll → recibo
```

| Actor | Endpoint | Auth |
|-------|----------|------|
| Cajero | `POST /api/pos/qr` | JWT + `pos.usar` o ADMIN/EMPRENDEDOR (`PosQrController.java:37-55`) |
| Cajero | `PUT .../confirmar-sinpe`, `DELETE /{token}` | idem (`:63-91`) |
| Público | `GET /pago/{token}`, `/estado` | `permitAll` (`SecurityAuthorizationRules.java:43-46`) |
| Público | `POST .../stripe`, `/intent`, `/sinpe-onvo` | `permitAll` |
| Pasarela | webhook ONVO → `completarSiPagoPasarela` (`OnvoWebhookController.java:84-96`) |

Estados sesión QR (`PosQrSesion.java:40-41`, `PosQrSessionService.java:75-77`, `215-236`):

`PENDIENTE` → `PAGADO` | `CANCELADO` | `EXPIRADO` (TTL 30 min)

SPA pública: `AppRoutes.tsx:314`, `POSPagoPage.tsx:17-114`.

### C) Turno de caja

| Acción | Endpoint | Auth |
|--------|----------|------|
| Abrir | `POST /api/pos/caja/abrir` | `pos.caja.abrir` o ADMIN/EMPRENDEDOR (`TurnoCajaController.java:26-27`) |
| Cerrar | `PUT /api/pos/caja/{id}/cerrar` | `pos.caja.cerrar` o … (`:43-44`) |
| Activo | `GET /activo` | `pos.usar` (`:59-60`) |
| Historial turnos | `GET /historial` | `pos.usar` (`:72-73`) |

Estados turno: **`ABIERTO` → `CERRADO`** (`TurnoCaja.java:48-49`, `TurnoCajaService.java:43`, `66`).

Cierre calcula:  
`montoCalculado = inicial + efectivo + sinpe + tarjeta + transferencia`  
`diferencia = declarado − calculado` (`TurnoCajaService.java:55-63`).

---

## 3. Auth y roles CAJERO / GERENTE / SUPERVISOR

### Backend

Todos los endpoints POS usan el mismo patrón:

```java
hasAuthority('pos.usar'|'pos.caja.*') or hasAnyRole('ADMIN','EMPRENDEDOR')
```

(`PosController.java:30`, `PosQrController.java:38`, `TurnoCajaController.java:27`).

Permisos sembrados en V24 (`V24__nuevos_roles_pos.sql:70-72`, `106-148`):

| Rol (histórico) | Permisos POS relevantes |
|-----------------|-------------------------|
| CAJERO | `pos.usar`, `pos.caja.abrir/cerrar`, `pos.descuento`, products/orders view |
| SUPERVISOR | POS + `pos.anular`, `pos.devolucion`, `pos.descuento` |
| GERENTE | casi todo excepto `global.*` |

**Estado actual en BD:** roles POS **inactivados** en V89 (`V89__restructura_roles_planes.sql:36-39`) y marcados legacy en V132 (`V132__limpiar_roles_muertos.sql:36-40`). Camino productivo: **EMPRENDEDOR** (bypass `hasAnyRole`) + permisos si se reactivan roles.

Authorities reales en request: `CustomUserDetailsService` carga `ROLE_*` + permisos (`CustomUserDetailsService.java:35-42`).

### Frontend

| Pieza | Comportamiento |
|-------|----------------|
| `ROLES_POS` | CAJERO, GERENTE, SUPERVISOR (`sistemaUser.ts:13`) |
| `AdminRoleSwitch` | `/admin/pos/*` → `POSShell`; acceso si `ADMIN_ROLES ∪ ROLES_POS` (`AdminRoleSwitch.tsx:38-55`) |
| Sidebar | CAJERO solo POS; GERENTE/SUPERVISOR POS + pedidos/finanzas/productos/bodegas (`adminSidebarLinks.ts:68-86`) |
| `puedeUsarCaja` | roles caja **o** `pos.usar` (`modes.ts:19-20`) |
| `pos.descuento` / `pos.anular` | **no** enforced en UI ni en `PosVentaService` |

Staff plataforma **no** opera POS: redirect a `/admin` (`AdminRoleSwitch.tsx:44-46`).

---

## 4. Escenarios clave

| # | Escenario | Resultado |
|---|-----------|-----------|
| 1 | Emprendedor abre caja y vende EFECTIVO | OK; totales turno actualizados |
| 2 | Vende SIN turno abierto | Venta OK; turno no actualizado (`PosVentaService.java:168-175`) |
| 3 | SINPE/TARJETA | QR → cliente paga → webhook/poll → pedido `POS-QR-*` |
| 4 | Cajero confirma SINPE API sin pago real | `confirmarSinpe` crea pedido si `PENDIENTE` + misma empresa (`PosQrVentaService.java:298-311`) — UI ya no expone botón manual (`StepQR` solo poll/cancel) |
| 5 | QR expirado / cancelado | 404 pública (`PosQrSessionService.java:225-236`) |
| 6 | Dos ventas concurrentes mismo SKU | lock pesimista producto |
| 7 | Usuario CAJERO (si rol activo) | API vía `pos.*`; UI POSShell |
| 8 | Token QR filtrado | cualquiera inicia pago / ve ítems y total |
| 9 | Cerrar turno ajeno por ID | **posible** (ver riesgos) |
| 10 | `bodegaId` null en `posStore` | backend usa 1.ª bodega activa (`PosVentaService.java:86-91`) — `BodegaSelectorModal` no cableado a AdminPOS |

---

## 5. Riesgos (prioridad)

### Críticos / altos

1. **IDOR cierre de turno** — `cerrar(@PathVariable Long id)` no verifica dueño ni `empresaId` del JWT (`TurnoCajaController.java:43-50`, `TurnoCajaService.java:48-67`). Cualquier usuario con `pos.caja.cerrar` puede cerrar turnos de otros tenants si adivina IDs.

2. **Precios y descuento controlados por cliente** — `precioUnitario` y `descuentoGlobal` del body se aceptan (`PosVentaDTO`, `PosVentaService.java:128-129`, `111`; QR: `PosQrPedidoFactory.java:165`, `PosQrSessionService.java:63-65`). Permiso `pos.descuento` existe en BD pero **no se chequea**.

3. **Confirmación SINPE sin prueba de pago** — `PUT confirmar-sinpe` marca venta pagada con solo JWT de empresa (`PosQrVentaService.java:298-311`). Apta para abuso interno / token filtrado de cajero.

4. **Carrera doble pedido QR** — `completarSiPagoPasarela` / `verificarEstado` checan `PAGADO` sin lock de fila de sesión (`PosQrVentaService.java:173-188`, `255-257`). Webhook + poll concurrentes pueden duplicar pedido (mitigado parcialmente por stock lock, no por estado sesión).

### Medios

5. **Unwrap ResponseDTO inconsistente**
   - Interceptor: no unwrap si `data == null` (`api.ts:37-41`).
   - `useAdminPOS`: trata envelope truthy como turno → puede saltar a `venta` sin turno (`useAdminPOS.ts:75-77`).
   - `AdminPOSCaja`: `res?.data ?? null` **después** del unwrap → turno activo queda `null` (`AdminPOSCaja.tsx:29-30`).
   - `AdminPOSHistorial`: mismo patrón → lista vacía (`AdminPOSHistorial.tsx:44-45`).

6. **Endpoints públicos sin rate-limit aparente** — info + intentos de pago (`SecurityAuthorizationRules.java:43-46`). Token UUID-32 es fuerte, pero hay superficie de abuso ONVO / enumeración si hay fuga de token.

7. **Info pública del carrito** — `getInfoPublica` expone ítems, total, branding (`PosQrSessionService.java:99-124`).

8. **SINPE destino plataforma** — default `+50670196686` / `onvo.sinpe-destino` (`PosQrSessionService.java:43-44`, `145-150`), no cuenta del comercio.

9. **Venta sin turno obligatorio** — cuadre incompleto vs ventas reales.

10. **Roles POS legacy vs front vivo** — riesgo de UX/auth confusa si se reactivan roles a medias (V89/V132 vs `sistemaUser.ts:13`, sidebars).

### Bajos

11. `extractUserId` asume `Authorization` con Bearer sin null-check (`PosController.java:60-71`).
12. `actualizarTotales` no valida turno aún `ABIERTO` (`TurnoCajaService.java:76-88`).
13. Feature plan `pos` no gatea API (comentario jul 2026, `PosController.java:32-33`); `maxCajas` vive en tenant, no en estos controllers.
14. `posStore` solo bodega en `sessionStorage` (`posStore.ts:18-30`); selector no integrado en flujo AdminPOS.

---

## 6. Duplicaciones

| Duplicado | Dónde |
|-----------|--------|
| Armado de pedido POS | `PosVentaService` ≈ `PosQrPedidoFactory` (cliente mostrador, bodega, items, stock, telegram, aviso) |
| Facade QR | `PosQrService` delega casi todo a session/venta |
| Extract JWT | copy-paste en 3 controllers |
| Polling estado QR | cajero `StepQR` 3s; cliente `usePosPagoQr` / `PosPagoSinpe` 2.5s |
| Unwrap ResponseDTO | `qrDataDesdeRespuesta` bien; caja/historial mal |
| Rutas POS seller | redirects duplicados en `EmprendedorRoutes`, `SellerRoutes`, `sellerAdminRoutes` |

---

## 7. Contrato API ↔ front (`posService.ts`)

| Método | Ruta |
|--------|------|
| `crearVenta` | `POST /pos/venta` |
| `historial` | `GET /pos/historial` |
| `abrirCaja` / `cerrarCaja` / `getCajaActiva` / `getHistorialCaja` | `/pos/caja/*` |
| `crearQrSesion` / `confirmarSinpeQr` / `cancelarQrSesion` | `/pos/qr` |
| Públicos (axios sin JWT) | `/pos/qr/pago/{token}…` (`posService.ts:21-27`) |

`POSShell` (`POSShell.tsx:10-23`): tema seller + noindex; sin auth propia (la pone `AdminRoleSwitch`).

---

## 8. Resumen ejecutivo

- **Flujos:** venta inmediata EFECTIVO; SINPE/TARJETA vía QR + ONVO; turno ABIERTO/CERRADO con cuadre.
- **Auth:** permisos granulares `pos.*` + bypass ADMIN/EMPRENDEDOR; roles caja **legacy en BD**, **activos en UI**.
- **Mayor deuda de seguridad:** IDOR en cierre de turno + precios/descuento sin servidor + confirmar SINPE trust-based.
- **Mayor deuda de producto/bugs:** unwrap de `getCajaActiva`/`historial` rompe cuadre e historial en front.

Sin cambios de código (READ-ONLY, según pedido).