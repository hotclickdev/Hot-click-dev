# Traspaso — HotClick Dev Pagos 2

## Rol
Segundo desarrollador de pagos de HotClick (repo `hotclickdev/Hot-click-dev`). Áreas: checkout (stock, bodega, dirección), Hacienda (firma XAdES, XSD ATV 4.4), IVA por tienda (M4), expiración de pagos y pedido manual de admin, fixes POS/ONVO.
Reglas: nunca hablar con humanos; todo reporte y pedido de OK va a Grok Bot. Sin commit/push/merge/deploy ni cambios en AWS sin OK explícito de Andrés (vía Grok Bot). Ramas locales salen de `origin/master`. ONVO fail-closed; mock solo con perfil `(dev | test) & !prod & !production`. Sin secretos, IPs, cédulas, IBAN, SINPE ni teléfonos en el código. Flyway solo aditivo. Prohibido `--no-verify`, force push y rebase en ramas compartidas. No decir que algo funciona sin correr la suite completa. Textos de UI en español de Costa Rica con voseo. Formato de reporte: Tarea | Estado | Hecho | Evidencia | Archivos | Riesgos | Bloqueos | Siguiente paso.

## En qué quedé (26-oct-2026, ~14:40 CR)
- #343 esperando APTO de Seguridad sobre el head `75f93a252` y la decisión de Andrés sobre ENTREGADO.
- #336 ya con merge de master empujado (`f6e655e6a`); falta pedir APTO nuevo sobre ese hash y CI.
- `feat/iva-regimen` empujada sin PR: hay que actualizarla con master y renumerar migraciones.

## Ramas y PRs
| Rama / PR | Head | Estado |
|---|---|---|
| #323 `fix/checkout-stock-lock` (P-05, lock por lote ordenado) | `3bd35215b` | MERGEADO |
| #324 `fix/checkout-bodega-direccion` (P-06/07/08) | `5967e80c2` | MERGEADO. El commit local extra `b9215c1d2` es la misma obra de #336 (no se sube). |
| #325 `fix/hacienda-alto` (Hacienda ALTO 1–5, XSD ATV 4.4, HaciendaLogSanitizer, allowlist gitleaks `^X509Certificate$`, V196) | `1c99fba65` | APTO de Seguridad; MERGEADO en master (`2c0510306`). |
| #336 `fix/checkout-bodega-default-front` (no mandar BODEGA_DEFAULT=1, 400 por id inválido) | APTO era sobre `ba638f5e3` (diff sha `ad0d942d`). Head actual `f6e655e6a` = merge de master (static/ de master + rebuild). | ABIERTO. Requiere APTO nuevo sobre `f6e655e6a` y CI verde. |
| #343 `fix/checkout-lock-expiracion-pedido-manual` (cleanup sin auto-deadlock vía PagoExpiradoCancelador por pago; CacheEvict null-safe QA5-M-01; excepción ENTREGADO solo admin plataforma verificado en servidor; EMPRENDEDOR nace PENDIENTE; MANUAL+EXTERNO fuera de reseñas) | `75f93a252` | ABIERTO. Suite local 2700 tests / 0 fallos. Diff sha `324c8250` (`git diff a22501f7b4d2..HEAD`). SCALE1 = falso positivo (saveAll después del loop, :63-64). APTO pedido. NO mergear hasta que Andrés decida ENTREGADO vs PENDIENTE. |
| `feat/iva-regimen` (M4 IVA, SIMPLIFICADO por defecto, V197/V198, selector y checkbox en front, StepCobro cotiza) | `d9043b570` | Empujada, SIN PR. Master ya tiene V200 (y V199): renumerar V197/V198 a versiones > máxima de master antes de abrir PR (Flyway falla con out-of-order). |
| `wip/apple-pay-domain-association` | `d05c09f6e` | WIP: servir `/.well-known/apple-developer-merchantid-domain-association`. Esperaba APTO sobre diff `ff655ed9`. Base vieja; actualizar con master. |
| `wip/webhooks-secret-header` | `1f70e2b71` | WIP sin terminar: validación de secreto por header en WebhookController + test. Sin suite ni APTO. Base vieja (`eb7564c24`); verificar si ya lo cubre `fix/validar-tilopay-webhook-secret` antes de seguir. |

PRs abiertos míos: #336 y #343 (tope 2–3).

## Pendientes
1. Hallazgos de Seguridad sobre Hacienda (PR de seguimiento):
   - `FacturacionEmisionSupport:99` y `:146` loguean la clave sin enmascarar (MEDIO).
   - `e.getMessage()` crudo en `FacturacionEnvioProcessor:67/90/105`, `FacturacionPollingService:35/55` y `HaciendaContribuyenteService:116` (este además loguea la cédula consultada).
2. BAJOs de #336: tests para id 0, overflow y vacío; `CheckoutPaquetesPlanner:87` pierde el `metodoEnvio` del paquete; `Constants.BODEGA_DEFAULT_ID` sin uso.
3. IVA: actualizar con master, renumerar Flyway, una suite, PR (si hay cupo), APTO.

## Próximos pasos
1. Pedir APTO de #336 sobre `f6e655e6a` (indicar base y comando del diff) y avisar a CI/CD.
2. Retransmitir APTO de #343 cuando llegue; mergear solo tras decisión de Andrés sobre ENTREGADO, CI verde y APTO sobre el hash exacto.
3. IVA según punto 3 de pendientes.
4. PR de seguimiento con los logs de Hacienda.

## Decisiones de Andrés
- IVA: régimen SIMPLIFICADO por defecto; tiquete = precio; factura = precio + 13 % cuadrando con el XML; configurable por tienda con migración aditiva; checkout y POS; tests de ambos casos; redondeo a céntimos.
- Push y PRs aprobados para hacienda, IVA y siguientes fixes. Regla permanente: merge con CI verde y APTO de Seguridad sobre el hash exacto; sin deploy.
- Máximo 2–3 PRs abiertos. Nunca deploy, ni crear servidores ni cuentas.
- 26-oct 14:35 CR: subir todo el trabajo local y dejar notas de traspaso para la cuenta nueva.
- Pendiente: si un pedido manual de admin con pago externo puede quedar ENTREGADO sin registro de pago (#343).

## Evidencia
- Resumen: `docs/traspaso/evidencia/hotclick-dev-pagos-2/resumen.md`.
- Los diffs exactos enviados a Seguridad quedaron en el box de la cuenta anterior (`/workspace/diffs/`); no se suben. Se recalculan con el comando indicado en cada fila.
- El CI de GitHub (Tests Java, gitleaks, SCALE1) es la corrida completa de referencia para #325 (las suites locales murieron por OOM).

## Correcciones al README

Revisado contra `docs/traspaso/README.md` en `b9f241d8`: la fila de HotClick Dev Pagos 2 (línea ~107), la sección "### HotClick Dev Pagos 2" y la lista "PARA EL BOT DE LA CUENTA NUEVA". Datos actualizados al 26-oct-2026, 3:40 PM CR. Si esta nota y el README no coinciden, vale lo de esta sección (también corrige las tablas de arriba de esta misma nota).

### (a) Errores o datos viejos
- Fila de Dev Pagos 2: dice "#343 espera APTO + la decisión ENTREGADO" y "#336 necesita APTO sobre f6e655e6a". Ya no es así: **#336 va en el head `fb1818da1` y #343 en el head `7c9ea22cb`, los dos con APTO de Seguridad** y en la cola de CI/CD para mergear con CI verde, sin deploy.
- Andrés ya decidió: **se mantiene la excepción ENTREGADO** de #343 (solo para el admin de plataforma, verificado en el servidor, en pedidos manuales con pago externo). Hay que sacarlo de la lista de pendientes.
- Lista "PARA EL BOT", paso 4: dice "#343 (CI en rojo)". Ahora está en cola con APTO, y #336 también. Los dos se mergean cuando el CI esté en verde.
- La fila deja bien pendientes `feat/iva-regimen` (sin PR) y los logs de Hacienda por enmascarar.

### (b) Lo que le falta a mi reemplazo
- `JAVA_HOME=/workspace/tools/jdk21` (Java 21). Maven está en `/workspace/tools/apache-maven-3.9.9`.
- Las suites se corren con `/workspace/mvn-suite.sh`, una sola vez por hash. **La box hace OOM con la suite completa.** Si se cae, se confía en el CI de GitHub (Tests Java) y no se dice "funciona" sin una corrida completa.
- `static/` se regenera con la config E3 de `gate-spa.yml`: Node 22, pnpm 11.1.2 y `pnpm install --frozen-lockfile`, con las variables de entorno de ese job (solo los nombres que están en el workflow, nunca valores).
- Al mergear master en una rama, **los conflictos salen en `static/`** (cientos de archivos con hash). Se toma la versión de master (`git checkout --theirs`/`origin/master -- .../static`) y se recompila con la config E3. Nunca se resuelven a mano.
- El sha del diff para el APTO se saca con `git diff origin/master...HEAD | sha256sum`. Al pedirle el APTO a Seguridad hay que indicar siempre la base y el comando (antes hubo desfases por usar otra base).
- `skip-scale-gate` (SCALE1 falso positivo) lo pone CI/CD después de que Seguridad lo confirma, y **solo cuenta con un push nuevo**: si se pone la etiqueta sin un push nuevo, el check no se vuelve a evaluar.
- IVA (`feat/iva-regimen`, `d9043b570`): **sus migraciones V197/V198 hay que renumerarlas después de V200**, porque master ya tiene V199/V200 y Flyway no acepta versiones fuera de orden. Después se actualiza con master, se corre una suite, se pide el APTO y se abre el PR si hay cupo (máx. 3).
- Ramas WIP mías: `wip/apple-pay-domain-association` y `wip/webhooks-secret-header` (ver la tabla de arriba).
- gitleaks: el binario está en `/workspace/tools/gitleaks`. Se corre sobre `origin/master..rama` antes de cada push. El tipo `X509Certificate` ya tiene una allowlist acotada.

### (c) Mejoras
- En la fila de cada bot, poner el head y el estado (APTO, cola de CI) con la fecha y la hora, para que no quede viejo.
- Agregar al README una sección "Entorno de la box" con lo de (b): rutas de JDK y Maven, `mvn-suite.sh`, la config E3 de static/, el comando del sha y el OOM. Le sirve a todos los devs.
- En la lista "PARA EL BOT", separar los PRs "en cola, solo falta CI verde" de los que "necesitan trabajo".
