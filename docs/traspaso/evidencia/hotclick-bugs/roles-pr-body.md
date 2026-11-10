## fix(roles): EDITOR/LECTOR → 403 en admin/pagos, billing, wallet, métodos de cobro y facturas (QA3 área 2)

### Problema
Los miembros EDITOR y LECTOR (rol Spring `EMPRENDEDOR`, rol de empresa en `miembro_empresa`) podían leer datos financieros reservados al dueño. Además, `POST /api/billing/tilopay/confirmar/{orderNumber}` no verificaba que quien llama sea el dueño (BAJO) y `GET /api/facturas` como EDITOR respondía 500 (BAJO).

### Cambios
- `/api/admin/pagos/**` ahora es solo para ADMIN o `global.metrics`, tanto en `SecurityAuthorizationRules` como en el `@PreAuthorize` de `AdminPagoController`. Se quitó EMPRENDEDOR. El único consumidor es la UI de plataforma `/plataforma/dinero/cobros`.
- Las demás rutas reutilizan el guard de QA3-012, `PropietarioGuard.puedeGestionarEmpresa`, y responden 403. Se agregó `exigirGestionEmpresa(Long)`.
  - `SuscripcionController`: suscripcion, facturas, plan-pendiente, tilopay/pendiente y tilopay/confirmar.
  - `BillingPreferenciasController.ver`, `MetodoCobroController.listar`.
  - `WalletController`: saldo, historial y payouts.
  - `FacturaController`: listar, detalle y estado. ADMIN sigue pasando.
- Se agregó la fila "QA3 área 2" en `docs/security/amenazas-activas.md`.

### Matriz endpoint × rol
| Endpoint | PROPIETARIO | EDITOR | LECTOR | ADMIN |
|---|---|---|---|---|
| GET /api/admin/pagos, /kpis | 403 | 403 | 403 | 200 |
| GET /api/billing/{suscripcion,facturas,plan-pendiente,preferencias,tilopay/pendiente} | 2xx/409 | 403 | 403 | — |
| GET /api/metodos-cobro | 2xx | 403 | 403 | — |
| GET /api/wallet/{payouts,saldo,transacciones} | 2xx | 403 | 403 | — |
| GET /api/facturas | 2xx | 403 (antes 500) | 403 | pasa |
| POST /api/billing/tilopay/confirmar/{orderNumber} | sin 401/403/5xx | 403 | 403 | — |

### Tests
- Nuevo: `RolesBillingWalletCobrosTest`, con 39 casos parametrizados por rol y endpoint. Los tokens se generan con empresaId y slug, igual que en el login real. Un primer intento sin empresaId daba 401 porque TenantContext quedaba nulo; era un problema del test, no del código.
- Actualizados: `IdorVendedorHotfixTest` (IDOR-07), `SinpeRevisionAuthorizationTest`, `AdminRutasRolTest` (se sacó admin/pagos de la lista blanca del vendedor).
- Gates: `gate-scale`, `gate-tenant-global` y `seguridad-merge` pasan.

### #285
No regresionó. #285 (commit `0b248f2a5`) solo protegió las escrituras: POST/PUT de metodos-cobro y PUT de preferencias. Los GET nunca tuvieron guard, así que esto cierra un hueco que ya existía.

### Seguimiento (fuera de esta rama): LECTOR 1067 con `correoVerificado=true`
Es un bug. `Usuario.correoVerificado` tiene `true` por defecto (`Usuario.java:71-72`), y `EquipoService.crearNuevo` (líneas 104-123) crea al miembro con una contraseña elegida por el dueño sin llamar `setCorreoVerificado(false)`. Tampoco existe un flujo para aceptar la invitación. Los otros caminos de alta sí ponen `false`: `EmprendedorRegistroService:114`, `AdminAsignarController:124` y `TiendaRapidaService:209/266`.

### Riesgos
- El dueño pierde `/api/admin/pagos`. Solo lo usa la UI de plataforma.
- `/api/admin/finanzas`, dashboard y otras rutas de la lista blanca siguen abiertas para EDITOR; quedan fuera de alcance.
- Un ADMIN sin empresa recibe 401 en `/api/billing/*` porque TenantContext queda nulo.
- No se investigó el 500 de `/api/facturas` para el dueño.
- Solo se corrieron suites dirigidas, no la suite completa.
