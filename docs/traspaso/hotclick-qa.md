# Traspaso — HotClick QA (QA 7)

## Rol
QA 7: admin y seguridad de roles (incluye LECTOR), más re-QA de las áreas 3 (Marketplace) y 10 (Infraestructura). Solo recibe órdenes de Grok Bot. No toca código de producto, no hace merge, deploy ni AWS.

## En qué quedé
### Re-QA áreas 3 y 10 sobre master `f9f0e506`
- 18 tests dirigidos: **109/109 pasan**.
- Ninguna de las dos áreas queda OK: siguen abiertos (revisión de código, sin test que los cubra):
  - MEDIOS: M-04 (pedido invitado no valida si el producto es publicable), M-08 (sobreventa: el stock queda en 0 y solo se deja log), INF-04 (Flyway acepta migraciones fuera de orden), INF-05 (avisos de caída apuntan a onrender), INF-06 (prueba de restauración con postgres 16).
  - BAJOS: M-05, M-06, el catálogo expone `stockReservado`/bodega, INF-07, INF-08, CSP con stripe/tilopay/clerk, `/api/webhooks/stripe` responde 400.
- Empresa no aprobada: no aparece en lista de tiendas, su página ni el catálogo (verificado por API del staging con admin de prueba) → OK.
### Revisión LECTOR
- Recolección crear/cancelar en `RecoleccionPanel.tsx:20` y `:34` darían 403 con `f85c3e11`.
- Cotizaciones: sin camino para LECTOR.
### Verificación L210
- `cef046f6`: VERIFICADO, 64 tests / 0 fallos.

## Ramas y PRs
| Rama | Hash | Estado |
|---|---|---|
| `chore/sinpe-telefono-config` | `e68039dc4` | **PR #350** (https://github.com/hotclickdev/Hot-click-dev/pull/350), rama nueva desde master. `20127bed2` (HotClick Bugs, 25-oct) reemplazó la parte de config de `393b0816f`; el PR solo trae `SinNumerosRealesEnCodigoTest` y ocultar SINPE en checkout sin número configurado. El commit original queda en la rama local `backup/sinpe-telefono-config-393b0816` (box viejo, sin subir). Seguridad: NO APTO sobre `7f97826ba`; el ALTO (SINPE manual sin ONVO) fue retirado (el flujo `sinpeManual` siempre crea intent ONVO). `e68039dc4` corrige el MEDIO: `metodosDisponibles(sinpeHabilitado: boolean)` obligatorio, sin default. `cfd4919da` (rama local `qa/sinpe-solo-onvo-350`) NO se sube. **APTO de Seguridad sobre `e68039dc433edb0eba9f28234112f119599fc623`**; se mergea con CI verde sobre ese head exacto. |
| `docs/sin-telefono-sinpe` | `39e372f9d` | Ya en origin, sin commits por delante de master. |
| `docs/traspaso-cuenta-nueva` | esta nota | Rama compartida de traspaso. |

## Pendientes
1. PR #350: APTO de Seguridad sobre `e68039dc433edb0eba9f28234112f119599fc623`; merge solo con CI verde sobre ese head exacto. Falta CI verde, y que Andrés cree el secret `HOTCLICK_NUMEROS_PROHIBIDOS` y agregue en `ci.yml` (job backend, paso Run tests) la línea que está en el cuerpo del PR.
2. Andrés debe crear el secret de GitHub `HOTCLICK_NUMEROS_PROHIBIDOS` (solo el nombre aquí).
3. Probar el caso empresa ACTIVO + visibilidad false (no se probó para no alterar una tienda de prueba compartida).
4. Re-QA de áreas 3 y 10 cuando entren los fixes de los MEDIOS.

5. BAJOs de #350, para después del lanzamiento, sin PR por ahora:
   1) renombrar `sinpeManual` a `sinpeOnvoIntent` en el front y en la propiedad `hotclick.checkout.sinpe-manual.habilitado`;
   2) exigir que `sinpeDestino` no venga vacío para ofrecer SINPE (fail-closed).

## Próximos pasos
Retomar los pendientes en orden; cada fix necesita su test de reproducción antes de dar el área por buena.

## Decisiones de Andrés conocidas
- Nunca commit/push/merge/deploy/AWS sin OK explícito por caso.
- ONVO fail-closed; nunca llaves live ni cobros reales.
- Suites con flock, una por hash.
- Merge a master = CI verde + APTO sobre el hash exacto.
- Cada fix con test de reproducción.
- Cuidar el presupuesto.

## Evidencia
Resumida en `docs/traspaso/evidencia/hotclick-qa/`: `reqa-3-10-log.txt`, `l210/*.txt`, `config-tel/*.txt` (números solo ficticios). Originales en el box viejo bajo `/workspace/qa/verif/` (reqa-3-10, l210, config-tel).

## Correcciones al README

Revisado sobre `b9f241d82` (fila de HotClick QA, sección 7 "HotClick QA" y "PARA EL BOT DE LA CUENTA NUEVA").

### (a) Errores o datos viejos
Verificado el 26-oct, 6:10 PM CR, contra `origin/master` `3323bd1a8` y README `a96d96039`.
- #350 **no está mergeado**: `SinNumerosRealesEnCodigoTest` no existe en master. El APTO de Seguridad era sobre `e68039dc4`, pero CI/CD mergeó master en la rama (`b1b88fba9`, 6:05 PM CR) y después hubo otro push (GitHub reporta el head `f4860693a`). **Ese APTO ya no vale: hay que pedir otro sobre el head nuevo.** El README todavía dice "#350 (`e68039dc`) con APTO".
- **Dato viejo:** la línea de `ci.yml` ya está en master por #353 (`a96c77f7f`). Lo único que falta es crear el secret `HOTCLICK_NUMEROS_PROHIBIDOS` (solo Andrés). Hay que corregir la fila de HotClick QA y la del PR en el cuerpo de #350.
- "Master actual: `c48cb9ea`" quedó viejo; hoy es `3323bd1a8` (#329 a #357 mergeados).
- El prompt de la sección 7 es el original (OnvoBillingClientTest, spike ONVO). El rol real es QA 7 (admin y roles) más el re-QA de áreas 3, 6, 7 y 10.
- Scope `workflow`: en esta cuenta los pushes que tocaban `.github/workflows` fueron rechazados. Hay que verificar con `gh auth status` (el paso 2 de la lista ya lo pide).
- Falta en el README: `393b0816f` está respaldado en `backup/sinpe-telefono-config-393b0816` y lo reemplazó `20127bed2` (Bugs, `soporteTelefono`). `cfd4919da` está solo en la rama local `qa/sinpe-solo-onvo-350` y **no se sube**.

### (b) Lo que le falta a mi reemplazo
- Herramientas: JDK `/workspace/tools/jdk21`, Maven `/workspace/qa1-verif/maven/bin`, gitleaks `/workspace/tools/gitleaks` (correr antes de cada push).
- Suite completa: `unset ONVO_*; MAVEN_OPTS=-Xmx2g flock /workspace/.mvn-suite.lock mvn -B test -DforkCount=1` (una por hash). `-Dtest=...` sin lock.
- vitest: symlink a `node_modules` de `staging-43188186`; nunca borrar ese `node_modules` ni `/workspace/tools/node22`.
- Staging local: front `:3000`, backend `:8081`; no tocar los procesos `hotclick-staging-*`, nada de `pkill` (parar solo PIDs propios).
- Credencial del admin QA falso: `/workspace/qa/verif/staging-admin/.cred` (chmod 600; nunca imprimir el valor).
- Variables solo por nombre: `HOTCLICK_NUMEROS_PROHIBIDOS`, llaves `ONVO_*` (solo `onvo_test_`, en `.env`).
- Trampa: GitHub rechaza el push entero si **cualquier** commit toca `.github/workflows` sin scope `workflow`.
- Trampa: inodos del box compartido se llenaron una vez y Maven falló; revisar `df -i`.
- Reglas: todo fix trae test que reproduce el bug; push sin force, sin `--no-verify`, sin rebase (`pull --no-rebase`); merge solo con CI verde + APTO sobre el hash exacto.
- Pendientes: los dos BAJO de #350 (renombrar `sinpeManual` → `sinpeOnvoIntent` y exigir `sinpeDestino` no vacío) quedan para después del lanzamiento; MEDIOS abiertos de áreas 3/10: M-04, M-08, INF-04/05/06; no probado: empresa ACTIVO con visibilidad false.

### (c) Mejoras
- Actualizar el prompt de HotClick QA en la sección 7 con el rol QA 7, la regla de test de regresión y las rutas de herramientas.
- En el paso 4 de la lista, marcar #350 como "necesita APTO nuevo sobre el head actual + CI verde; el secret lo crea Andrés". En el paso 7, aclarar que la línea de `ci.yml` ya está (#353).
- Agregar al README una sección común "Entorno del box" (JDK, Maven, gitleaks, lock de suite, staging) para no repetirla por bot.
