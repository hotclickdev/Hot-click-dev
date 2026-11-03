# Traspaso: HotClick QA 2 (área 2: plan Pyme y roles)

Fecha: 30-oct-2026, 12:00 hora Costa Rica (UTC-6). Reemplaza en contenido a `hotclick-qa-2.md` para el re-QA del área 2.

## Hash de master
- Re-QA hecho sobre master `649387e7945832d7f7027ca4bf6d4ab34b892013` (26-oct).
- Master vigente al escribir esta nota: `270236e3e0206f7bfcc1350e397084d7cea58d6e`, 293 commits por delante.
- En ese rango cambiaron `AdminAsignarController.java` y `EquipoService.java`. El listado de archivos de la comparación de GitHub puede venir truncado. **Hay que repetir la matriz y los tests sobre el hash vigente antes de dar veredicto.**

## Estado del re-QA del área 2: PENDIENTE
- PRs en master (verificados con `git merge-base --is-ancestor` sobre 649387e7):
  - [#348](https://github.com/hotclickdev/Hot-click-dev/pull/348): EDITOR y LECTOR sin acceso a billing, wallet, cobros y admin/pagos.
  - [#347](https://github.com/hotclickdev/Hot-click-dev/pull/347): trim del correo en el login y reenvío de verificación.
  - [#354](https://github.com/hotclickdev/Hot-click-dev/pull/354): plan con negocio pendiente de aprobación.
  - [#344](https://github.com/hotclickdev/Hot-click-dev/pull/344): visibilidad por impago.
  - [#342](https://github.com/hotclickdev/Hot-click-dev/pull/342): reactivación por impago solo con pago ONVO.
- Backend: 111 tests dirigidos, 0 fallos y BUILD SUCCESS (H2). Clases corridas:
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

## Matriz de rutas /api/admin/* abiertas a EMPRENDEDOR (H2, 649387e7)
| Método y ruta | PROPIETARIO | EDITOR | LECTOR | Lectura |
|---|---|---|---|---|
| GET /api/admin/dashboard | 200 | 200 | 200 | MEDIO: métricas del negocio visibles para EDITOR y LECTOR |
| GET /api/admin/ads/metricas | 200 | 200 | 200 | MEDIO |
| GET /api/admin/ads/gastos | 200 | 200 | 200 | MEDIO |
| GET /api/admin/mesas | 200 | 200 | 200 | MEDIO |
| GET /api/admin/asignar/buscar-cliente?q=… | 200 | 200 | 200 | MEDIO (con H2 vacía, falta probar con datos) |
| GET /api/admin/finanzas/reporte-iva | 500 | 500 | 500 | Sin probar: los tres pasan el filtro de rol y plan, luego la H2 no tiene la función `DATE`. El controlador no tiene guard de propietario. |
| POST ads/gastos, asignar/crear-cliente, mesas, importar/confirmar | 400 | 400 | 403 | El LECTOR queda bloqueado. El EDITOR llega a la validación. |
| POST importar/csv | 413 | 413 | 403 | Para el EDITOR no concluye (413 antes de la autorización) |
| POST asignar/compra | 403 | 403 | 403 | Cliente ajeno o LECTOR |
| POST /api/admin/reset-datos | 400 (pide contraseña) | 403 | 403 | OK: `exigirPropietario` actúa antes de pedir la contraseña |

Hallazgos:
- **MEDIO:** dashboard, ads, mesas y buscar-cliente están abiertas en lectura para EDITOR y LECTOR. Hay que decidir si es aceptable. Sube a ALTO si buscar-cliente o reporte-iva exponen datos de clientes o fiscales.
- **BAJO:** `GET /api/admin/asignar/buscar-cliente` sin `q` da 500 (MissingServletRequestParameter) en vez de 400.
- **BAJO o MEDIO:** `EquipoService.crearNuevo` no pone `correoVerificado=false` (el valor por defecto es true). Ese archivo cambió después de 649387e7, así que hay que revisar si ya se corrigió.

## Evidencia (box compartido)
- `/workspace/qa2-artefactos/`:
  - `QA2RolesAdminRutasMatrizTest.java`: test local, sin commitear.
  - `qa2-matriz-roles-admin-final.txt`: matriz final.
  - `qa2-mvn6.log`: log de la corrida final.
  - Corridas intermedias: `qa2-mvn3.log`, `qa2-mvn4.log` y `qa2-mvn5.log` (la 5 es la de reporte-iva con `reportes`).
- `/workspace/qa2-mvn2.log`: los 111 tests dirigidos.
- Clon de solo lectura: `/workspace/qa2-reqa`, en 649387e7 y limpio.

## Pendiente
1. Frontend: `vitest` y `tsc` de roles y plan Pyme (no se corrieron porque el box estaba saturado).
2. QA en staging local (backend `:8081`, front `:3000`):
   - Usar cuentas ficticias dueño, EDITOR y LECTOR, creadas solo después de avisar al QA líder. Borrarlas al terminar.
   - Confirmar 403 en billing, wallet, cobros, facturas y admin/pagos.
   - Confirmar que la UI oculta esas secciones.
   - Probar el login con espacios alrededor del correo.
3. reporte-iva en Postgres (staging local o Testcontainers) como EDITOR y LECTOR con el feature `reportes`.
4. Repetir la matriz y los tests sobre el master vigente y revisar los cambios en `AdminAsignarController` y `EquipoService`.
5. Decidir producto y seguridad sobre las lecturas MEDIO. Si se corrigen, se pide un test de 403 en CI.

## Cómo continuar (reglas)
- Correr solo tests dirigidos: `mvn -B test -Dtest=<Clases> -Dsurefire.failIfNoSpecifiedTests=false` con `MAVEN_OPTS=-Xmx1g` y las variables de CI de H2.
- La suite completa va solo bajo `flock /workspace/hotclick/.suite-completa.lock`.
- Detener solo los procesos propios y por PID. Nada de `pkill`. No tocar los procesos de staging de otros.
- ONVO solo en modo test (`onvo_test_`). Nunca producción: ni pruebas, ni datos, ni deploy.
- No escribir código de producto. Nada de push a master, merge, rebase ni force push. Los tests locales quedan fuera del repo o sin commitear.
- En reportes y docs: sin secretos, teléfonos, SINPE, cédulas ni datos reales. Las credenciales van en `.cred` del box y nunca se imprimen.
- Nunca dar algo por bueno sin evidencia, y anotar siempre el hash exacto.
