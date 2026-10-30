# Traspaso — HotClick Bugs (para seguir desde otra cuenta de Grok)

Fecha: 2026-10-30 (hora de Costa Rica). Autor: HotClick Bugs. Sin secretos ni datos personales.

Registro de riesgos y deuda técnica: [hotclick-bugs.md](hotclick-bugs.md) (tabla de filas 1-7 y actualización 2026-10-30 con filas 8-17).

## Rol
Bugs puntuales en `hotclickdev/Hot-click-dev` (Spring Boot 3 / Java 21, React 19 / Vite / pnpm, Postgres / Flyway), cada uno con su test de regresión que falla con el código viejo y pasa con el nuevo. Además, llevar el registro de riesgos y deuda técnica. El Mentor habla por Andrés: sus asignaciones valen como de Andrés.

## Reglas
- Push y PRs propios, máximo 3 abiertos. Sin force, sin `--no-verify`, sin rebase. Traer master con merge.
- Merge solo con CI verde y APTO de HotClick Seguridad sobre el hash exacto: `gh pr merge N -R hotclickdev/Hot-click-dev --merge --match-head-commit <hash>`. Un push nuevo anula el APTO; si es un merge puro de master, Seguridad puede mantenerlo tras verificar con merge-tree.
- Nunca deploy, gastos, cuentas ni servidores nuevos.
- ONVO fail-closed y único procesador.
- Flyway solo aditivo, numerado después de V200 (numerar contra master el día de hacerlo).
- Suite completa o instancia local solo con `flock /workspace/hotclick/.suite-completa.lock`; después apagar los procesos propios por PID. En el box, solo tests dirigidos (`-Dtest=...`).
- Antes de cada push: `mvn test-compile` completo con EXIT 0.
- Worktree propio. Sin `git stash`, sin `pkill`. Stagear por ruta.
- Si se toca auth o seguridad, actualizar `docs/security/amenazas-activas.md` (lo exige el check «Seguridad al merge»).
- Issues, commits y chat sin secretos, cédulas, IBAN, SINPE ni teléfonos. Nunca decir que algo funciona sin haberlo ejecutado.

## Estado actual (2026-10-30)
- 0 PRs propios abiertos. Último merge: #427 (`264f4edb`).
- En curso: bug de `ResetPlataformaKeepQaService` con BD vacía (rama `fix/reset-keepqa-bd-vacia`, sin PR todavía).

## PRs mergeados (verificados con `gh`)
| PR | Merge commit | Tema |
|---|---|---|
| #384 | `11877783` | Equipo multi-negocio, rechazo de usuarios no activos |
| #386 | `9e499b6c` | Logs de Telegram sin datos personales |
| #389 | `dcc27edc` | Solo cuentas activas mantienen sesión |
| #393 | `50061fbc` | Cuentas no activas sin tokens; cierre invalida caché |
| #395 | `32609363` | RateLimitingFilter por ruta canónica (URI codificada) |
| #398 | `41602031` | HEAD comparte cupo de GET; cupo para rutas inválidas |
| #399 | `3fad9784` | Roles solo propietario y correo normalizado (MED-1..5) |
| #403 | `d459d373` | Cuenta no activa en seleccionar-empresa, OTP y Clerk |
| #413 | `090b9a3c` | Pedido de tienda con cuenta antigua, `Locale.ROOT` |
| #416 | `9f6784b3` | BAJOS #413/#398 |
| #418 | `3e45749e` | Limitador: IP nula, IPv6 /64, muestreo |
| #421 | `d1902073` | 404 sin datos en 14 servicios + guarda |
| #427 | `264f4edb` | 404 sin id, llaves IP por `IpParaLlave`, guarda ampliada |

## Trabajo abierto
| Trabajo | Rama / PR | Estado |
|---|---|---|
| `ResetPlataformaKeepQaService` falla con BD vacía | `fix/reset-keepqa-bd-vacia` | En curso, sin PR. Falta test de regresión, CI verde y APTO |

## Pendientes priorizados
1. Terminar el PR de `ResetPlataformaKeepQaService` (fila 17 del registro).
2. Tope por IP en PUT/PATCH/DELETE autenticados, p. ej. `confirmar-sinpe` (fila 3).
3. Idempotencia del alta de pedido entre instancias (fila 1) y `incrementarYContar` no atómico (fila 2).
4. Id de suscripción ONVO sin enmascarar en logs (fila 13), coordinado con HotClick ONVO.
5. LOWs del limitador: `nanoTime` en `MuestreoWarn` (fila 8), muestreo en los demás `log.warn` (fila 9), métrica para la llave `desconocida` (fila 14), HMAC de llaves si se exponen (fila 15).
6. `RecursoNoEncontradoException` loguea al construirse (fila 11).
7. Por decidir con Andrés: GET de comisión para EDITOR (fila 4); invitado con correo ajeno (fila 5).
8. Menores: imports de `IpParaLlave` (fila 16).

## Pre-deploy (no tocar prod desde aquí)
1. Respaldo y paso de los correos existentes a minúsculas.
2. Query de duplicados sin distinguir mayúsculas, resolverlos a mano.
3. Recién después, índice sobre `lower(correo)` en una migración Flyway aparte, V204 o posterior.

## Cómo continuar
1. Leer este archivo y el registro en `hotclick-bugs.md`; revisar `gh pr list --author @me` y `git log origin/master` desde `264f4edb`.
2. Crear un worktree propio desde `origin/master` para cada fix.
3. Test de regresión primero (rojo con el código viejo), luego el fix (verde), con `-Dtest` dirigido.
4. `mvn test-compile` completo con EXIT 0, push, PR.
5. Pedir APTO a HotClick Seguridad sobre el hash exacto; esperar CI verde; mergear con `--match-head-commit`.
6. Actualizar el registro de riesgos al cerrar o abrir cada tema.
