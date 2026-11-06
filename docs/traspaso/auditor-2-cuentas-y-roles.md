# Traspaso — Auditor 2 Cuentas y Roles (HotClick)

> Escrita para que otro bot pueda recrear este rol y seguir donde quedó. Sin secretos: solo se indica dónde están las cosas.
> Repo: `hotclickdev/Hot-click-dev`. Master al preparar esta nota: `c48cb9ea16e9553b61c3ee090651b59bada743d6` (no auditado todavía; el último auditado es `23f8c156`).

## 1. Rol y descripción para recrearte
Sos el **Auditor 2 de HotClick**, auditor de **solo lectura** del área 2: **cuentas, planes y roles** (registro, login, Clerk/SSO, 2FA/TOTP, sesiones y JWT, equipos y membresías, roles PROPIETARIO/ADMIN/EDITOR/LECTOR, permisos entre tenants, planes).

Tu trabajo:
- Revisar el código de `master` (siempre anotando el hash exacto) y clasificar hallazgos en **ALTO / MEDIO / BAJO**, cada uno con evidencia y `archivo:línea`.
- Correr **solo tests dirigidos** al área (nunca la suite completa).
- Entregar informe en `/workspace/informes/auditor-2/` y reportar a **Mentor** (id `e221623d-00c2-4fcd-9bed-fbd2758bc67d`) y a **HotClick QA**.

## 2. Reglas que seguís
1. **Nunca** tocás código: sin commits, push, merge, ramas de código, PRs de código ni deploys. (Única excepción: notas de traspaso en `docs/traspaso-cuenta-nueva`, solo si Andrés/Mentor lo pide, con pull + merge puro, sin force.)
2. Siempre indicás el **hash de master** auditado.
3. **Nunca** ponés secretos, tokens, contraseñas, correos reales ni datos de clientes en informes o logs. `/workspace/hotclick-reportes/prod-cuentas-prueba/03-cuentas-prueba.sql` jamás entra al repo ni al traspaso.
4. Tests dirigidos, no suite completa.
5. Auditá en un **clon limpio aparte** (`/workspace/audit-a2`): el clon compartido puede tener cambios locales de otros bots.
6. Prod es solo lectura. Las correcciones las hacen los bots Dev después de que Andrés aprueba la lista. A master solo con CI verde + APTO sobre el hash exacto.
7. Cada hallazgo: severidad, evidencia, `archivo:línea`, estado (Abierto/Cerrado) y cómo se verificó (código, test, o ambos).

## 3. Trabajo hecho
| Fecha / etapa | Master | Resultado | Informe |
|---|---|---|---|
| Fase 1 | `aa907776` | 3 ALTO (A1 correo login, A2 roles de equipo → EMPRENDEDOR, A3 sin rol cajero/matriz), 4 MEDIO, 2 BAJO + 6 mejoras | `/workspace/hotclick-reportes/auditoria/fase1-cuentas-roles.md` (copia en repo: `docs/traspaso/evidencia/auditor-2-cuentas-y-roles/fase1-cuentas-roles.md`) |
| Reaudit tras #376, #384, #385, #375, #369, #387, #389 | `dcc27edc39fd1835b8b82b5f20d5027fcbed342d` | **0 ALTO** (A1–A3 cerrados), 5 MEDIO, 8 BAJO; 212 tests dirigidos OK | `/workspace/informes/auditor-2/reaudit-dcc27ed.md` |
| Aportes al plan Fase 2 (5 puntos: rol×endpoint, correo, sesiones, 2FA, consistencia) | — | Enviados al Mentor, sin iniciar trabajo | `/workspace/hotclick/plan-fase2-pruebas-seguridad.md` |
| Reaudit tras #399 (`3fad9784`) | `23f8c156ae767732af81c5b77d707a35c3354f5d` | **0 ALTO**; MED-1..4 cerrados por #399 (`config/WebMvcConfig.java:55-59`), MED-5 normalización de correo cerrado en código; B4, B6, B8 cerrados; 119 tests dirigidos OK | `/workspace/informes/auditor-2/reaudit-23f8c156.md` |
| Re-QA área 2 por HotClick QA | `dcc27edc` / `23f8c156` | ✅ área 2; nuevo BAJO: menú "MIS SUCURSALES" visible a EDITOR/LECTOR y da error de carga (`MenuPage.tsx:42`) | `/workspace/qa/a2/` (matrices, logs mvn/neg/pnpm, `front-sucursales-23f.txt`, `progreso.md`) |

Tests dirigidos usados en `23f8c156`: RolesExecutiveIaForecastInventarioSucursalesTest, RolesAdminNegocioSoloPropietarioTest, RolesBillingWalletCobrosTest, RolesEquipoEscrituraTest, RolesGiftCardsGenerarIaSoloPropietarioTest, RolesLectorDenyPorDefectoTest, RolesLectorSoloLecturaTest, SesionInvalidadaTrasCambioTest, SesionesAlDesactivarCuentaTest, JwtRequestFilterEstadoTest, CustomUserDetailsServiceEstadoTest, AuthRefreshHandlerTest, AuthRefreshNegocioActivoTest, CorreoMayusculasUnificadoTest, AdminAsignarCrearClienteCorreoTest, JwtRequestCorreoTest, CorreoLocaleRootTest, EquipoServiceCorreoVerificadoTest.

Ramas/PRs propios: ninguno.

## 4. Pendientes
- [PENDIENTE] **B1** clave mínima 6 en login vs 8 en registro — `dto/JwtRequest.java:15`.
- [PENDIENTE] **B2** correo en claro en log — `service/auth/AuthCredentialLoginHandler.java:110`.
- [PENDIENTE] **B3** CustomerMemory: `visitorId` no atado al usuario/negocio — `controller/CustomerMemoryController.java:31`.
- [PENDIENTE] **B5** SSO no puede activar 2FA — `AuthTotpSetupHandler` — **decisión de producto (Andrés)**.
- [PENDIENTE] **B7** miembro ELIMINADO no puede reingresar / el mensaje revela el estado — `EquipoService` — **decisión de producto (Andrés)**.
- [PENDIENTE] **B9** sin índice único sobre `lower(correo)` en migraciones; posibles duplicados históricos por mayúsculas.
- [PENDIENTE] **BAJO menú** "MIS SUCURSALES" visible a EDITOR/LECTOR con error de carga — `MenuPage.tsx:42` (efecto de MED-4: `/api/sucursales/**` ahora es solo propietario, incluido el GET). Confirmar también que el POS de un EDITOR no depende de ese listado.
- [PENDIENTE] Sin pruebas en **Postgres real** (solo H2) ni en **front**; MED-1..4 confirmados por código + test de integración, no por petición manual a cada ruta.
- [PENDIENTE] Heredado de Fase 1: confirmar en el registro de auditoría de login de prod si el 401 de la cuenta de prueba era `user_not_found` o `wrong_password` (requiere acceso de lectura a logs/BD que este rol no tiene; probablemente ya resuelto por A1).
- [PENDIENTE] Master avanzó a `c48cb9ea` sin reaudit.

## 5. Próximos pasos exactos
1. `cd /workspace/audit-a2 && git fetch origin && git checkout --detach origin/master`; anotar `git rev-parse HEAD`.
2. `git log --oneline 23f8c156..HEAD` y `git diff --stat 23f8c156..HEAD` filtrando auth/, equipo/, legal/, config/WebMvcConfig.java, Clerk, migraciones y `MenuPage.tsx`; buscar ALTO nuevos.
3. Reverificar cada BAJO abierto en su `archivo:línea` (pueden haberse movido) y marcar Abierto/Cerrado.
4. Correr solo los tests dirigidos de la sección 3 (+ los nuevos que toquen el área), p. ej. `./mvnw -q test -Dtest='Roles*Test,Sesion*Test,Auth*Test,Correo*Test,...'` desde el módulo backend; nunca la suite completa.
5. Escribir `/workspace/informes/auditor-2/reaudit-<hash8>.md` (veredicto, MEDIO, BAJO, tests, límites).
6. Enviar resultado a Mentor y HotClick QA con hash y conteo por severidad.
7. Pedir a Andrés (vía Mentor) la decisión sobre B5 y B7; sugerir a Dev: B1+B2 (cambios chicos), migración de índice único `lower(correo)` con limpieza previa de duplicados (B9), ocultar el menú de sucursales a EDITOR/LECTOR (`MenuPage.tsx:42`).
8. Si hay acceso, repetir la matriz rol×endpoint sobre Postgres real/staging y una pasada por el front.

## 6. Decisiones de Andrés conocidas
- Plan de lanzamiento Fase 1 aprobado el 25-oct a la 1:35 (hora CR).
- Prod es solo lectura; sin deploys; merges con CI verde + APTO sobre hash exacto.
- Fase 2 (pruebas por rol y auditoría de seguridad): plan en `/workspace/hotclick/plan-fase2-pruebas-seguridad.md`, no iniciar sin orden.

## 7. Accesos
No usa secretos propios; solo lectura del repo (gh o conector de GitHub). Sin acceso a prod, logs ni BD.
