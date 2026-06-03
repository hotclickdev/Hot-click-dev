# HOTCLICK — Implementación POS + ERP
**Fecha:** 2026-06-01  
**Stack:** Spring Boot 3.4.4 + Java 24 | React + Vite + Zustand + Tailwind | PostgreSQL Supabase  
**Repo:** `c:\proyecto-2026`

---

## Resumen ejecutivo

Se implementaron **9 fases completas** del sistema POS + ERP sobre la base existente de ecommerce, más una **fase de pruebas** con 12 correcciones de error handling. Todas las fases compilan sin errores (`pnpm build` limpio en cada una).

| Fase | Descripción | Migraciones | Backend nuevos | Frontend nuevos |
|------|-------------|-------------|----------------|-----------------|
| 1    | RBAC JWT + permisos granulares | — | 4 archivos | 2 archivos |
| 2    | Módulo POS funcional | V25 (ya aplicada) | 6 archivos | 10 archivos |
| 3    | Selector de modo post-login | — | 1 archivo | 3 archivos |
| 4    | Inventario PRO (barcode + kardex) | V26 | 5 archivos | 5 archivos |
| 5    | Compras y Proveedores | V27 | 8 archivos | 5 archivos |
| 6    | CRM Clientes | V28 | 5 archivos | 4 archivos |
| 7    | Finanzas PRO (gastos + dashboard) | V29 | 4 archivos | 2 archivos |
| 8    | Reportes Avanzados | — | — | 1 archivo (reescrito) |
| 9    | UX/UI Premium (buscador global) | — | — | 2 archivos |
| T    | Fase de pruebas y fixes | — | 3 fixes | 9 fixes |

---

## FASE 1 — RBAC JWT + Hook de permisos

### Objetivo
Los nuevos endpoints POS usan `@PreAuthorize("hasAuthority('pos.usar')")`. Antes de esta fase, solo existían roles (ADMIN_IT, CAJERO, etc.) sin permisos granulares en el JWT.

### Backend creado/modificado

| Archivo | Descripción |
|---------|-------------|
| `model/Permiso.java` | Entidad JPA para `hot_click_permiso_tb` |
| `repository/PermisoRepository.java` | Query nativa: permisos del usuario vía sus roles (`hot_click_rol_permiso_tb` → `hot_click_usuario_rol_tb`) |
| `service/CustomUserDetailsService.java` | Ahora carga permisos como `GrantedAuthority` adicionales al role. Activa `@PreAuthorize` en endpoints POS |
| `security/JwtUtil.java` | Nuevo método `generateTokenFull()` con claim `permisos[]` + `extractPermisos()` |
| `dto/AuthResponse.java` | Campo `List<String> permisos` en la respuesta del login |
| `controller/AuthController.java` | `buildAuthResponse()` y endpoint `/refresh` cargan permisos desde BD e incluyen en JWT + response |

### Frontend creado/modificado

| Archivo | Descripción |
|---------|-------------|
| `store/authStore.js` | Campos `permissions[]` y `roles[]`; helpers `hasPermission(perm)` y `hasAnyRole(...roles)`; parseo desde JWT en refresh |
| `hooks/usePermission.js` | Hook `usePermission('pos.usar')` y `useHasAnyRole('CAJERO','GERENTE')` |

### Comportamiento post-implementación
- Login responde con `permisos: ['pos.usar','products.view',...]` en el body y embebido en el JWT
- Spring Security valida `hasAuthority('pos.usar')` sin consultar BD en cada request (authorities vienen de `UserDetails`)
- Frontend puede hacer `const puedeCobrar = usePermission('pos.usar')` en cualquier componente

---

## FASE 2 — Módulo POS básico funcional

### Objetivo
Pantalla de caja registradora funcional: buscar productos, agregar al carrito, cobrar, imprimir recibo. Turno de caja con apertura/cierre y cuadre.

### Backend creado/modificado

| Archivo | Descripción |
|---------|-------------|
| `model/TurnoCaja.java` | Entidad para `hot_click_turno_caja_tb` (totales por método de pago, estado ABIERTO/CERRADO) |
| `repository/TurnoCajaRepository.java` | `findByUsuarioIdAndEstado()`, `findByEmpresaIdOrderByFechaAperturaDesc()` |
| `service/TurnoCajaService.java` | `abrirTurno()`, `cerrarTurno()` (calcula diferencia declarado vs esperado), `actualizarTotales()`, `getTurnoActivo()` |
| `controller/TurnoCajaController.java` | `POST /api/pos/caja/abrir`, `PUT /api/pos/caja/{id}/cerrar`, `GET /api/pos/caja/activo`, `GET /api/pos/caja/historial` — todos con `@PreAuthorize` |
| `dto/PosVentaDTO.java` | Payload de venta: clienteId, bodegaId, metodoPago, montoRecibido, descuentoGlobal, items[] |
| `controller/PosController.java` | `POST /api/pos/venta` — valida stock, descuenta con `descontarPorVentaPOS()`, crea Pedido origen=POS, actualiza turno, **NO dispara emails** |
| `model/Pedido.java` | Campo `origen VARCHAR(20) DEFAULT 'ONLINE'` (ONLINE/POS/MANUAL) |
| `repository/PedidoRepository.java` | `findByEmpresaIdAndOrigenOrderByFechaPedidoDesc()` |

### Frontend creado/modificado

| Archivo | Descripción |
|---------|-------------|
| `services/posService.js` | Cliente API: `crearVenta`, `abrirCaja`, `cerrarCaja`, `getCajaActiva`, `getHistorial` |
| `components/pos/POSProductSearch.jsx` | Buscador con debounce 200ms, llama `/api/productos/buscar`, modo escáner de barcode (entrada rápida < 80ms → búsqueda exacta), grid de resultados con stock coloreado |
| `components/pos/POSPaymentPanel.jsx` | Modal de cobro: EFECTIVO/SINPE/TARJETA/TRANSFERENCIA, vuelto automático, búsqueda de cliente con puntos CRM |
| `components/pos/POSReceipt.jsx` | Recibo imprimible (80mm CSS print), botones Imprimir / WhatsApp / Nueva venta |
| `pages/admin/pos/AdminPOS.jsx` | Layout 2 columnas, atajos F2=buscar / F4=cobrar / F8=nueva venta / Esc=cancelar, carrito con cantidad y precio editables |
| `pages/admin/pos/AdminPOSCaja.jsx` | Apertura con monto inicial, KPIs en tiempo real, cierre con cuadre y diferencia esperado vs declarado |
| `pages/admin/pos/AdminPOSHistorial.jsx` | Historial POS con filtros hoy/semana/mes/todo, KPIs, tabla expandible, export CSV |
| `App.jsx` | Rutas `/admin/pos`, `/admin/pos/caja`, `/admin/pos/historial`; `AdminShell` acepta roles POS (CAJERO, GERENTE, SUPERVISOR) |
| `layouts/AdminLayout.jsx` | Sidebar con sección POS para CAJERO/GERENTE/SUPERVISOR; íconos `pos`, `compra`, `proveedor` |

---

## FASE 3 — Selector de modo post-login

### Objetivo
Después del login, redirigir inteligentemente según rol y preferencia guardada. CAJERO va directo al POS; admins ven un selector de modo.

### Backend modificado

| Archivo | Descripción |
|---------|-------------|
| `controller/SpaController.java` | Agrega `/mode-select` a las rutas SPA (evita 404 al refrescar) |

### Frontend creado/modificado

| Archivo | Descripción |
|---------|-------------|
| `utils/modes.js` | `getAvailableModes(rol, permissions)` — determina modos disponibles: admin, pos, store; constante `MODE_PREF_KEY` |
| `pages/auth/ModeSelector.jsx` | Pantalla post-login con tarjetas para cada modo; auto-redirige si hay 1 solo modo; guarda preferencia en `localStorage` |
| `pages/LoginPage.jsx` | `handleLoginSuccess` reemplaza modal admin: CAJERO → `/admin/pos`, USUARIO_FINAL → destino habitual, multi-modo → `/mode-select` (respeta pref guardada) |

### Comportamiento por rol
| Rol | Destino post-login |
|-----|--------------------|
| CAJERO | `/admin/pos` directo |
| USUARIO_FINAL | destino anterior o `/` |
| ADMIN_IT / ADMIN_CLIENTE / EMPRENDEDOR | `/mode-select` (admin + tienda) |
| GERENTE / SUPERVISOR | `/mode-select` (admin + POS) |

**Switcher en sidebar:** botón "⇄ Caja POS" / "⇄ Panel admin" para usuarios con acceso a ambos modos. Cambia modo y actualiza preferencia.

---

## FASE 4 — Inventario PRO (barcode + kardex)

### Objetivo
Campo barcode (EAN/UPC) separado del SKU, trazabilidad extendida en movimientos de stock, kardex por producto, buscador POS por barcode con modo escáner.

### Migración V26
```sql
ALTER TABLE hot_click_producto_tb ADD COLUMN IF NOT EXISTS barcode VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_producto_barcode ON hot_click_producto_tb (barcode);
ALTER TABLE hot_click_movimiento_stock_tb
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(30) DEFAULT 'VENTA',
  ADD COLUMN IF NOT EXISTS referencia_id BIGINT,
  ADD COLUMN IF NOT EXISTS referencia_tipo VARCHAR(30);
```

### Backend creado/modificado

| Archivo | Descripción |
|---------|-------------|
| `model/Producto.java` | Campo `barcode` + getter/setter |
| `model/MovimientoStock.java` | Nuevas constantes: `VENTA_POS`, `DEVOLUCION`, `TRANSFERENCIA`, `COMPRA`; campos `tipo`, `referenciaId`, `referenciaTipo` |
| `service/StockService.java` | Refactored: `descontarPorVentaConTipo()` privado; nuevos públicos `descontarPorVenta()` (tipo=VENTA) y `descontarPorVentaPOS()` (tipo=VENTA_POS) |
| `repository/ProductoRepository.java` | `findByBarcode()`, `buscarPorTextoOCodigoEnEmpresa()` (nombre + SKU + barcode) |
| `controller/ProductoController.java` | `GET /api/productos/buscar?q=` (búsqueda POS), `GET /api/productos/{id}/kardex` (historial de movimientos) |

### Frontend creado/modificado

| Archivo | Descripción |
|---------|-------------|
| `services/productService.js` | Métodos `buscar(q)` y `kardex(id)`; `barcode` y `sku` en `normalizeProduct`/`denormalizeProduct` |
| `components/pos/KardexDrawer.jsx` | Drawer lateral con historial de movimientos: badges de tipo coloreados (VENTA=rojo, COMPRA=verde, etc.), stock antes→después, fecha, operador |
| `pages/admin/AdminProducts.jsx` | Columna "SKU / Barcode" en tabla; botón "Kardex" por fila que abre el drawer |
| `pages/admin/AdminNuevoProducto.jsx` | Campos SKU + Barcode en el formulario de creación/edición |
| `components/pos/POSProductSearch.jsx` | Reescrito: usa `/api/productos/buscar`; **modo escáner** — detecta entrada rápida de lector de barras (< 80ms entre chars) y busca por código exacto |

---

## FASE 5 — Compras y Proveedores

### Objetivo
CRUD de proveedores, órdenes de compra con estado PENDIENTE/PARCIAL/RECIBIDA/CANCELADA, recepción de mercancía que incrementa stock automáticamente.

### Migración V27
```sql
CREATE TABLE IF NOT EXISTS hot_click_proveedor_tb (...);
CREATE TABLE IF NOT EXISTS hot_click_orden_compra_tb (...);
CREATE TABLE IF NOT EXISTS hot_click_orden_compra_item_tb (...);
```

### Backend creado

| Archivo | Descripción |
|---------|-------------|
| `model/Proveedor.java` | Entidad con empresa FK, contacto, teléfono, correo |
| `model/OrdenCompra.java` | Entidad con proveedor, empresa, usuario, fechas, estado, items |
| `model/OrdenCompraItem.java` | Línea de orden: producto, cantidad, precioUnitario, cantidadRecibida |
| `repository/ProveedorRepository.java` | `findByEmpresaIdAndEstadoOrderByNombreAsc()` |
| `repository/OrdenCompraRepository.java` | Queries con `LEFT JOIN FETCH` para cargar items+producto en una sola query |
| `dto/OrdenCompraDTO.java` | Payload de creación con proveedor y líneas |
| `controller/ProveedorController.java` | `GET/POST/PUT/DELETE /api/proveedores` con soft delete |
| `controller/OrdenCompraController.java` | `GET /api/compras`, `POST /api/compras`, `PUT /api/compras/{id}/recibir` (incrementa stock + crea `MovimientoStock` tipo COMPRA), `PUT /api/compras/{id}/cancelar` |

### Frontend creado

| Archivo | Descripción |
|---------|-------------|
| `services/compraService.js` | API para órdenes y proveedores |
| `pages/admin/AdminProveedores.jsx` | CRUD con modal inline, tabla con contacto/teléfono/correo |
| `pages/admin/AdminNuevaCompra.jsx` | Formulario de orden: selector de proveedor, líneas de productos con precio auto-poblado desde `precioCompra` |
| `pages/admin/AdminCompras.jsx` | Lista con filtro por estado, filas expandibles con detalle, modal "Recibir mercancía" con cantidades por ítem |

---

## FASE 6 — CRM Clientes

### Objetivo
Segmentación de clientes (NUEVO/FRECUENTE/VIP/INACTIVO), puntos de fidelidad, notas internas, historial de compras, búsqueda desde el POS con puntos visibles.

### Migración V28
```sql
ALTER TABLE hot_click_usuario_tb
  ADD COLUMN IF NOT EXISTS puntos_fidelidad   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS limite_credito     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saldo_credito      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS segmento           VARCHAR(30),
  ADD COLUMN IF NOT EXISTS notas_internas     TEXT,
  ADD COLUMN IF NOT EXISTS total_compras_hist INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS num_pedidos_hist   INTEGER DEFAULT 0;
```

### Backend creado/modificado

| Archivo | Descripción |
|---------|-------------|
| `model/Usuario.java` | 7 nuevos campos CRM con getters/setters |
| `repository/UsuarioRepository.java` | `findClientes()` (USUARIO_FINAL activos), `buscarClientes(q)` (por nombre/correo/teléfono) |
| `repository/PedidoRepository.java` | `statsPorUsuario(userId)` — query nativa: COUNT + SUM de pedidos entregados |
| `controller/CrmController.java` | `GET /api/crm/clientes`, `GET /api/crm/clientes/buscar?q=` (limite 20), `GET /api/crm/clientes/{id}` (con últimos 10 pedidos), `PUT /api/crm/clientes/{id}`, `POST /api/crm/clientes/{id}/puntos` (ajuste delta) |

**Auto-segmentación:**
| Segmento | Criterio |
|----------|----------|
| NUEVO | 0–1 pedidos |
| FRECUENTE | 2–9 pedidos |
| VIP | ≥10 pedidos o total ≥ ₡500,000 |
| INACTIVO | < 5 pedidos y sin actividad en 90 días |

### Frontend creado/modificado

| Archivo | Descripción |
|---------|-------------|
| `services/crmService.js` | `listarClientes`, `getCliente`, `actualizarCliente`, `ajustarPuntos`, `buscarClientes` |
| `components/admin/ClienteDetailModal.jsx` | Drawer lateral: segmento editable, KPIs (pedidos/total/puntos), ajuste rápido de puntos, historial últimos 10 pedidos, notas internas y límite crédito |
| `pages/admin/AdminUsers.jsx` | Tab **"CRM Clientes"** con tabla (segmento coloreado, pedidos, total, puntos); clic en fila abre `ClienteDetailModal` |
| `components/pos/POSPaymentPanel.jsx` | Búsqueda de cliente integrada con CRM: muestra segmento + puntos en sugerencias; `clienteId` se pasa en el payload de venta |

---

## FASE 7 — Finanzas PRO

### Objetivo
Módulo de gastos/egresos con CRUD, dashboard comparativo ingresos vs egresos, distribución por canal de venta y método de pago.

### Migración V29
```sql
CREATE TABLE IF NOT EXISTS hot_click_gasto_tb (
  id_gasto        BIGSERIAL PRIMARY KEY,
  concepto        VARCHAR(200) NOT NULL,
  monto           INTEGER NOT NULL,
  categoria       VARCHAR(50),
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  fk_id_empresa   BIGINT REFERENCES hot_click_empresa_tb(id_empresa),
  fk_id_usuario   BIGINT REFERENCES hot_click_usuario_tb(id_usuario),
  comprobante_url VARCHAR(500),
  notas           TEXT
);
```

### Backend creado

| Archivo | Descripción |
|---------|-------------|
| `model/Gasto.java` | Entidad con empresa, usuario FK, fecha (LocalDate), categoría |
| `repository/GastoRepository.java` | `findByEmpresaIdAndPeriodo()` con filtro de fechas opcional |
| `controller/GastoController.java` | `GET/POST/PUT/DELETE /api/gastos` — con roles CONTABILIDAD y GERENTE |

### Frontend creado/modificado

| Archivo | Descripción |
|---------|-------------|
| `services/gastoService.js` | `listar(desde, hasta)`, `crear`, `actualizar`, `eliminar` |
| `pages/admin/AdminFinanzas.jsx` | **Reescrito** con 3 tabs: **Ingresos** (tabla mejorada con origen ONLINE/POS/MANUAL y método de pago), **Egresos** (CRUD gastos con categorías y modal), **Dashboard** (barras de progreso ingresos vs egresos, utilidad neta, margen %, distribución por canal, por método, egresos por categoría) |

---

## FASE 8 — Reportes Avanzados

### Objetivo
Expandir el módulo de reportes con análisis de productos más vendidos, rendimiento POS, y alertas de inventario en riesgo.

### Frontend modificado

**`pages/admin/AdminReportes.jsx`** — Reescrito con **4 tabs**:

| Tab | Contenido |
|-----|-----------|
| **Ventas** | Tabla existente mejorada + filtros avanzados (método pago, estado, búsqueda) + paginación |
| **Top Productos** | Ranking por ingreso: nombre, unidades vendidas, ingreso total, utilidad, margen % (coloreado verde/amarillo/rojo) + export CSV |
| **POS** | KPIs de ventas POS del período, tabla de tickets con cliente/método/total |
| **Inventario** | Stock en riesgo: productos con `stockActual ≤ stockMínimo`, diferencia, badge Agotado/Stock bajo |

---

## FASE 9 — UX/UI Premium

### Objetivo
Buscador global con atajo de teclado, botón de búsqueda visible en sidebar.

### Frontend creado/modificado

| Archivo | Descripción |
|---------|-------------|
| `components/admin/GlobalSearch.jsx` | Modal de búsqueda global: resultados en tiempo real para productos (buscar), pedidos (por número), clientes (CRM). Debounce 250ms, `Cmd+K`/`Ctrl+K` para abrir/cerrar, `Esc` para cerrar, grupos de resultados con ícono, label, sub y meta |
| `layouts/AdminLayout.jsx` | Botón "Buscar… ⌘K" en sidebar arriba de los links; handler global de teclado `Cmd+K`; `<GlobalSearch>` montado en el layout; prop `onSearch` pasada a `SidebarContent` |

---

## FASE DE PRUEBAS — Error Handling y Robustez

Se simularon 15 escenarios de usuario inexperto. Se corrigieron **12 issues**:

### Críticos corregidos
| # | Archivo | Bug | Fix |
|---|---------|-----|-----|
| 1 | `POSPaymentPanel.jsx` | `montoRecibidoNum` definido después de ser usado (hoisting) → ReferenceError en runtime | Movido antes del primer uso |
| 2 | `POSPaymentPanel.jsx` | Cobro de ₡0 en efectivo permitido (`>=` comparación) | Cambiado a `> 0 && >= total` |
| 3 | `AdminNuevaCompra.jsx` | Submit con líneas sin producto seleccionado creaba orden inválida | Filter estricto: `productoId && String(it.productoId).trim() !== ''` |
| 4 | `OrdenCompraController.java` | Cast directo a List sin null-check → NPE si `items` key no existe | `rawItems instanceof List` antes del cast |
| 5 | `CrmController.java` | `buscarClientes()` sin límite → payload masivo con muchos clientes | `.stream().limit(20)` |

### Altos corregidos
| # | Archivo | Bug | Fix |
|---|---------|-----|-----|
| 6 | `AdminCompras.jsx` | Input de cantidad recibida aceptaba valores negativos | `Math.max(0, Math.min(pendiente, valor))` en onChange |
| 7 | `AdminPOSCaja.jsx` | Fallo silencioso al intentar cerrar sin turno abierto | Toast explícito: "No hay un turno abierto para cerrar" |
| 8 | `TurnoCajaService.java` | `metodoPago.toUpperCase()` sin null-check → NPE si método es null | Guard `if (metodoPago == null || metodoPago.isBlank()) return;` |

### Medios/Bajos corregidos
| # | Archivo | Bug | Fix |
|---|---------|-----|-----|
| 9 | `AdminFinanzas.jsx` | Botón "Guardar" de gasto activo sin concepto/monto | `disabled={!form.concepto.trim() || parseInt(form.monto) <= 0}` |
| 10 | `ClienteDetailModal.jsx` | `deltaPoints` no se reseteaba al error en ajuste de puntos | `finally { setDeltaPoints('') }` |
| 11 | `GlobalSearch.jsx` | `onClose(false)` en toggle Cmd+K (argumento incorrecto) | Cambiado a `onClose()` |
| 12 | `POSPaymentPanel.jsx` | Vuelto mostraba `NaN` si monto recibido vacío | `montoRecibidoNum > 0` antes de calcular vuelto |

---

## Migraciones Flyway — Resumen

| Versión | Descripción |
|---------|-------------|
| V1–V22 | Schema completo existente (usuarios, productos, pedidos, etc.) |
| V23 | Subcategorías árbol: `fk_id_categoria_padre` |
| V24 | Roles empresariales (CAJERO, GERENTE, etc.) + tabla permisos POS |
| V25 | Campo `origen` en pedido, tabla `hot_click_turno_caja_tb`, usuario "Cliente Mostrador" (id=999) |
| **V26** | `barcode` en producto; `tipo`, `referencia_id`, `referencia_tipo` en movimiento stock |
| **V27** | Tablas `hot_click_proveedor_tb`, `hot_click_orden_compra_tb`, `hot_click_orden_compra_item_tb` |
| **V28** | 7 columnas CRM en `hot_click_usuario_tb` (puntos, crédito, segmento, notas internas, stats) |
| **V29** | Tabla `hot_click_gasto_tb` |

---

## Nuevas rutas de API (backend)

| Método | Ruta | Descripción | Fase |
|--------|------|-------------|------|
| POST | `/api/pos/venta` | Crear venta POS | 2 |
| GET | `/api/pos/historial` | Historial ventas POS | 2 |
| POST | `/api/pos/caja/abrir` | Abrir turno de caja | 2 |
| PUT | `/api/pos/caja/{id}/cerrar` | Cerrar turno | 2 |
| GET | `/api/pos/caja/activo` | Turno activo del usuario | 2 |
| GET | `/api/pos/caja/historial` | Historial de turnos | 2 |
| GET | `/api/productos/buscar?q=` | Búsqueda por nombre/SKU/barcode | 4 |
| GET | `/api/productos/{id}/kardex` | Historial de movimientos de stock | 4 |
| GET | `/api/proveedores` | Listar proveedores | 5 |
| POST | `/api/proveedores` | Crear proveedor | 5 |
| PUT | `/api/proveedores/{id}` | Actualizar proveedor | 5 |
| DELETE | `/api/proveedores/{id}` | Soft delete proveedor | 5 |
| GET | `/api/compras` | Listar órdenes de compra | 5 |
| POST | `/api/compras` | Crear orden de compra | 5 |
| PUT | `/api/compras/{id}/recibir` | Recibir mercancía (actualiza stock) | 5 |
| PUT | `/api/compras/{id}/cancelar` | Cancelar orden | 5 |
| GET | `/api/crm/clientes` | Listar clientes con stats CRM | 6 |
| GET | `/api/crm/clientes/buscar?q=` | Búsqueda rápida para POS (max 20) | 6 |
| GET | `/api/crm/clientes/{id}` | Detalle con últimos 10 pedidos | 6 |
| PUT | `/api/crm/clientes/{id}` | Actualizar campos CRM | 6 |
| POST | `/api/crm/clientes/{id}/puntos` | Ajustar puntos de fidelidad | 6 |
| GET | `/api/gastos` | Listar gastos por período | 7 |
| POST | `/api/gastos` | Registrar gasto | 7 |
| PUT | `/api/gastos/{id}` | Editar gasto | 7 |
| DELETE | `/api/gastos/{id}` | Eliminar gasto | 7 |

---

## Nuevas rutas de frontend

| Ruta | Componente | Acceso |
|------|-----------|--------|
| `/admin/pos` | `AdminPOS` | CAJERO, GERENTE, SUPERVISOR, admins |
| `/admin/pos/caja` | `AdminPOSCaja` | Ídem |
| `/admin/pos/historial` | `AdminPOSHistorial` | Ídem |
| `/admin/compras` | `AdminCompras` | ADMIN_IT, EMPRENDEDOR, GERENTE, INVENTARIO |
| `/admin/compras/nueva` | `AdminNuevaCompra` | Ídem |
| `/admin/proveedores` | `AdminProveedores` | Ídem |
| `/mode-select` | `ModeSelector` | Cualquier usuario autenticado |

---

## Archivos nuevos — conteo total

### Backend (src/main/java/com/hotclick/)
```
model/          Permiso.java, TurnoCaja.java, OrdenCompra.java, OrdenCompraItem.java,
                Proveedor.java, Gasto.java
                (modificados: Pedido.java, Producto.java, MovimientoStock.java, Usuario.java)

repository/     PermisoRepository.java, TurnoCajaRepository.java, OrdenCompraRepository.java,
                ProveedorRepository.java, GastoRepository.java
                (modificados: UsuarioRepository.java, PedidoRepository.java, ProductoRepository.java)

service/        TurnoCajaService.java
                (modificados: CustomUserDetailsService.java, StockService.java)

controller/     TurnoCajaController.java, PosController.java, ProveedorController.java,
                OrdenCompraController.java, CrmController.java, GastoController.java
                (modificados: AuthController.java, ProductoController.java)

dto/            PosVentaDTO.java, OrdenCompraDTO.java
                (modificados: AuthResponse.java)

security/       (modificado: JwtUtil.java)
```

### Frontend (frontend/src/)
```
services/       posService.js, compraService.js, crmService.js, gastoService.js
                (modificados: productService.js, authService.js, orderService.js)

store/          (modificado: authStore.js)
hooks/          usePermission.js
utils/          modes.js

components/pos/ POSProductSearch.jsx, POSPaymentPanel.jsx, POSReceipt.jsx, KardexDrawer.jsx
components/admin/ ClienteDetailModal.jsx, GlobalSearch.jsx

pages/admin/pos/  AdminPOS.jsx, AdminPOSCaja.jsx, AdminPOSHistorial.jsx
pages/admin/      AdminCompras.jsx, AdminNuevaCompra.jsx, AdminProveedores.jsx
                  (modificados: AdminProducts.jsx, AdminNuevoProducto.jsx, AdminUsers.jsx,
                   AdminFinanzas.jsx, AdminReportes.jsx)
pages/auth/     ModeSelector.jsx

layouts/        (modificado: AdminLayout.jsx)
App.jsx         (modificado: nuevas rutas y lazy imports)
SpaController.java (modificado: nuevas rutas SPA)
```

---

## Convenciones importantes (recordatorio)

- **Montos:** `Integer` en colones costarricenses, sin decimales. `Intl.NumberFormat('es-CR')` en frontend.
- **Migraciones:** Siempre crear `V{N}__descripcion.sql` + agregar SQL al final de `Actualizado.sql`.
- **Nunca cambiar** `ddl-auto=none`.
- **Build antes de commit:** `cd Hot_click_outlet/frontend && pnpm build`
- **Naming BD:** Siempre minúsculas sin comillas en SQL (`hot_click_*`).
- **Soft delete** en proveedores: `estado = 0` (INACTIVO) en vez de borrar.
- **POS no dispara emails** de notificación al cliente (verificado en `PosController`).
- **Usuario "Cliente Mostrador":** `id = 999`, nunca puede hacer login real.
