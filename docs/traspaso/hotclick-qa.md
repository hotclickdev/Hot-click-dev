# Traspaso: HotClick QA (QA líder)

Actualizado: 2-nov-2026, 23:00 CR. Repo hotclickdev/Hot-click-dev.

## 1. Rol (para recrearme en otra cuenta)
- **name:** HotClick QA
- **title:** (vacío)
- **description:**

> QA líder de HotClick: re-QA por área y ✅ final de cada una (ciclo auditoría, corrección, APTO y CI, merge, QA, re-QA). Verificás ramas y master con la suite completa (unset ONVO_*; flock /workspace/.mvn-suite.lock; una vez por hash), casos negativos y perfiles dev y prod. Repo hotclickdev/Hot-click-dev. Reportás solo a Grok Bot (id 2f876dbf-e82a-4b66-b209-2249a23ec8ca); nunca hablás con Andrés ni con humanos. Leé tu nota docs/traspaso/hotclick-qa.md (rama docs/traspaso-cuenta-nueva). No hacés deploy ni creás servidores; ONVO solo en modo test; nada de secretos ni datos reales en reportes; worktree propio, sin git stash ni pkill; nunca digas que algo pasa sin evidencia. Español de Costa Rica con voseo. Reporte: Tarea | Estado | Hecho | Evidencia | Archivos | Riesgos | Bloqueos | Siguiente paso.

Nota: hoy el Mentor (e221623d-00c2-4fcd-9bed-fbd2758bc67d) habla por el usuario cuando asigna trabajo de QA. Reporto solo al Mentor y a Grok Bot, nunca a Andrés ni a humanos.

## 2. Reglas
- `unset ONVO_*` antes de toda corrida. Suite con `flock /workspace/.mvn-suite.lock`, una vez por hash. Perfiles dev y prod. Siempre casos negativos.
- ONVO solo en modo test (tarjeta aprobada 4242, rechazada 4000000000000002). Sin deploy ni servidores.
- Sin secretos ni datos reales en reportes. Nunca usar `/workspace/hotclick/staging/db.pass`.
- Claves de QA solo en `/workspace/hotclick/fase2/cuentas-qa-staging.tsv.gpg` (passphrase en `/workspace/hotclick/.qa-cuentas.pass`). El TSV tiene encabezado `usuario\tclave` (saltá la primera línea). Descifralo directo a una variable, tipeala con xdotool y hacé unset. Nada de echo, head ni cat sobre el texto descifrado. Ningún subagente descifra el gpg ni imprime claves.
- Worktree propio, sin git stash, sin pkill, sin force push, nunca a master sin CI verde y APTO.
- Vigilá `df -i` y pará arriba de 95 %.
- Un área tiene ✅ cuando sus ALTO están cerrados y tuvo re-QA. MEDIO y BAJO no bloquean.
- C2 a C6 se verifican sobre el master final.
- Nunca digás que algo pasa sin evidencia.
- Formato de reporte: Tarea | Estado | Hecho | Evidencia | Archivos | Riesgos | Bloqueos | Siguiente paso.

## 3. Hecho (hashes y PR confirmados con git y gh)
- **Área 10 ✅** sobre ca9bb6da (merge de #492): Flyway V220 sin fallos, semillas 01–04, logins 18/18, matriz de roles (admin 200, resto 403, sin token 401), aislamiento entre negocios 2/3/4, smoke SKIP LOCKED, rollback 16/16.
- **Área 3 ✅** sobre 9e576bfd (merge de #444).
- **#444** (MERGED) cerrado en staging: PUT inválidos dan 400 sin guardar; monto 0 válido (envío gratis).
- **#447** (MERGED) cerrado en staging: cantón de otra provincia da 400 antes de reservar stock; lecturas cruzadas 403, sin token 401.
- **C1 y #494** (MERGED) con ONVO ✅ sobre 53138281: ORD-50D79B120C88 CAPTURADO/PAGADO (stock 500→499); el rechazado ORD-969D3655BEE5 quedó PENDIENTE; 0 errores de FK.
- **ALTO storefront sin ONVO** detectado por QA Compra y asignado a Dev Pagos: #502 (MERGED, falta re-QA).
- **ALTO EMPRESA_REQUERIDA** cerrado en #503 (MERGED); área 2 ✅ de nuevo sobre 64212015. BAJO previo en registro de Bugs fila 27 (commit 51031ef2).
- Clave de qa+admin rotada por CI/CD (vieja 401, nueva 200; 18/18 logins).

## 4. Pendiente
- [PENDIENTE] Área 1: re-QA de #502 por QA Compra (camino feliz desde la UI con qa+cliente, tienda QA Pyme Café, tarjeta 4242), después cierro.
- [PENDIENTE] Hallazgos de QA Compra para Dev Pagos: MEDIO 2 (el rechazo deja el pedido PENDIENTE con stock reservado; debería pasar a FALLIDO), MEDIO 3 (PUT de estado no idempotente, correos duplicados), BAJO 4 (se loguea el sessionId completo), MEDIO /pago/exito sin sesión (usePayment.ts:165-189). Además cancel debe dar 404/409 y el invitado necesita cancelToken.
- [PENDIENTE] Prueba del webhook ONVO firmado por CI/CD (POST local).
- [PENDIENTE] Re-QA de #460, #463, #464, #465 (todos MERGED) y del PR de CAJERO (pausado).
- [PENDIENTE] C2 a C6 sobre el master final.
- [PENDIENTE] Variables INF-03 en el servidor (SENTRY_DSN, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, ONVO_WEBHOOK_401_UMBRAL, ONVO_WEBHOOK_401_VENTANA_MIN) y destino de prueba de SINPE: dependen de Andrés.

## 5. Rutas de evidencia (en el box)
- `/workspace/qa/paso0/evid/` (reval2, staging-8563, staging-ca9b)
- `/workspace/qa/paso0/*.md` (inf02-rollback-staging, smoke-skip-locked, limpieza-usuario7)
- `/workspace/qa/c1/`
- `/workspace/qa/reaud/`
- `/workspace/hotclick-reportes/qa5/staging-53138281-20261102/` y `staging-64212015-20261102/`
- `/workspace/hotclick/fase2/semilla/`
- `docs/infra/inf03-alertas.md` (repo)

## 6. Próximos pasos exactos
1. Leé esta nota y confirmá `df -i` < 95 %.
2. Esperá la evidencia de QA Compra del re-QA de #502 sobre el staging que lo incluya; verificala (pedido CAPTURADO/PAGADO, stock, capturas) y dale ✅ al área 1 si no queda ALTO.
3. Cuando Dev Pagos entregue los MEDIO/BAJO y CI/CD la prueba del webhook firmado, pedile a QA Compra su re-QA y cerrá.
4. Hacé el re-QA de #460, #463, #464, #465 sobre el hash actual de staging.
5. Cuando master quede final, corré C2 a C6 y reportá al Mentor.

## 7. Histórico (versión anterior de esta nota, hasta 30-oct)

### Traspaso — HotClick QA (QA 7)

#### Rol
QA 7: admin y seguridad de roles (incluye LECTOR), más re-QA de las áreas 3 (Marketplace) y 10 (Infraestructura). Solo recibe órdenes de Grok Bot. No toca código de producto, no hace merge, deploy ni AWS.

#### En qué quedé
##### Re-QA áreas 3 y 10 sobre master `f9f0e506`
- 18 tests dirigidos: **109/109 pasan**.
- Ninguna de las dos áreas queda OK: siguen abiertos (revisión de código, sin test que los cubra):
  - MEDIOS: M-04 (pedido invitado no valida si el producto es publicable), M-08 (sobreventa: el stock queda en 0 y solo se deja log), INF-04 (Flyway acepta migraciones fuera de orden), INF-05 (avisos de caída apuntan a onrender), INF-06 (prueba de restauración con postgres 16).
  - BAJOS: M-05, M-06, el catálogo expone `stockReservado`/bodega, INF-07, INF-08, CSP con stripe/tilopay/clerk, `/api/webhooks/stripe` responde 400.
- Empresa no aprobada: no aparece en lista de tiendas, su página ni el catálogo (verificado por API del staging con admin de prueba) → OK.
##### Revisión LECTOR
- Recolección crear/cancelar en `RecoleccionPanel.tsx:20` y `:34` darían 403 con `f85c3e11`.
- Cotizaciones: sin camino para LECTOR.
##### Verificación L210
- `cef046f6`: VERIFICADO, 64 tests / 0 fallos.

#### Ramas y PRs
| Rama | Hash | Estado |
|---|---|---|
| `chore/sinpe-telefono-config` | `e68039dc4` | **PR #350** (https://github.com/hotclickdev/Hot-click-dev/pull/350), rama nueva desde master. `20127bed2` (HotClick Bugs, 25-oct) reemplazó la parte de config de `393b0816f`; el PR solo trae `SinNumerosRealesEnCodigoTest` y ocultar SINPE en checkout sin número configurado. El commit original queda en la rama local `backup/sinpe-telefono-config-393b0816` (box viejo, sin subir). Seguridad: NO APTO sobre `7f97826ba`; el ALTO (SINPE manual sin ONVO) fue retirado (el flujo `sinpeManual` siempre crea intent ONVO). `e68039dc4` corrige el MEDIO: `metodosDisponibles(sinpeHabilitado: boolean)` obligatorio, sin default. `cfd4919da` (rama local `qa/sinpe-solo-onvo-350`) NO se sube. **APTO de Seguridad sobre `e68039dc433edb0eba9f28234112f119599fc623`**; se mergea con CI verde sobre ese head exacto. |
| `docs/sin-telefono-sinpe` | `39e372f9d` | Ya en origin, sin commits por delante de master. |
| `docs/traspaso-cuenta-nueva` | esta nota | Rama compartida de traspaso. |

#### Pendientes
1. PR #350: APTO de Seguridad sobre `e68039dc433edb0eba9f28234112f119599fc623`; merge solo con CI verde sobre ese head exacto. Falta CI verde, y que Andrés cree el secret `HOTCLICK_NUMEROS_PROHIBIDOS` y agregue en `ci.yml` (job backend, paso Run tests) la línea que está en el cuerpo del PR.
2. Andrés debe crear el secret de GitHub `HOTCLICK_NUMEROS_PROHIBIDOS` (solo el nombre aquí).
3. Probar el caso empresa ACTIVO + visibilidad false (no se probó para no alterar una tienda de prueba compartida).
4. Re-QA de áreas 3 y 10 cuando entren los fixes de los MEDIOS.

5. BAJOs de #350, para después del lanzamiento, sin PR por ahora:
   1) renombrar `sinpeManual` a `sinpeOnvoIntent` en el front y en la propiedad `hotclick.checkout.sinpe-manual.habilitado`;
   2) exigir que `sinpeDestino` no venga vacío para ofrecer SINPE (fail-closed).

#### Próximos pasos
Retomar los pendientes en orden; cada fix necesita su test de reproducción antes de dar el área por buena.

#### Decisiones de Andrés conocidas
- Nunca commit/push/merge/deploy/AWS sin OK explícito por caso.
- ONVO fail-closed; nunca llaves live ni cobros reales.
- Suites con flock, una por hash.
- Merge a master = CI verde + APTO sobre el hash exacto.
- Cada fix con test de reproducción.
- Cuidar el presupuesto.

#### Evidencia
Resumida en `docs/traspaso/evidencia/hotclick-qa/`: `reqa-3-10-log.txt`, `l210/*.txt`, `config-tel/*.txt` (números solo ficticios). Originales en el box viejo bajo `/workspace/qa/verif/` (reqa-3-10, l210, config-tel).

#### Correcciones al README

Revisado sobre `b9f241d82` (fila de HotClick QA, sección 7 "HotClick QA" y "PARA EL BOT DE LA CUENTA NUEVA").

##### (a) Errores o datos viejos
Verificado el 26-oct, 6:10 PM CR, contra `origin/master` `3323bd1a8` y README `a96d96039`.
- #350 **no está mergeado**: `SinNumerosRealesEnCodigoTest` no existe en master. El APTO de Seguridad era sobre `e68039dc4`, pero CI/CD mergeó master en la rama (`b1b88fba9`, 6:05 PM CR) y después hubo otro push (GitHub reporta el head `f4860693a`). **Ese APTO ya no vale: hay que pedir otro sobre el head nuevo.** El README todavía dice "#350 (`e68039dc`) con APTO".
- **Dato viejo:** la línea de `ci.yml` ya está en master por #353 (`a96c77f7f`). Lo único que falta es crear el secret `HOTCLICK_NUMEROS_PROHIBIDOS` (solo Andrés). Hay que corregir la fila de HotClick QA y la del PR en el cuerpo de #350.
- "Master actual: `c48cb9ea`" quedó viejo; hoy es `3323bd1a8` (#329 a #357 mergeados).
- El prompt de la sección 7 es el original (OnvoBillingClientTest, spike ONVO). El rol real es QA 7 (admin y roles) más el re-QA de áreas 3, 6, 7 y 10.
- Scope `workflow`: en esta cuenta los pushes que tocaban `.github/workflows` fueron rechazados. Hay que verificar con `gh auth status` (el paso 2 de la lista ya lo pide).
- Falta en el README: `393b0816f` está respaldado en `backup/sinpe-telefono-config-393b0816` y lo reemplazó `20127bed2` (Bugs, `soporteTelefono`). `cfd4919da` está solo en la rama local `qa/sinpe-solo-onvo-350` y **no se sube**.

##### (b) Lo que le falta a mi reemplazo
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

##### (c) Mejoras
- Actualizar el prompt de HotClick QA en la sección 7 con el rol QA 7, la regla de test de regresión y las rutas de herramientas.
- En el paso 4 de la lista, marcar #350 como "necesita APTO nuevo sobre el head actual + CI verde; el secret lo crea Andrés". En el paso 7, aclarar que la línea de `ci.yml` ya está (#353).
- Agregar al README una sección común "Entorno del box" (JDK, Maven, gitleaks, lock de suite, staging) para no repetirla por bot.

#### Estado por área (30-oct)
El estado vigente de las áreas C1–C6 y 2–10, la evidencia, la checklist predeploy y cómo continuar están en `qa.md`. Lo de arriba de esta nota (#350, re-QA 3/10 sobre `f9f0e506`) es histórico.
