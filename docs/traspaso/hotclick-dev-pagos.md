# Traspaso: HotClick Dev Pagos

Estado al lunes 26-oct-2026, ~3:15 PM (hora de Costa Rica). Sin secretos, teléfonos, SINPE ni cédulas.

## Rol
Dev backend de pagos de HotClick (`Hot_click_outlet`): Spring Boot 3.4 / Java 21, Postgres + Flyway, front React/Vite/pnpm.
ONVO es **fail-closed**: sin llaves o con respuesta dudosa se rechaza; el mock solo existe en los perfiles dev/test.

## Reglas de Andrés (no negociables)
- Sin commit, push, merge, deploy ni cambios en AWS sin su OK explícito, que transmite Grok Bot.
- Merge solo con CI verde + **APTO de Seguridad sobre el hash exacto**. Cualquier parche o merge posterior **anula el APTO**.
- Migraciones solo aditivas (V183+), duplicadas en `Actualizado.sql`, y solo si son imprescindibles.
- Nada de montos, porcentajes ni teléfonos hardcodeados: todo sale de la config.
- Máximo 3 ciclos de corrección por tarea. Un test de regresión por cambio. Nunca afirmar que algo funciona sin ejecutarlo.
- Sin `--no-verify`, sin force push, sin rebase; master se trae **siempre con merge**. Un PR por tarea.
- Cada cambio lleva su fila en `docs/security/amenazas-activas.md`; en conflictos se conservan todas las filas.
- Negocio:
  - solo un pago ONVO confirmado reactiva una tienda en `SUSPENDIDO_IMPAGO`;
  - gracia de 8 días;
  - se retira todo Tilopay;
  - la POS queda solo con SINPE;
  - planes pagos fail-closed y sin planes gratis.
- Identidad de commit: `git -c user.name="HotClick Dev Pagos" -c user.email=hotclick-dev-pagos@noreply.local`.

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
