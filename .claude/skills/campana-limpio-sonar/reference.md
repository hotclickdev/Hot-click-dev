# Lotes actuales — campaña limpio + Sonar

En cada archivo: `codigo-limpio-sonar`. Actualizar este archivo cuando un lote
cierra. La campaña de líneas (pages ≥400, components ≥300, services ≥250)
**ya está hecha**.

## Lote 0 — Skills (meta)

`codigo-limpio-sonar` (quién manda en un archivo) + esta campaña. No es código
de producto.

## Lote 1 — Working tree mixto (cerrado)

Cerrado: no se reabre salvo bug real. No se re-tocan CuponesUi / overlay de GestionUserForm.

- `CuponesUi.jsx` — label `{usosActuales}/{maxUsos}` restaurado.
- `GestionUserForm.jsx` — overlay `<button aria-label="Cerrar">`; X interno con `aria-label`; no se repuso Escape.
- `LogModal.jsx` — mismo overlay; X sin emoji, con `aria-label`.
- `AuthCredentialLoginHandler.java` — extract de métodos + `EmpresaNombre` (mismo orden de llamadas). Dejar en commit **aparte** del resto del WT.
- Catches de catálogo: `log.debug` (intencional, sin usuario).
- Resto del WT: extracts que conservan labels (`AdminUsers`, `PluginForm`, `CharCounter`, `StepSubida`). No se ampliaron archivos limpios.

## Lote 1b — Quality Gate (cerrado)

Contrastado con local (scan ~`9b52e58d`, semanas atrás). Los 40 bugs/vulns de código nuevo **ya no están** en disco o no se tocan a propósito:

- `S2142` / `S8700` / `S5866` / `S5850` / `S2119` / `S2095` / `S6440` / `S1534` — corregidos en extraídos (`interrupt()`, zona CR, UNICODE_CASE, `ThreadLocalRandom`, `getCookieConsent`, un solo `get2FAStatus`).
- `S1082` — god-pages partidos; drop zone y overlays ya son `<button>`.
- `S2245` — ignore `e7`.
- `S2201` (`size()`) — Won't Fix (lazy-load Hibernate); no inventar un uso falso.

Hace falta re-scan (`workflow_dispatch` / push) para que el dashboard deje de listar lo viejo. No se re-arreglaron archivos ya limpios.

## Lote 2 — Pages banda 250–272 (cerrado)

- `SistemaReportes.jsx` — extraído a `sistema-reportes/` (tabs + helpers). Textos iguales; catch de carga ahora log + toast.
- `ContactoPage.jsx` — extraído a `contacto/` + `contactoService` (fetch público, sin JWT). Catch con log + toast. Bandera CR en SVG (mismo recuadro; sin emoji).
- `AdminBranding.jsx` — extraído a `branding/` (form + preview). Labels/`id` en URLs y picker de color; catch de carga/guardado con log. Textos iguales.
- `AdminSuscripcion.jsx` — extraído a `suscripcion/` (KPIs, acciones, facturas). Mismo orden de llamadas a billing. Catch con log; textos iguales.
- `SistemaVentasPedidos.jsx` — extraído a `sistema-ventas/` (VentasTab POS, PedidosTab, helpers). Reusa `ordenes/` sin re-partirla. Mismo orden de `posService.historial()` / `orderService.getAll()`. Catch con log; toast si falla el historial POS. Textos iguales.
- `AdminFinanzas.jsx` — `finanzas/` no se re-partió. Shell: log en catch, `id`/`aria-label` en fechas (sin label visible nuevo), pills/tabs sin ternario anidado. Mismo orden de `orderService.getAll()` / `gastoService.listar()`. Textos iguales.
- `AdminPublicaciones.jsx` — tabs/modal de `publicaciones/` no se re-partieron. Handlers a `useAdminPublicacionesActions` (mismo orden de `publicacionService` / `productService`). Catch con log; tipo de cambio sigue best-effort (log, sin toast). Textos iguales.

`AdminUsers` cerrado (carpeta `usuarios/` no re-partida; leftovers del shell).

## Lote 3 — Components ~200–239 (cerrado)

`MiniCartDrawer`, `PromoWelcomePopup`, `QuickViewModal`, `ProductCard`,
`POSPaymentPanel` (POS → bit-idéntico).

## Lote 4 — Java services ≥200 (cerrado)

`AuthRegistrationService` (auth, bit-idéntico), `WaPlantilla`, copilot/telegram
residual. Métodos ≤30 / nesting; no fusionar paquetes ya partidos.

## Lote 5 — Java controllers ≥200 (cerrado)

HTTP + validación en el controller; negocio al `@Service`.
`AuthController` ya era HTTP. `PosController` → `PosVentaService` (hunk aparte).
`OrdenCompraController` → `OrdenCompraService`.
`EquipoController` → `EquipoService`. `AdminUsuarioController` → `AdminUsuarioService`.
`EmpresaController` → `EmpresaAdminService`.
`EmpresaPerfilController` → `EmpresaPerfilService` (fiscal cifrado, mismo orden).
`MarcaController` → `MarcaService`. `CrmController` → `CrmClientesService`.
`TelegramConfigController` → `TelegramConfigService`.
`ClerkSyncController` → `ClerkSyncService` (auth, hunk aparte).
`PedidoController` → `PedidoTenantResponder` (tenant 403 / error 400; GET `/{id}` sigue 401/404).

`AuthController` HTTP no se reabre. `BillingWebhookController` (pago, &lt;200) no se toca aquí.

## Lote 6 — Components leftover ~200–239 (cerrado)

No re-tocar: `ai/aiChat/`, `ui/searchPanel/`, `finanzas/`, `usuarios/`, `pos/`, `checkout/`.

`SpecialCard` → `specialCardIcons`. `PhoneField` → `phoneFieldCountries`.
`GlobalSearch` → `globalSearchQuery` (secciones muertas no se reponen).
`AISolicitudEspecial` → `AISolicitudEspecialFields` (`setCampo` + foto nombrada).

Fuera de alcance permanente: sprint de `S1192` o ternarios masivos. Boy scout
al pasar.

## No re-tocar (ya extraídas)

**Admin pages:** `marcas/`, `categorias/`, `productos/`, `ordenes/`, `pos/`,
`nuevo-producto/`, `importar/`, `carga-masiva/`, `security/`, `usuarios/`,
`catalogo/`, `copilot/`, `cupones/`, `pagos/`, `billetera/`, `compras/`,
`plugins/`, `configuracion/`, `empresas/`, `equipo/`, `finanzas/`, `blog/`,
`asignar/`, `branding/`, `suscripcion/`, `sistema-reportes/`, `sistema-ventas/`,
`publicaciones/`.

**Storefront:** `auth/`, `carrito/`, `checkout/`, `producto/`, `home/`, `contacto/` (shells
ya partidos).

**Components:** `layout/navbar/`, `ai/aiChat/`, `ai/posPayment/`,
`ui/heroRotator/`, `ui/searchPanel/`.

**Java:** paquetes bajo `service/{auth,payment,copilot,telegram,catalogo,extraccion,email}`
y `controller/{producto,spa,storefront}` — fachadas hechas; solo métodos
residuales o WT.
