# Traspaso: HotClick Dev Pagos

Actualizado: lunes 2-nov-2026, ~11 PM (hora de Costa Rica, UTC-6).
Este archivo integra el anterior `docs/traspaso/dev-pagos.md` (30-oct), que ahora solo apunta acá.
Sin secretos, cédulas, IBAN, SINPE ni teléfonos: solo **dónde** están los secretos, nunca sus valores.

## 1. Cómo recrear el bot

- **Nombre:** HotClick Dev Pagos
- **Título:** (vacío en el perfil actual)
- **Descripción completa (copiar tal cual):**

> Desarrollador backend de pagos, suscripciones y comisiones de HotClick (áreas 1 y 5), con ONVO. Repo hotclickdev/Hot-click-dev (Spring Boot 3/Java 21, Postgres/Flyway). Reportás solo a Grok Bot (id 2f876dbf-e82a-4b66-b209-2249a23ec8ca); nunca hablás con Andrés ni con humanos. Antes de empezar leé tu nota de traspaso docs/traspaso/hotclick-dev-pagos.md (rama docs/traspaso-cuenta-nueva). Ningún monto ni porcentaje hardcodeado. Reglas: push y PRs propios (máx 3 abiertos, sin force, sin --no-verify, sin rebase); merge solo con CI verde y APTO de HotClick Seguridad sobre el hash exacto; nunca deploy, gastos, cuentas ni servidores nuevos; ONVO fail-closed (mock solo en perfiles dev/test) y único procesador (Tilopay y Stripe son deuda técnica); Flyway solo aditivo y numerado después de V200; un test de regresión con cada fix; nada de secretos, cédulas, IBAN, SINPE ni teléfonos en chat o repo; worktree propio, sin git stash ni pkill; nunca digas que funciona sin ejecutarlo. Español de Costa Rica con voseo. Reporte: Tarea | Estado | Hecho | Evidencia | Archivos | Riesgos | Bloqueos | Siguiente paso.

- Skills del repo que tiene que cargar: `hot-click-dev-workflow` (y `hot-click-diseno-figma` si toca UI).

## 2. Reglas (todas)

**Git**
- Identidad de commit y merge: `git -c user.name='HotClick Dev Pagos' -c user.email='hotclick-dev-pagos@noreply.local' …`
- `gitleaks protect --staged` antes de **cada** commit. Agregar archivos por ruta explícita.
- Sin force push, sin rebase, sin `git stash`, sin `--no-verify`, sin `pkill` (matar solo PIDs propios).
- Master se trae **siempre con merge** (`git merge origin/master`), nunca rebase.
- Máximo 3 PRs abiertos propios (`gh pr list --author @me --state open`). Un PR por tarea.

**Merge y APTO de Seguridad (HotClick Seguridad, agente 58cd823a-740f-4424-9bc6-d4eebfd77fc5)**
- Merge solo con: CI completo verde (incluido quality gate de Sonar) + **APTO de Seguridad sobre el hash exacto** del head.
- **Cualquier push nuevo (incluido un merge de master) anula el APTO**: hay que pedirlo otra vez sobre el hash nuevo.
- Para re-APTO tras merge de master, incluir evidencia:
  - merge-tree limpio: `git merge-tree --write-tree <head_anterior> origin/master` y `git diff --stat <tree> HEAD -- . ':!Hot_click_outlet/src/main/resources/static' ':!docs'` **vacío** (sin solape fuera de static/ y docs);
  - archivos en conflicto y cómo se resolvieron;
  - static/ rebuild con `env -i`, sin `.map`, gitleaks sin leaks;
  - CI verde.
- El bot no mergea por su cuenta si el usuario no lo pide; nunca deploy.

**Código y datos**
- Ningún monto ni porcentaje hardcodeado: todo sale de config/properties.
- ONVO fail-closed: sin llave o respuesta dudosa se rechaza; mock solo en perfiles dev/test. ONVO es el único procesador.
- Flyway: solo aditivo, numerado después de V200 (usar el siguiente libre de `origin/master` al crear; hoy > V222), y **duplicado en `Actualizado.sql`**. Renumerar contra master si choca.
- Cada cambio lleva su fila en `docs/security/amenazas-activas.md`; en conflictos se conservan **todas** las filas de ambos lados.
- Un test de regresión por fix. Nunca decir que funciona sin ejecutarlo.
- No tocar sin autorización del usuario: `render.yaml`, docker-compose, `OnvoWebhookController`, `OnvoPaymentProvider`.
- Nunca imprimir ni escribir la llave de pruebas ONVO (`ONVO_TEST_SECRET_KEY`). Contra ONVO solo GET de lectura, sin cobros.
- Negocio: solo un pago ONVO confirmado reactiva una tienda en `SUSPENDIDO_IMPAGO`; gracia 8 días; POS solo SINPE; planes pagos fail-closed, sin planes gratis.

**Tests**
- Solo tests dirigidos: `cd Hot_click_outlet && mvn -q test -Dtest='Clase*'` (usar `mvn`, no `./mvnw`; `'Nombre*'` para clases `@Nested`). Llaves ONVO **ausentes** del entorno (`env -u ONVO_SECRET_KEY -u ONVO_WEBHOOK_SECRET`).
- Suite completa: solo bajo lock compartido: `flock /workspace/hotclick/.suite-completa.lock mvn test`. Normalmente la corre CI.
- Front: Node 22 (`~/.local/node22`); vitest `npx vitest run <ruta>`; Playwright `npx playwright test tests/<spec>`.
- **static/** (gate E3): rebuild en commit aparte con mensaje `build(static): rebuild SPA … (env -i, sin VITE_*)`:
  `cd Hot_click_outlet/frontend && env -i HOME=$HOME PATH=$HOME/.local/node22/bin:/usr/bin:/bin npx -y pnpm@11.1.2 build`
  En conflictos de static/: en el merge tomar el static/ de master (`git rm -rq --cached static; rm -rf static; git checkout origin/master -- static; git add -A static`), y después rebuild. (Esto reemplaza la receta vieja con `VITE_APP_RELEASE`.) El único "VITE_" esperable en el bundle es código de la librería Clerk.
- Sonar duplicación por archivo: `curl "https://sonarcloud.io/api/measures/component_tree?component=hotclickdev_Hot-click-dev&pullRequest=N&metricKeys=new_duplicated_lines&qualifiers=FIL&ps=500"`.

## 3. Hecho (PRs mergeados, todos verificados como ancestros de `origin/master` el 2-nov)

| PR | Merge | Qué |
|---|---|---|
| #409 | 52406b4e | billing ONVO (ver historial abajo) |
| #407 | da225cfe | tenant/bodega (LOWs L1–L3 pendientes, abajo) |
| #466 | 0bd56929 | aviso al admin de reembolso pendiente (`AvisoReembolsoPendienteService`, migración **V216** `pago_aviso_reembolso_admin`; prop `hotclick.aviso-reembolso.timeout-ms` = `AVISO_REEMBOLSO_TIMEOUT_MS`, default 10000. Ojo: en master actual el aviso usa `hotclick.aviso-reembolso.lease-minutos/max-intentos/barrido.*`; `timeout-ms` ya no aparece en `application.properties` de master, verificar si se renombró) |
| #494 | 53138281 | FK pago→pedido (`fix/fk-pago-pedido`) |
| #504 | e643c314 | QA5: rechazo ONVO → FALLIDO y libera stock; reconsulta de PENDIENTE; PUT estado idempotente |
| #502 | 4905cd5f | QA5 ALTO: checkout del storefront paga por ONVO |

Anteriores (historial 26–30 oct): #320, #333, #339, #342, #344, #346, #371 (c5b9bb06), #381 (1745d4dc), #374 (3c7dfaea), #388 (7bb6cf47), #391 (6e50752f), #397 (55ea9313), #401 (938d983d).

**Detalles técnicos clave**
- **ONVO no tiene estado `failed`.** Un rechazo deja el intent en `requires_payment_method` con `lastPaymentError`; `canceled` también es terminal. `OnvoCobroVerificador.intentRechazado` lo detecta.
- `OnvoRechazoService`: pasa el pago a FALLIDO y libera stock (con `findByIdForUpdate`).
- `OnvoPendientesReconsultaService`: job que reconsulta pagos PENDIENTE contra ONVO; lote acotado por `hotclick.pagos.onvo.respaldo.lote-max=${HOTCLICK_PAGOS_ONVO_RESPALDO_LOTE_MAX:200}`, validado en el constructor (test `topeDeLote`).
- `PagoExpiradoCancelador`: cancela pagos vencidos y libera stock.
- `PedidoStatusTokenService` (#501, Dev Pagos 2): HMAC `emitir(numero)`/`esValido(numero, st)`. `OnvoPaymentProvider.crearSesion` arma `successUrl = APP_URL/pago/exito?order=N&st=…`; `PaymentStatusPage` lee `st` y `paymentService.consultarEstado` lo manda en `X-Pedido-Token`. El storefront usa el mismo provider (test `OnvoUrlRetornoTiendaTest`, E2E `tienda-checkout-onvo.spec.ts`).
- `PaymentController`: `/cancel` y `/guest/cancel` comparten `ejecutarCancelacion` (403/404/409); test `PaymentControllerCancelacionHelperTest`.
- `PedidoService.cambiarEstado` idempotente: si ya está en el estado pedido, no repite correo ni stock.

## 4. Pendientes

- **[PENDIENTE] PR A — #507** `fix/onvo-appurl-logs` (head 9752181e), **draft, NO MERGE**: APP_URL fail-closed en prod (`OnvoArranqueProdGuard`), sessionId enmascarado (`IdEnmascarado`), `cardLast4/cardBrand` desde `paymentMethod.card` (`OnvoTarjetaService`). Bloqueado: `render.yaml` no declara `APP_URL`; si no está en el dashboard de Render prod, la app no arranca. Necesita confirmación del usuario de que APP_URL está en Render prod; CI/CD ofrece agregarla a `render.yaml` con `sync: false` (rama `origin/ci/doc-app-url-prod`). Falta: merge de master, CI completo y APTO.
- **[PENDIENTE] BAJOs de #502** para un PR de seguimiento:
  - `history.replaceState` para quitar `st=` de la URL tras leerlo;
  - rate limit en `GET /api/payments/status/{n}`;
  - la clave HMAC de `PedidoStatusTokenService` se comparte con `jwt.secret` (separarla en una prop propia).
- **[INCOMPLETO] `tienda-pdp-comprar.spec.ts:56`** falla solo localmente (espera texto de `TiendaSuccessPage`); no está en el subset de CI y **no se verificó en master**.
- **[PENDIENTE] LOWs de Seguridad sobre #407:** L1 borrar chequeo redundante en `PosVentaService:155-158`; L2 pasar por `BodegaTenantGuard` `PosQrPedidoFactory:106-108`, `RecoleccionService:145-147`, `PedidoManualFactory:176-177`; L3 test MockMvc del oráculo de bodega.
- **[PENDIENTE] predeploy billing:** variables `PLANES_MONEDA`, `*_PRECIO_MENSUAL_USD` (3), `ONVO_PRICE_ID_PYME`, `ONVO_PRICE_ID_NEGOCIO_PLUS`, `SPRING_PROFILES_ACTIVE=prod`, **`APP_URL`**; consulta read-only `docs/security/onvo-billing-prechequeo-sql.md`; firma del webhook ONVO sin validar end-to-end (falta `ONVO_TEST_WEBHOOK_SECRET` en pruebas).
- **Deuda técnica:** código de Tilopay y Stripe (`TilopayPaymentProvider`, `StripePaymentProvider`) a retirar; alertas sobre `[ALERTA-PAGO]`/`BILLING_LEDGER_OMITIDO`; cobro de `PAST_DUE`.
- **Rama sin subir:** `fix/infra-reqa-workflows` (d4adc5cf) necesita token con scope `workflow`.

## 5. Dónde están las cosas (sin valores)

- **Secretos:** solo en el entorno (dashboard de Render prod y variables del box), nunca en el repo. Nombres: `ONVO_SECRET_KEY`, `ONVO_WEBHOOK_SECRET`, `ONVO_PUBLISHABLE_KEY`, `ONVO_TEST_SECRET_KEY`, `ONVO_TEST_WEBHOOK_SECRET`, `ONVO_SINPE_DESTINO`, `JWT_SECRET`, `DB_PASSWORD`, `MAIL_PASSWORD`. Los carga Andrés.
- **Worktrees (box, `/workspace`):**
  | Ruta | Rama | Head |
  |---|---|---|
  | hc-pagos-a | fix/onvo-appurl-logs (#507 draft) | 9752181e |
  | hc-pagos-b | fix/pedido-rechazo-idempotente (#504 mergeado) | ea90ac29 |
  | hc-pagos-c | fix/storefront-checkout-onvo (#502 mergeado) | 8662106e |
  | hc-pagos-fkpago | fix/fk-pago-pedido (#494 mergeado) | 9205de33 |
  | hc-pagos-s02s04 | fix/aviso-admin-reembolso-pendiente (#466 mergeado) | e8721111 |
  | hc-pagos-traspaso | docs/traspaso-cuenta-nueva (#440) | (este doc) |
  Todos limpios y sincronizados con origin al 2-nov.
- **Patch:** `/workspace/onvo-rechazo-descartado.patch` (de HotClick Bugs; tocaba `OnvoPaymentProvider`, por eso solo se adoptó la lógica de `canceled`/error vacío en `OnvoCobroVerificador`).
- **Evidencias:** `docs/traspaso/evidencia/`, `docs/security/amenazas-activas.md` (filas QA5), CI de cada PR en GitHub Actions.

## 6. Próximos pasos exactos

1. `gh pr list --author @me --state open` y leer este doc.
2. #507: preguntar a Grok Bot si el usuario confirmó `APP_URL` en Render prod. Si sí: en `/workspace/hc-pagos-a`, `git fetch && git merge origin/master`, tests dirigidos (`OnvoArranqueProdGuard*Test,ArranqueProdLlaveOnvoTestOptInTest,CupoEmprendedorDemoProdArranqueTest,OnvoTarjetaServiceTest,IdEnmascaradoTest`), push, CI verde, sacar de draft y pedir APTO sobre el hash exacto con evidencia de merge-tree.
3. Abrir PR de seguimiento con los 3 BAJOs de #502 (cada uno con test y fila en amenazas).
4. Correr `tienda-pdp-comprar.spec.ts` sobre master y decidir si es un bug real.
5. LOWs de #407.

---

## Anexo: nota anterior (26-oct)

## Mergeados
#320, #333, #339, #342 (admin no reactiva impago sin pago, con lock) y #346 (CSP permite `https://sdk.onvopay.com` en script/frame).

## Abiertos con APTO, esperando CI
| PR | Rama | Head |
|---|---|---|
| #332 | fix/comisiones-por-plan | 3abfc68de5c1e866958b9b1ef78f77a7736afdc1 |
| #344 | fix/visibilidad-impago | 0372c25faf3635cedf1b7f3a79196195544a716d |

Ojo: si se vuelve a mergear master en cualquiera de los dos, el APTO se pierde y hay que pedirlo de nuevo.

## Pendientes (BAJOS salvo que se diga otra cosa)
- **De #333:**
  - falta idempotencia en `/impago/pagar`;
  - el catálogo da 403 en vez de 404;
  - el flag de `suspensionImpaga.ts` no se resetea en el logout;
  - el dueño suspendido no puede comprar en otras tiendas;
  - `CuentaSuspendidaController` no tiene test.
- **De #332:** el test no valida contra la BD; el default 9 está duplicado en `AggregatorService:57`.
- **CSP (#346):** falta un smoke manual en staging del pago de suscripción ONVO embebido, con llave de prueba y sin cobrar.
- **Lock pesimista** (`findByIdForUpdate`) de #342/#344: probado solo con mocks, no contra Postgres real.
- **Tickets viejos:**
  - `fix/onvo-status-canceled-l210`;
  - `fix/aplicar-plan-local-mes`;
  - `chore/retirar-tilopay`;
  - `RegistroCuentaOnvoTest` (forzar el mock);
  - la llamada HTTP de ONVO dentro de `REQUIRES_NEW` en `CuentaOnvoService`;
  - los BAJOS de SINPE/PII.
- **2 ALTOS de QA en `OnvoService`**, esperando que la documentación de ONVO los confirme:
  - `crearMetodoPagoSinpePos` manda `mobileNumber` sin `number`;
  - la identificación solo acepta los tipos 1-4 con guiones.

## Cómo correr los tests
```bash
cd Hot_click_outlet
JAVA_HOME=/workspace/tools/jdk21 env -u ONVO_SECRET_KEY -u ONVO_WEBHOOK_SECRET mvn -o -Dfrontend.skip=true -Dtest='X*' test
# resultados: target/surefire-reports/TEST-*.xml (clases anidadas: usar 'Nombre*')
cd .. && BASE_SHA=$(git merge-base HEAD origin/master) HEAD_SHA=HEAD node scripts/eng-gates/gate-scale.mjs   # SCALE1
```
`static/` se regenera como en gate-spa:
- Node 22, `COREPACK_HOME=/workspace/tools/corepack`, pnpm 11.1.2 y `VITE_APP_RELEASE=ci-spa-gate`.
- En `Hot_click_outlet/frontend`: `pnpm install --frozen-lockfile` y después `pnpm build`.
- Commitear `src/main/resources/static/`.
- En conflictos de static/: partir del static/ de master, rebuild y `git add -A`.

## Ramas subidas en el traspaso (26-oct)
Ninguna está lista para PR: son respaldos para revisar. Antes de reusar una, compararla con master, porque mucho ya entró por otros PRs.

| Rama | Commit | Estado | Qué es |
|---|---|---|---|
| wip/timeout | d8f7cf0f39dd1b172bcbe71cdde3b9d568529dff | wip | Diseño de expires/timeout de sesión ONVO + `config/onvo/` sin terminar |
| wip/240-clean | b28ad6728db630fabfc590816c854d8077ec698d | wip | Endurecimiento de la verificación ONVO (`OnvoService` + `OnvoServiceModoTest`), variante A |
| wip/240-om | 2ca3e228ab25be87ecb3dc30883ec9cfb364d22a | wip | Igual, variante sobre master viejo |
| wip/reintentar | de350f5574a62f80572cc5394b630e8ba5440961 | wip, probablemente obsoleta | Reintento de pago Tilopay por el dueño; choca con el retiro de Tilopay |
| wip/pagos2-b | db1b38118e7047e34743464f03c6c64fcf5660b7 | wip | `OnvoBillingClient` fail-closed + tests |
| wip/qa3 | 2240b12ec0a48c8017bdf1bf19bcfbb91bab1ea2 | wip | Variante anterior de la misma tarea |
| wip/pagos2 | 4748301e11c121b69f7b5c4200103b4405e84f2d | wip | POS: QR SINPE vencido + `CoberturaPagosAdminTest` |
| wip/qa2 | efc368130cf00cfeabdb116100ef41273c25ac0b | wip | Variante anterior de la misma tarea |
| wip/pagos2-pr249 | 38c6c80b494bbe0602bbc1a118ea4103d85ce5b5 | wip | `PerfilSimulacion` estricto (toca Tilopay) |
| wip/pagos2-pr253 | 9edc71d75f1cd1f827d3d0ab0f11176515d3df0d | wip | Ajustes al rate limit de SINPE |
| fix/billing-onvo-webhook | ec58f50cf7ba345d55dad10799f20efc85a122ad | fast-forward de +1 commit | Sin NPE con datos nulos de ONVO en el verificador (Sonar S2259) |

Ramas que Seguridad veía «sin pushear» y que ya estaban en origin:
- `fix/billing-renovacion` (b9ac17668) está contenida en `origin/wip/billing-renovacion-v1`.
- `fix/validar-tilopay-webhook-secret` (3444899bf) ya está en origin.

**No se pudo subir:** `fix/infra-reqa-workflows` (d4adc5cff30577037dfebfa48cf637cd6696c893, local). GitHub rechaza el push porque toca `.github/workflows/health-pager.yml` y el token de la caja no tiene el scope `workflow`. Hay que subirlo con un token que tenga ese scope, o pedírselo a CI/CD. La rama vive en `/workspace/hc-billing-webhook`, en el repo compartido de la caja vieja.

## Correcciones al README

Verificado con `gh` el 26-oct-2026 a las 3:40 PM CR, contra el README en b9f241d8.

### (a) Errores o datos viejos sobre Dev Pagos en el README
- **Tabla «Resumen rápido», fila HotClick Dev Pagos:** dice solo «#332 comisiones abierto».
  - Real: **#332** sigue abierto con APTO sobre `3abfc68de5c1e866958b9b1ef78f77a7736afdc1`; falta CI verde y el merge.
  - **#344** (visibilidad impago, APTO sobre `0372c25faf3635cedf1b7f3a79196195544a716d`) ya está **mergeado**.
  - **#320, #333, #339, #342 y #346** (CSP ONVO) están **mergeados**.
  - Falta mencionar el **#354** (`fix/plan-pago-pendiente-aprobacion`, QA 8 ALTO, commit `bb8e29403b3861d08ced18580a21effba653c8da`): está abierto y espera el APTO.
- **Sección «Área 5 Suscripciones»:** dice «Abiertos #332 (comisiones) y #344».
  - Real: solo #332 y #354 están abiertos; #344 está mergeado.
  - #346 (CSP ONVO) también está mergeado y falta en la lista.
- **Paso 4 de «PARA EL BOT DE LA CUENTA NUEVA»:** la lista de PRs abiertos no incluye el **#354**.
- **Prompt de Dev Pagos:** dice «Migraciones Flyway solo aditivas (V183+)», pero master ya va por **V200**.
  - Hay que usar el siguiente número libre de `origin/master` en el momento de crear la migración, no V183.
  - Además hay que duplicarla en `Actualizado.sql`.
- **Prompt de Dev Pagos:** nombra ramas viejas como trabajo activo: feat/onvo-suscripciones, fix/onvo-sesion-expiracion-y-timeout y feat/onvo-reembolsos-pendientes.
  - El estado real de ramas y wip está en las secciones anteriores de esta nota.

### (b) Lo que le va a faltar al reemplazo
- **Variables** (solo nombres; los valores los carga Andrés):
  - `ONVO_SECRET_KEY`, `ONVO_WEBHOOK_SECRET`, `ONVO_PUBLISHABLE_KEY`
  - `ONVO_PRICE_ID_PYME`, `ONVO_PRICE_ID_NEGOCIO_PLUS`, `ONVO_SINPE_DESTINO`
  - `PAYMENTS_ONVO_ENABLED`, `PAYMENTS_ONVO_PERMITIR_LLAVE_TEST`
  - `EMPRENDEDOR_PRECIO_MENSUAL_USD`, `PYME_PRECIO_MENSUAL_USD`, `NEGOCIO_PLUS_PRECIO_MENSUAL_USD`
  - En los tests locales, las llaves ONVO tienen que estar **ausentes** (fail-closed).
- **Comandos:**
  - Maven (sin llaves ONVO en el entorno):
    `JAVA_HOME=<jdk21> env -u ONVO_SECRET_KEY -u ONVO_WEBHOOK_SECRET mvn -o -q -Dfrontend.skip=true -Dtest='Clase*' test`
    Los resultados quedan en `target/surefire-reports/TEST-*.xml`.
  - SCALE1, desde la raíz y con el commit hecho:
    `BASE_SHA=$(git merge-base HEAD origin/master) HEAD_SHA=HEAD node scripts/eng-gates/gate-scale.mjs`
  - Regenerar `static/`:
    1. `export PATH=<node22>/bin:$PATH COREPACK_HOME=<dir> VITE_APP_RELEASE=ci-spa-gate`
    2. En `frontend/`: `corepack pnpm@11.1.2 install --frozen-lockfile --offline && corepack pnpm@11.1.2 build`
    3. Si `static/` choca en un merge: `git rm -rq --cached static; rm -rf static; git checkout origin/master -- static`, después el build y `git add -A static`.
  - Vitest: `corepack pnpm@11.1.2 exec vitest run <ruta>`
  - gitleaks: `gitleaks protect --staged` antes de cada commit.
  - Merge en el box sin identidad de git:
    `git -c user.name="HotClick Dev Pagos" -c user.email=hotclick-dev-pagos@noreply.local merge origin/master`
- **Accesos:** hace falta un token de GitHub con scope **`workflow`** para pushear `fix/infra-reqa-workflows`, porque toca `.github/workflows/`. El token actual solo tiene `repo`. Lo autoriza Andrés en la ventana de login, nunca pegándolo en el chat.
- **Trampas:**
  - `-Dtest=Nombre` no corre las clases `@Nested`; usá `-Dtest='Nombre*'`.
  - El node 20 del sistema rompe pnpm 11; usá Node 22 en el PATH.
  - Cada merge de master (o cualquier commit nuevo) **anula el APTO**: Seguridad lo tiene que repetir sobre el hash nuevo.
  - Los números de Flyway chocan entre ramas paralelas; antes de mergear hay que renumerar contra master (y en `Actualizado.sql`).
  - Con `open-in-view=false`, las relaciones LAZY (`empresa.getPlan()`) fallan fuera de una transacción. Esa fue la causa del QA 8 (#354).

### (c) Mejoras
- Agregar al README una tabla de PRs generada con `gh pr list --json` en el momento del traspaso, para que no quede vieja en minutos.
- Pasar el prompt de Dev Pagos a un estado neutro («ver la nota de traspaso») en vez de listar ramas y números de migración fijos.
- Pedir a CI/CD un check que falle si una migración nueva no está en `Actualizado.sql` o si su número choca con master.
