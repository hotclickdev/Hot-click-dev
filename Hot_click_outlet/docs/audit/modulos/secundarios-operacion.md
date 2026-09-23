# Inventario módulos secundarios

## Parte B — Operación

### Compras / OrdenCompra
**BE:** `OrdenCompraController` `/api/compras` — list/get/crear/`recibir`/`cancelar` (feature `compras` PYME).  
**FE:** `/admin/compras`, `/compras/nueva`.  
**Estados:** `PENDIENTE` → `PARCIAL` | `RECIBIDA` | `CANCELADA`.  
**Flujo:** crear OC con ítems → recibir mercancía (parcial/total) o cancelar.  
**Posible muerto UX:** `RedirectSiSistema` (vendedor→config) **y** ADMIN fuera de tenant-ops → inaccesible por UI normal.

### Proveedores
**BE:** `ProveedorController` `/api/proveedores` — CRUD + soft delete + historial costos.  
**FE:** `/admin/proveedores`.  
**Estados:** `estado` int ACTIVO/INACTIVO.  
**Flujo:** CRUD proveedores ligados a OC; historial de costos por proveedor.  
**Misma colisión de guards** que Compras.

### Gastos
**BE:** `GastoController` `/api/gastos` CRUD + filtro fechas.  
**FE:** **sin página propia** — embebido en `AdminFinanzas` (`EgresosTab`, `GastoModal` + `gastoService`). `/admin/finanzas` redirige vendedor a reportes.  
**Estados:** ninguno explícito (registro contable).  
**Flujo:** listar/crear/editar/borrar egresos por período junto a pedidos ENTREGADO.

### Reportes
**Ventas/negocio:** `AdminReportes` | `SistemaReportes` en `/admin/reportes` (datos ventas/POS/`feature reportes`); `AdminReporteContador` + `FinanzasReporteController` `/admin/finanzas/reporte-iva`.  
**Moderación:** `ReporteProductoController` — público POST + admin list/resolver; UI `/admin/reportes-producto`.  
**Estados reporte producto:** `PENDIENTE` | `RESUELTO` | `DESCARTADO`.  
**Flujo:** KPIs/ventas por plan; contador exporta IVA CSV; staff resuelve denuncias de producto.

### Forecast
**BE:** `ForecastController` `/api/admin/forecast` dashboard + generar.  
**FE:** `/admin/forecast` (`PlanGate ai` PYME) → `AdminForecast`.  
**Flujo:** historial semanal → generar pronóstico ingresos/unidades (mín. ~4 semanas).  
**Posible muerto UX:** vendedor→`/admin/copilot`; ADMIN→fuera tenant-ops.

### Executive
**BE:** `ExecutiveController` — dashboard, SSE `ai-summary`, guardar-resumen (`feature reportes`).  
**FE:** `/admin/executive` → `AdminExecutive` (KPIs, AI summary, print, historial reportes).  
**Misma colisión de guards** que Forecast/Compras.

### Multipaís
**BE:** `MultipaisController` `/api/admin/multipais` — paises/tasas/config GET/PUT.  
**FE:** `/admin/multipais` (sidebar IT SISTEMA).  
**Flujo:** config país/moneda/locale/tax + tasas de cambio. Sin workflow de estados.

---
