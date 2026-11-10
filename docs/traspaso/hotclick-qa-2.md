# Traspaso: HotClick QA 2 (área 2: plan Pyme y sus roles)

Actualizado el 2-nov-2026, 22:55 hora Costa Rica (UTC-6), para la migración de cuenta. Es la nota principal de QA 2 y reemplaza a la versión del 26-oct (commit `3b712b96`). `qa-2.md` solo apunta acá.

## 1. Rol y descripción para recrearme (texto literal)
> QA 2 de HotClick: plan Pyme y sus roles (área 2), coordinado con HotClick QA. Probás desde la propia app, con ONVO solo en modo test. Repo hotclickdev/Hot-click-dev. No tocás código ni hacés deploy; nunca borrás datos de producción; nada de secretos, teléfonos, SINPE ni cédulas reales en reportes; nunca digas que algo pasa sin evidencia. Español de Costa Rica con voseo. Formato de reporte: Tarea | Estado | Hecho | Evidencia | Archivos | Riesgos | Bloqueos | Siguiente paso.

## 2. Reglas vigentes
- **Asignación:** las tareas llegan del Mentor y de HotClick QA, el QA líder. Los resultados se le reportan a HotClick QA con el hash exacto y el veredicto APTA, NO APTA o PENDIENTE.
- **Tests:** en local se corren solo tests dirigidos: `mvn -B test -Dtest=<Clases> -Dsurefire.failIfNoSpecifiedTests=false` con `MAVEN_OPTS=-Xmx1g`, desde `Hot_click_outlet/`.
  - Variables de CI para H2, solo con valores ficticios: `DB_URL=jdbc:h2:mem:testdb`, `DB_USERNAME=sa`, `DB_PASSWORD=` vacío, `JWT_SECRET=test-secret-for-ci-only-not-production`, `SENTRY_DSN=` vacío, `STRIPE_SECRET_KEY=ci-mock-not-a-stripe-key`, `STRIPE_WEBHOOK_SECRET=whsec_placeholder`.
  - La suite completa corre solo bajo `flock /workspace/hotclick/.suite-completa.lock`. El box es compartido y se satura.
- **Procesos:** detener solo los propios y por PID. Nada de `pkill`. No tocar staging ni los procesos de otros bots.
- **Staging local** (backend `:8081`, front `:3000`):
  - Solo con cuentas ficticias (dueño, EDITOR, LECTOR), creadas después de avisar al QA líder y borradas al terminar.
  - Nunca producción: ni pruebas, ni datos, ni deploy.
- **ONVO:** solo en modo test, con llaves `onvo_test_`.
- **Código y git:**
  - QA no commitea código de producto ni de test.
  - Nada de push a master, merge de PRs, rebase ni force push.
  - Los docs de traspaso se suben a `docs/traspaso-cuenta-nueva`. Si el push choca, `pull --ff-only` o un merge normal.
  - Trabajar en un clon o worktree aparte.
- **Credenciales:** van en archivos `.cred` del box y se cargan sin imprimirlas. Nunca van al repo ni a los reportes.
- **Evidencia:** nada se da por bueno sin ella. Anotar siempre el hash exacto.

## 3. Lo hecho (con hashes)
- **Re-QA del área 2 sobre master `649387e7945832d7f7027ca4bf6d4ab34b892013`** (26-oct). Veredicto: **PENDIENTE**.
  - PRs revisados, los cinco en master (verificado con `git merge-base --is-ancestor`):
    - [#348](https://github.com/hotclickdev/Hot-click-dev/pull/348): EDITOR y LECTOR reciben 403 en billing, wallet, cobros, facturas y admin/pagos.
    - [#347](https://github.com/hotclickdev/Hot-click-dev/pull/347): trim del correo en el login y reenvío de verificación.
    - [#354](https://github.com/hotclickdev/Hot-click-dev/pull/354): plan con negocio pendiente de aprobación.
    - [#344](https://github.com/hotclickdev/Hot-click-dev/pull/344): visibilidad por impago.
    - [#342](https://github.com/hotclickdev/Hot-click-dev/pull/342): reactivación por impago solo con pago ONVO.
  - 111 tests dirigidos en H2, 0 fallos y BUILD SUCCESS:
    - `RolesBillingWalletCobrosTest` (39)
    - `RolesLectorDenyPorDefectoTest` (7)
    - `RolesLectorSoloLecturaTest` (3)
    - `RolesEquipoEscrituraTest` (2)
    - `EmprendedorEquipoTest` (32)
    - `PropietarioWalletGuardTest` (2)
    - `SinpeRevisionAuthorizationTest` (6)
    - `AdminRutasRolTest` (9)
    - `IdorVendedorHotfixTest` (11)
  - Revisión de código: `PropietarioGuard.exigirGestionEmpresa` solo deja pasar al PROPIETARIO sin impersonación o al ADMIN de plataforma. `/api/admin/pagos/**` exige `ROLE_ADMIN` o `global.metrics`.
- **Matriz de rutas `/api/admin/*` abiertas a ROL_EMPRENDEDOR** (H2, sobre 649387e7):

| Método y ruta | PROPIETARIO | EDITOR | LECTOR | Lectura |
|---|---|---|---|---|
| GET dashboard | 200 | 200 | 200 | MEDIO |
| GET ads/metricas, ads/gastos | 200 | 200 | 200 | MEDIO |
| GET mesas | 200 | 200 | 200 | MEDIO |
| GET asignar/buscar-cliente?q=… | 200 | 200 | 200 | MEDIO (H2 vacía, falta probar con datos) |
| GET finanzas/reporte-iva | 500 | 500 | 500 | Sin probar: los tres pasan el filtro de rol y plan, luego la H2 no tiene la función `DATE` |
| POST ads/gastos, asignar/crear-cliente, mesas, importar/confirmar | 400 | 400 | 403 | El LECTOR queda bloqueado |
| POST importar/csv | 413 | 413 | 403 | Para el EDITOR no concluye |
| POST asignar/compra | 403 | 403 | 403 | Cliente ajeno o LECTOR |
| POST reset-datos | 400 (pide contraseña) | 403 | 403 | OK |

  - Hallazgos:
    - MEDIO: dashboard, ads, mesas y buscar-cliente están abiertas en lectura para EDITOR y LECTOR.
    - BAJO: buscar-cliente sin `q` da 500 en vez de 400.
    - BAJO o MEDIO: `EquipoService.crearNuevo` no pone `correoVerificado=false`.
- **Nota de traspaso intermedia:** `docs/traspaso/qa-2.md`, commit `80185b9fddf2285d660d4fa277b391914a97b216`.

### Rama propia
**No tengo rama de código propia, a propósito.** El test de la matriz, `QA2RolesAdminRutasMatrizTest.java`, vive fuera del repo, en `/workspace/qa2-artefactos/`, porque QA no commitea código. Para repetir la matriz: copialo a `Hot_click_outlet/src/test/java/com/hotclick/integration/` en un clon aparte, corré solo esa clase y volvé a sacarlo. `git status` tiene que quedar limpio. El test escribe su resultado en `/workspace/qa2-matriz-roles-admin-final.txt`.

Las ramas `wip/qa2-*` de la nota anterior (XSS y test inestable) están sobre una base vieja (`eb7564c24`), sin PR. Hay que compararlas con master y decidir con el Mentor si se cierran.

### Bugs heredados (nota del 26-oct)
- QA2-007, QA2-014 y QA2-015 (chatbot): ALTO, abiertos.
- Limpieza en producción de la prueba del 24-oct (productos de prueba, bodega de prueba e invitados de prueba): **solo la hace quien Andrés autorice. QA 2 no borra nada en producción.**

## 4. Evidencia (box compartido)
- `/workspace/qa2-artefactos/`:
  - `QA2RolesAdminRutasMatrizTest.java`
  - `qa2-matriz-roles-admin-final.txt`: matriz final.
  - `qa2-mvn6.log`: log de la corrida final.
  - Corridas intermedias: `qa2-mvn3.log`, `qa2-mvn4.log` y `qa2-mvn5.log` (la 5 es la de reporte-iva con `reportes`), y las matrices intermedias.
- `/workspace/qa2-mvn2.log`: los 111 tests dirigidos.
- `/workspace/qa2-reqa`: clon de solo lectura en 649387e7, limpio.
- `/workspace/qa2-traspaso`: clon de la rama de docs.

## 5. Pendiente
- [PENDIENTE] Re-QA sobre el master vigente. Al 2-nov-2026, 22:55 CR, master es `61b36a382007154363403ca85946e204704ee6d9`; verificalo con `git ls-remote origin refs/heads/master`. Después de 649387e7 cambiaron `AdminAsignarController.java` y `EquipoService.java`.
- [PENDIENTE] Frontend: `vitest` y `tsc` de roles y plan Pyme.
- [PENDIENTE] reporte-iva en Postgres, como EDITOR y LECTOR, con el feature `reportes`.
- [PENDIENTE] QA en staging local `:8081`:
  - Cuentas ficticias dueño, EDITOR y LECTOR, creadas después de avisar al QA líder y borradas al terminar.
  - 403 en billing, wallet, cobros, facturas y admin/pagos.
  - La UI oculta esas secciones.
  - Login con espacios alrededor del correo.
  - buscar-cliente con datos.
- [PENDIENTE] Veredicto del área 2 (APTA o NO APTA) sobre el hash exacto, reportado a HotClick QA.

## 6. Próximos pasos exactos
1. `git ls-remote https://github.com/hotclickdev/Hot-click-dev refs/heads/master`: anotá el hash.
2. `git clone` en `/workspace/qa2-reqa-<hash8>`, sin tocar los clones de otros.
3. Revisá `git diff 649387e7..<hash> -- Hot_click_outlet/src/main/java/com/hotclick/{controller/AdminAsignarController.java,service/EquipoService.java,security/}`.
4. Corré los 9 tests dirigidos de la sección 3 y después la matriz, copiando el test y retirándolo al terminar. Guardá los logs en `/workspace/qa2-artefactos/<hash8>/`.
5. En `Hot_click_outlet/frontend`: `npx tsc --noEmit -p tsconfig.json` y `npx vitest run` con los specs de roles y planes. No hagas `pnpm build` sin `--outDir` temporal.
6. Avisale al QA líder antes de crear cuentas ficticias en staging `:8081`. Probá desde la app con ONVO test y borrá las cuentas al terminar.
7. Reportá con el formato de la sección 1, el hash y el veredicto.
