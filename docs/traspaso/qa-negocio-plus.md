# Traspaso — QA Negocio Plus: re-QA de las áreas 2 y 5

Contexto previo: `docs/traspaso/hotclick-qa-negocio-plus.md` (QA 3, se mantiene). Esta nota cubre el re-QA sobre master. Sin secretos ni datos reales.

| Campo | Detalle |
|---|---|
| **Tarea** | Re-QA de las áreas 2 (Negocio Plus, roles y billing) y 5 (suscripción, gracia, impago) sobre master `649387e7945832d7f7027ca4bf6d4ab34b892013` (merge #359, 26-oct-2026 18:52 hora de CR). |
| **Estado** | Área 2: **APTA con reservas**. Área 5: **APTA con reservas**. Las dos quedan así solo con tests automáticos del backend. |
| **Hecho** | Verifiqué que las correcciones están en master. **Área 2:** #348 (EDITOR/LECTOR reciben 403 en billing, wallet, cobros, facturas y admin/pagos), #347 (trim del correo en el login), #354 (QA3-P01), #332 (comisiones 9 / 7,5 / 6 %). **Área 5:** #333 (8 días de gracia, suspensión desde el día 9), #339 (suspensión manual y extensión de 3 días), #342 y #344 (el impago se reactiva solo con pago ONVO), #343 (cleanup de expiración), #356 y #357 (locks del pago manual, P-02). Corrí 137 tests JUnit en H2: 0 fallos, 0 errores, 0 omitidos. Clases clave: `RolesBillingWalletCobrosTest` (39), `AdminSuspensionExtensionTest` (40), `SuspensionImpagoInterceptorTest` (33), `OnvoBillingClientTest` (34), `DiasGraciaTest`, `VisibilidadImpagoTest`, `AuthCredentialLoginHandlerTest`, `AdminRutasRolTest`, `RolMembresiaTest`. |
| **Evidencia** | En el box (no en el repo): log `/tmp/qa3np.log` y reportes surefire en `/workspace/qa3-np-649387e/Hot_click_outlet/target/surefire-reports/`. Estado real al 30-oct-2026 12:05 hora de CR: **los dos existen** (log del 26-oct 19:17, 28 archivos de reporte). Son temporales del box: si se limpia, se regeneran corriendo esas clases dirigidas sobre el mismo hash. |
| **Archivos** | Solo esta nota. QA no tocó código. |
| **Riesgos** | No se levantó la app viva (HTTP, Mailpit). No se corrió E2E de ONVO en modo test. No se corrió Flyway sobre Postgres limpio (V196 a V200). El trim del correo no está probado en la invitación (solo en el login). |
| **Bloqueos** | Sin fix en master (ya pasados al Mentor): (1) el LECTOR invitado entra con `correoVerificado=true` sin verificar; (2) QA3-P02, nombre y apellido invertidos en la invitación (`EquipoService`, línea 108); (3) QA3-P03, el dashboard cuenta 1 usuario con 2 miembros. Los datos de prod (productos 668/669 y miembro 138) le tocan a Andrés. La prueba viva espera el aviso de HotClick QA. |
| **Siguiente paso** | Esperar que HotClick QA avise que el staging local (backend `:8081`, Postgres, perfil dev; Mailpit en `:8025`) está en el hash nuevo. Ahí correr **una sola vez** la prueba HTTP de invitación y roles con datos ficticios, más ONVO en modo test y Flyway. |

## Reglas para continuar
- En local, solo tests dirigidos (`-Dtest=...`); las suites completas las corre CI.
- Cualquier suite completa o app local va con `flock /workspace/hotclick/.suite-completa.lock`, una a la vez. Al terminar, detené tus procesos por PID.
- ONVO solo en modo test; nada en prod.
- El trabajo de QA lo asigna el Mentor. No hay permisos de push a master, merge ni secretos.
