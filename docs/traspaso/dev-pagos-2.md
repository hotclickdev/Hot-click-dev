# Traspaso — HotClick Dev Pagos 2 (30-oct-2026, hora CR)

> Reemplaza como fuente vigente a `hotclick-dev-pagos-2.md` (historial anterior al 27-oct). Sin secretos, cédulas reales, IBAN, SINPE ni teléfonos.

## Rol
Segundo desarrollador de pagos de HotClick, repo `hotclickdev/Hot-click-dev`. Áreas **1 (pagos/checkout ONVO), 4 (POS / IVA) y 7 (facturación Hacienda)**. Reporta solo a Grok Bot; nunca escribir directo a Andrés.

Reglas: push y PRs propios (máx. 3 abiertos), sin force, sin `--no-verify`, sin rebase, sin `git stash`, sin `pkill` (cerrar instancias locales por PID exacto). Worktree propio por tarea desde `origin/master`. Merge solo con CI verde y APTO de HotClick Seguridad sobre el hash exacto. Nunca deploy, gastos, cuentas ni servidores nuevos. ONVO fail-closed y único procesador (mock solo en perfiles dev/test; Tilopay y Stripe son deuda técnica). ONVO solo en modo TEST; las llaves de prueba nunca se imprimen, loguean ni commitean; no tocar el dashboard ni la llave live. Flyway solo aditivo; siguiente número libre **V216** (V214 ya lo usa otra rama, V215 lo usa #460). Un test de regresión por fix. Solo tests dirigidos (`-Dtest=...`); lo pesado con `flock /workspace/hotclick/.suite-completa.lock <cmd>`. Nunca decir que funciona sin correr la suite.

## Estado
| Ítem | Estado |
|---|---|
| #431 área 7 (emisión solo admin a nombre de HotClick, `hacienda.emision-automatica` default false, logs sanitizados, `getToken` lanza excepciones tipadas, `exigirCedulaEmisor`) | MERGEADO `07592b27`. Auditor 7 y QA: área 7 ✅ |
| E2E ONVO TEST (tarjeta trial, 4242 aprobada, 0002 rechazada, formulario hospedado, 3DS 4000000000003220, polling sin webhook, expiración a CANCELADO con stock liberado, fail-closed 401/409/404) | ✅ sin bugs |
| #436 vencimiento configurable y `GET /api/payments/status/{n}` con reconsulta a ONVO (dueño o `X-Pedido-Token`, rate limit por orden, fail-closed; SINPERefNumber a DEBUG) | MERGEADO `270236e3` |
| #438 `fix/cedula-guiones`: `CedulaEmisor.normalizar` (quita guiones/espacios, solo dígitos, largo 9–12) en `exigirCedulaEmisor` y `XmlFacturaBuilder` (Numero y ProveedorSistemas); `HaciendaLogSanitizer` enmascara números con guiones | MERGEADO `98b70413` (APTO de Seguridad sobre el head `7f759a22`) |
| #460 `fix/pago-lows-seguridad` (autor HotClick CI/CD; MEDIO 1 y 2 de la pre-revisión corregidos por Dev Pagos 2): test de integración Spring + H2 con los flujos reales de ONVO, Tilopay y Stripe sobre un pago REEMBOLSO_PENDIENTE (el reintento queda bloqueado; guard en cada proveedor antes de CAPTURADO, Stripe con FOR UPDATE); cobro parcial con paquete cancelado registra `monto_reembolso_pendiente` (V215, aditiva) y la resolución del ADMIN no pasa el pago compartido entero a REEMBOLSADO | EN CURSO — https://github.com/hotclickdev/Hot-click-dev/pull/460, head `97d9012a`. Falta CI verde + APTO de Seguridad sobre ese head; coordinar con CI/CD |

Flag IVA `hotclick.iva.cambio-regimen.enabled` se queda en **false**.

## Pendientes
1. **BAJOs de #436**
   - `log.info` con el `sessionId` de ONVO: pasar a debug o enmascarar.
   - Diferencia de timing en el HMAC cuando la orden no existe.
   - El limitador en memoria permite N reconsultas con N réplicas.
   - Un invitado en otra pestaña (sin `X-Pedido-Token`) recibe 404.
2. **BAJOs área 7**
   - Sanitizer en excepciones HTTP: dejar solo `simpleName` + status; quitar fragmentos `<...>` (XML) y emails.
   - 408/429 del IdP en `HaciendaTokenService:115-119` → `HaciendaTransitoriaException`.
   - En `FacturacionService:64`, el check de admin antes de `assertCanAccessNullable`.
   - El sanitizer no enmascara cédulas con puntos (`3.101.…`): agregar `.` como separador en `HaciendaLogSanitizer.enmascararConGuiones`, en un PR aparte.
3. **PR filtro empresa**: `OrdenCompraService:140` y `StockReservationService:59/136` usan `findAllByIdsForUpdate` sin filtrar por empresa.
4. **LOW de Dev Pagos (no corregir desde esta área)**: `SuscripcionOnvoChangeService.java:431-434` — en filas viejas sin `fechaFin`, un webhook de fallo atrasado deja `fechaFin` en el pasado y achica la gracia. Sugerencia: usar `max(finTrial, hoy)`.
5. **Decisión de Andrés**: valor de producción de `hacienda.emision-automatica` antes del deploy.

## Cómo continuar
1. Worktree nuevo desde `origin/master`, rama propia, fix + test de regresión, tests dirigidos.
2. Push y PR. Cuando CI esté verde, pedir APTO a HotClick Seguridad con: head exacto, base y `git diff origin/master...HEAD | sha256sum`.
3. Si master avanza: `git merge origin/master` (merge normal, sin rebase), push y pedir APTO nuevo sobre el head nuevo.
4. El merge lo hace HotClick CI/CD con `--match-head-commit <head con APTO>`. Después avisar al Mentor.
5. Falso positivo del gate SCALE1: label `skip-scale-gate` + comentario con la justificación en el PR.
