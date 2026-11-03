# Traspaso — HotClick QA Negocio Plus (QA 3)

> Nota principal de este bot. `docs/traspaso/qa-negocio-plus.md` ya quedó integrada acá y solo apunta a este archivo. Sin secretos ni datos reales: solo dice dónde están las cosas.

## 1) Rol y descripción para recrearme
- **Nombre y título:** HotClick QA Negocio Plus.
- **Descripción:** QA 3 de HotClick. Probás la cuenta del plan **Negocio Plus** (área 2, cuentas, roles y billing; área 5, suscripción, gracia e impago). Todo lo probás desde la app, con **ONVO solo en modo test**. Repo: `hotclickdev/Hot-click-dev`. Plan de referencia: `plan-qa-funcional-2026-10-23.md`, sección QA 3.
- **A quién reportás:** a Grok Bot. El trabajo de QA te lo asigna el **Mentor** (habla por Andrés) por medio de **HotClick QA** (el QA líder). Nunca le escribís a Andrés ni a humanos por privado.
- **Lo que no hacés:** no tocás código ni hacés deploy, y nunca borrás datos de producción (eso le toca a Andrés).
- **Formato de reporte:** Tarea | Estado | Hecho | Evidencia | Archivos | Riesgos | Bloqueos | Siguiente paso.

## 2) Reglas
- Nunca digás que algo pasa sin evidencia.
- Sin push a master, sin merge y sin secretos.
- En git: sin rebase ni force push. Si el push choca, `git pull --no-rebase` (merge normal) y reintentá.
- En local, solo tests dirigidos (`-Dtest=...`); las suites completas las corre CI.
- Cualquier suite completa o app local va con `flock /workspace/hotclick/.suite-completa.lock`, una a la vez. Al terminar, detené tus procesos por PID.
- No usés cloud agents de Cursor; trabajá directo en el box.
- ONVO solo en modo test; nada de dinero real en prod.

## 3) Hecho
**Re-QA de áreas 2 y 5 sobre master `649387e7945832d7f7027ca4bf6d4ab34b892013`** (merge #359, 26-oct-2026 18:52 hora de CR).
- Área 2: **APTA con reservas**. Área 5: **APTA con reservas**. Solo con tests automáticos del backend: **137 tests JUnit en H2, 0 fallos**, 0 errores, 0 omitidos.
- PRs verificados en master:
  - Área 2: #348 (EDITOR/LECTOR reciben 403 en billing, wallet, cobros, facturas y admin/pagos), #347 (trim del correo en el login), #354 (QA3-P01, suscripción mostraba FREE con plan NEGOCIO_PLUS), #332 (comisiones 9 / 7,5 / 6 %).
  - Área 5: #333 (8 días de gracia, suspensión desde el día 9), #339 (suspensión manual y extensión de 3 días), #342 y #344 (el impago se reactiva solo con pago ONVO), #343 (cleanup de expiración), #356 y #357 (locks del pago manual, P-02).
- Clases clave: `RolesBillingWalletCobrosTest`, `AdminSuspensionExtensionTest`, `SuspensionImpagoInterceptorTest`, `OnvoBillingClientTest`, `DiasGraciaTest`, `VisibilidadImpagoTest`, `AuthCredentialLoginHandlerTest`, `AdminRutasRolTest`, `RolMembresiaTest`.
- Antes (23 al 26-oct): área 2 probada en staging local `f9f0e506` (QA3-017 cerrado con 403; LECTOR no escribe) y en prod 24-oct con cuenta de prueba (QA3-P01, P02, P03).
- Commits de traspaso anteriores: `7621a0170ad1aa4b48593bff7144ef481b5a7877` y el merge `570a1c4ea3519682e6ac039520b8bb43050ae8dc`.
- Ramas/PRs propios: ninguno (QA no tiene código).

## 4) Pendiente
- [PENDIENTE] Prueba HTTP de invitación y roles en el staging local (backend `:8081`, Mailpit `:8025`), **una sola vez** y con datos ficticios, cuando HotClick QA avise que está en el hash nuevo.
- [PENDIENTE] E2E de ONVO en modo test.
- [PENDIENTE] Flyway sobre Postgres limpio (V196 a V200).
- [PENDIENTE] Trim del correo en la invitación (#347 solo cubre el login).
- Bugs sin fix en master, ya pasados al Mentor:
  - El LECTOR invitado entra con `correoVerificado=true` sin haber verificado.
  - QA3-P02: nombre y apellido invertidos en la invitación (`EquipoService`, línea 108).
  - QA3-P03: el dashboard cuenta 1 usuario con 2 miembros.
- Datos de prod (productos 668/669 y miembro 138): los limpia Andrés. Detalle en `docs/traspaso/evidencia/hotclick-qa-negocio-plus/prod-limpieza.md`.
- Billing de planes pagos (N2–N6, QA3-005) pospuesto: sin tarjeta ni cambio de plan hasta nueva orden.
- Confirmar que #332 está desplegado (prod del 24-oct devolvía 7 % con mínimo ₡700 para Negocio Plus).

## 5) Rutas y evidencia
Estado real revisado el 02-nov-2026 22:58 hora de CR:
- `/tmp/qa3np.log` (box): **ya no existe** (se limpió el temporal).
- `/workspace/qa3-np-649387e/Hot_click_outlet/target/surefire-reports/` (box): **existe**, 28 archivos de reporte (`TEST-*.xml` y `.txt`).
- En el repo: `docs/traspaso/evidencia/hotclick-qa-negocio-plus/` (reportes .md y logs HTTP cortos redactados).
- `/workspace/qa-funcional/qa3/` (box anterior): **ya no existe**.
- Si falta algo, se regenera corriendo las clases dirigidas de la sección 3 sobre el mismo hash. Las credenciales nunca se suben; viven en el vault del usuario.

## 6) Próximos pasos exactos
1. Leé esta nota y `docs/traspaso/README.md`; confirmá con HotClick QA qué hash tiene el staging local.
2. Esperá el aviso de HotClick QA de que el staging (`:8081`, Mailpit `:8025`) está en el hash nuevo. No lo levantés vos sin `flock`.
3. Corré **una vez** la prueba HTTP de invitación y roles con datos ficticios: invitá EDITOR y LECTOR, activá por Mailpit, verificá 403 en billing/wallet/cobros/facturas, trim del correo en la invitación, `correoVerificado` y nombre/apellido.
4. Corré ONVO E2E en modo test (pago, gracia, impago y reactivación).
5. Corré Flyway V196–V200 sobre Postgres limpio, con `flock`.
6. Detené tus procesos por PID.
7. Reportá a HotClick QA con el formato de la sección 1, con hash exacto y APTA/NO APTA por área.
8. Cuando haya fix de LECTOR verificado, QA3-P02 y QA3-P03, re-probalos sobre el hash del fix.
