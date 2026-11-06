# Traspaso: QA Emprendedor (QA 1), re-QA del área 2

Fecha: 30-oct-2026 (hora CR). Rol: QA 1, solo QA. No toca código, no hace merge ni deploy, y no toca prod.

## Alcance
Re-QA del área 2: plan Emprendedor, registro, plan, perfil y el panel `/emprendedor/*`, sobre master `792e407a20d412bf6d8d3b62225b0d36cf869458` (merge del #360). Correcciones incluidas: #344, #347, #348, #354 y #360.

## Estado de las pruebas
| Prueba | Resultado |
|---|---|
| Backend del área 2: 28 clases (Alta/Registro/Auth/Emprendedor/Plan/Roles, AdminRutasRol, IdorVendedorHotfix, SinpeRevisionAuthorization) | 312 tests, 0 fallos, 0 errores, 1 skipped (corrido en `649387e7`, que difiere de `792e407a` solo por el #360) |
| Backend del #360 sobre `792e407a` | CacheEvictEmpresaSinIdTest 2/2, EmprendedorProductoTest 37/37, EmprendedorPedidoTest 29/29 |
| Frontend vitest (suite completa) | 211 archivos, 1165 tests OK |
| e2e Playwright (emprendedor-wizard, emprendedor-sidebar, registro-vender, sistema-planes, store-perfil) | 30/33. Fallan `sistema-planes:85` y `:101`, que ya fallaban antes (están documentados como previos), y `store-perfil:56` |

### store-perfil:56: regresión BAJA (test desactualizado)
- Pasa en `14e841e3`, falla en `792e407a` y se reproduce en aislado: `getByRole('banner')` aparece visible y el test espera que esté oculto (línea 73 del spec).
- Un `git bisect --first-parent` ubica como primer commit malo el `86c0b86d`, «feat(nav): dejar el logo de HotClick y las migas…», del 5-oct-2026. Su padre `bac706b3` pasa.
- Ese commit muestra a propósito el header con el logo en el perfil del negocio y no actualizó el spec. Está fuera de `/emprendedor/*` y fuera del subconjunto e2e de CI. Falta que negocio confirme si el header visible es lo que se busca.
- Arreglo sugerido (no aplicado): actualizar la aserción del spec, o restaurar el comportamiento si el cambio no era intencional.

## Evidencia (en la box)
- Surefire: `/tmp/hc/Hot_click_outlet/target/surefire-reports/`
- e2e: `/tmp/hc-e2e2.log`
- Bisect: `/tmp/hcq/bisect.log`
- Base que pasa: `/tmp/hcq/e2e-14e841e3.log`
- Scripts: `/tmp/hcq/run.sh` (corre un commit en un worktree propio) y `/tmp/hcq/pred.sh` (predicado del bisect)

## Pendientes
1. **HTTP real de roles EDITOR y LECTOR** en staging `:8081`, con cuentas ficticias. Mailpit está en `:8025` y QA 4 ya sembró los OTP. Se hace **una sola corrida, y solo cuando HotClick QA avise** que el staging está en el hash nuevo. Como el plan Emprendedor permite 2 usuarios, se prueban de a uno: invitar, probar y quitar. Al terminar se borran las cuentas.
2. **ONVO:** lo cubre HotClick QA en C1.
3. **Limpieza de los productos de prueba en prod:** la decide Andrés. Este rol no toca prod.

## Veredicto
**PENDIENTE, con inclinación a APTA.** Falta el HTTP real de roles. store-perfil:56 es BAJO y no bloquea, salvo que HotClick QA decida otra cosa.

## Reglas de la box
- En local se corren solo tests dirigidos. Las suites completas, o levantar la app, van bajo `flock /workspace/hotclick/.suite-completa.lock`.
- Al terminar, detener los procesos propios por PID. Nunca `pkill -n` y no tocar los procesos `hotclick-staging-*`.
- Trabajar en un clon propio y fuera del repo principal.
- La box tiene poco margen de inotify: levantar Vite con `CHOKIDAR_USEPOLLING=true`.
- Node 22: `/home/box/tools/node-v22.20.0-linux-x64/bin`.
- Sin secretos, teléfonos, SINPE ni cédulas reales en los reportes.

## Cómo continuar
1. Esperar el aviso de HotClick QA de que el staging está en el hash nuevo. Verificar el hash antes de empezar.
2. Correr los casos HTTP de roles: login genérico, normalización de correo, y EDITOR/LECTOR contra `/api/billing/*`, `/api/metodos-cobro`, wallet y admin/pagos (esperado: 403), más la edición de productos (EDITOR sí, LECTOR no). Guardar la evidencia saneada.
3. Borrar las cuentas ficticias, detener los procesos propios por PID y reportar en formato Tarea | Estado | Evidencia, con el hash y el veredicto APTA / NO APTA.
