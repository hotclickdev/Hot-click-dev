# Anexo 4 — Admin IT / SuperAdmin y POS

**Alcance:** Cobertura completa **sintética** de `/admin/*` (consola plataforma) y `/admin/pos/*`. Sin ficha de rediseño pantalla-por-pantalla.  
**Padre:** [../visual-ux-audit.md](../visual-ux-audit.md)

---

## 1. Quién ve qué

| Rol | Shell | Sidebar |
|-----|-------|---------|
| ADMIN (plataforma) | `AdminLayout` + `hc-superadmin-theme` | Núcleo + Operar + CMS + Sistema (colapsables) |
| CAJERO | `POSShell` en `/admin/pos` | Solo POS |
| GERENTE / SUPERVISOR | AdminLayout limitado + POS | Inicio, POS, pedidos/finanzas, productos/bodegas |
| Vendedor Sistema | Remapeado a Figma salvo escapes | `buildSistemaLinks` solo si queda en AdminLayout |

---

## 2. Inventario de dominios admin (pantallas)

Agrupación por dominio (archivos bajo `pages/admin/`):

| Dominio | Pantallas representativas |
|---------|---------------------------|
| Home | AdminDashboard, SistemaInicio |
| Catálogo | AdminProducts, AdminNuevoProducto, Importar, CargaMasiva, Categories, Marcas, AsignarProducto, SistemaProductos* |
| Pedidos/ventas | AdminOrders, AdminNewSale, Encargos, SistemaVentasPedidos |
| POS | AdminPOS, AdminPOSCaja, AdminPOSHistorial |
| Inventario | Inventario, Captura, Paquetes, Warehouses, OfflineCola |
| Compras | Compras, NuevaCompra, Proveedores |
| Finanzas | Finanzas, Billetera, ReporteContador, Payouts, Pagos, Facturas, ConfigFiscal, Suscripcion, Planes, saas-billing |
| Marketing/CMS | Ofertas, Cupones, Homepage, Blog, Publicaciones, SistemaPromociones/Posts |
| CRM | Clientes, GiftCards, Cotizaciones, Mesas, SistemaClientes |
| Empresa | MiEmpresa, Equipo, Empresas workspace |
| Plataforma | SuperAdmin, Users, Aprobaciones, Auditorias, Security, Observabilidad, AiControl, Multipais, MasHerramientas, Configuracion |
| Ops | Recolecciones, Soporte, Servicios, Garantías, ReportesProducto, Ayuda |
| Analytics/AI | Reportes, Forecast, Executive, Copilot, Sistema* |

**~90 entradas de ruta** (vivas + redirects). Aliases legacy: `tiendas`→empresas, `moderacion`→aprobaciones, `config/*`, `herramientas/*`, etc. (ver `docs/audit/modulos/00-inventario-rutas.md`).

---

## 3. Hallazgos visuales agregados (patrones)

| Patrón | Hecho | Impacto UX |
|--------|-------|------------|
| Tablas `min-w-[900px]` | Productos, usuarios, cupones, equipo, billetera… | En móvil: scroll horizontal o dual layout card — inconsistente |
| KPI cards | 3+ implementaciones (`AdminStatCard`, `StatCard`, `KpiCard`) | Métricas “parecen de otra app” |
| `cfg-btn` azul vs `hc-btn` rojo | AdminConfiguracion | Primario cambia de color |
| `.hc-sistema-theme` crema | Formularios Sistema | Tercer look vs superadmin blanco vs Figma |
| Texto `<11px` | security tables, empresas tabs, multipais, auditorias… | Ilegible adultos mayores / móvil |
| `--hc-card` / `--color-accent` rotos | security, cotizaciones, payouts | Fondos/colores incorrectos |
| i18n mixto | “Encargos”, “Captura inventario” hardcoded | Inconsistencia idioma |
| Sidebar IT densa | 4 grupos, CMS/Sistema colapsados | Staff nuevo se pierde; jerga (observabilidad, multipaís, ONVO) |

**Clasificación global admin visual:** **Simplificar** chrome (un theme + un Button + DataTable); **no** rediseñar cada KPI de negocio en esta fase.

---

## 4. AdminConfiguracion

Hasta ~11 secciones nav (plan, perfil, marca, bodega, comisión, seguridad, notificaciones, telegram, datos, apariencia, sistema). EMPRENDEDOR ve subconjunto. Rol ADMIN → UI SuperAdmin distinta **misma URL**.

**Problema:** Mega-settings + fork por rol en misma ruta.  
**Posible:** Agrupar en 3 buckets (Cuenta / Tienda / Avanzado); separar URL superadmin.

---

## 5. AdminNuevoProducto (7–8 pasos)

```text
fotos → nombre → descripción → precios → clasificación → detalles → contenido → [seo ADMIN]
```

Varios opcionales pero el usuario camina el stepper. `canQuickPublish` desde paso ≥4.

**Vs seller Figma (4–5):** staff HotClick tiene wizard más largo — OK si es poder; malo si emprendedor llega por error (mitigado con `RedirectSiSistema`).

**Clasificación:** **Simplificar** — agrupar opcionales en un paso “Más detalles” o tabs.

---

## 6. POS — procedimiento de venta

```text
loading
 → apertura caja (montoInicial)     [1× por turno]
 → venta (buscar, qty, dto, cliente)
 → cobro (EFECTIVO | SINPE | TARJETA)
 → [qr si digital]
 → recibo
```

| Camino | Pasos interactivos (turno abierto) |
|--------|-------------------------------------|
| Efectivo | venta → cobro → recibo = **3** |
| SINPE/Tarjeta | venta → cobro → qr → recibo = **4** |
| QR cliente desde venta | salta cobro UI |

### Problemas

1. Chip SINPE dice **“Vía ONVO”** — jerga opaca para cajero.
2. Cobrar con carrito vacío: **no-op silencioso** (sin toast).
3. Dual exit Cobrar vs QR cliente — dos caminos al mismo resultado digital.
4. Cuadre (`AdminPOSCaja`) usa términos sobrante/faltante — OK para ops; necesita copy clara.

### Feedback

Toasts en apertura/venta/confirm; banner reporte pendiente; loaders `saving`/`loadingVenta`. Falta feedback empty-cart.

**Clasificación:** **Mantener** FSM; **Simplificar** copy ONVO; **arreglar** toast carrito vacío (P1).

---

## 7. Accesibilidad en admin

`AccessibilityPanel` se **oculta** en `/admin`, `/checkout`, `/pago`, `/tienda`. Admin depende de a11y nativa de cada página — mayormente débil (pocas ARIA, tablas densas, texto chico).

---

## 8. Duplicación admin ↔ Figma

| Job | Árbol vivo vendedor | Legacy / IT |
|-----|---------------------|-------------|
| Inicio | MenuPage Figma | SistemaInicio / AdminDashboard |
| Productos | ProductosListaVista | SistemaProductos / AdminProducts |
| Pedidos | PedidosListaVista | SistemaVentasPedidos / AdminOrders |
| Reportes | ReportesPage | SistemaReportes / AdminFinanzas |

Remap hace Sistema* casi inalcanzable para dueño. Mantener ambos = deuda.

**Clasificación:** Sistema* → **Evaluar eliminación** tras métricas; Admin* IT → **Mantener** para staff.

---

## 9. Prioridades agregadas (solo admin/POS)

| ID | Hallazgo | Pri |
|----|----------|-----|
| A-P0 | Tokens rotos security/billetera | P0 |
| A-P1 | Toast carrito vacío POS; jerga ONVO | P1 |
| A-P1 | Unificar botones cfg vs hc | P1 |
| A-P2 | DataTable + tipografía ≥12px en tablas | P2 |
| A-P2 | Config mega-nav agrupar | P2 |
| A-P2 | Wizard producto admin 7–8 → agrupar opcionales | P2 |
| A-P3 | i18n hardcoded labels | P3 |
| A-P3 | Colapsar mejor IA sidebar IT con tooltips | P3 |

---

## 10. NO rediseñar a ciegas (admin)

- Motor de payouts / saas-billing / facturas fiscales
- Guards `ITOnlyGuard` / `PermisoGuard` / `SuperAdminGuard`
- Flujo captura inventario PWA (módulo crítico ops — ver docs inventarios)
- Remap vendedor fuera de tenant-ops (protege a ADMIN de ver POS ajeno)
