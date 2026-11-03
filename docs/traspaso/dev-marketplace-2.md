# Traspaso: HotClick Dev Marketplace 2

Actualizado el 2-nov-2026, 23:00 (hora CR). No hay secretos: ninguna llave, token ni `.env` aparece acá, solo dónde están.

## Rol y descripción (para recrear el bot)
- **Nombre:** HotClick Dev Marketplace 2. Es el segundo dev full-stack del repo `hotclickdev/Hot-click-dev` (Spring Boot + Flyway + React/Vite, con `static/` versionado).
- **Áreas:**
  - **6:** chatbots, asistente de compras (`service/shoppingassistant`, `rag`), copilot e IA.
  - **9:** frontend y UX.
- **Idioma:** español de Costa Rica (voseo) en PRs, commits y docs.
- **Reporta solo al Mentor** (`e221623d-00c2-4fcd-9bed-fbd2758bc67d`, habla por Andrés). Coordina con HotClick Dev Marketplace, dueño de las áreas 2 y 3. No toca las áreas ajenas.
- **Skills:** cargar `hot-click-dev-workflow` siempre, y `hot-click-diseno-figma` antes de cualquier cambio de UI.
- **Checkout en el box:** `/workspace/hotclick-dev2`, con la identidad git configurada solo en local. Todos los bots usan la misma cuenta de `gh`.

## Reglas
- **Git:**
  - Ramas desde el master más reciente. Para actualizar, merge puro de master; **nunca rebase ni force-push**.
  - Stage por ruta, nunca `add -A` ni `git stash`.
  - Nada directo a master.
- **Máximo 3 PR abiertos.** Revisar antes con `gh pr list` (la cuenta es compartida).
- **Ciclo de merge:**
  1. Fix con test de regresión.
  2. CI verde. Gates:
     - E2 `tenant-global-ok`;
     - fila en `docs/security/amenazas-activas.md`;
     - Sonar;
     - gitleaks;
     - osv-scanner;
     - E3 `static/`.
  3. **Seguridad da APTO sobre el hash exacto** del head.
  4. **CI/CD mergea** con `--match-head-commit` y `behind_by=0`.
- **Prohibido sin OK explícito de Andrés:** deploy, gasto, cuentas nuevas, servidores nuevos, borrar datos de producción y la llave live de ONVO. **ONVO es el único procesador.** Nunca mostrar secretos.
- **Carga del box:**
  - En local, solo tests puntuales: `mvn -o -q -B test -Dtest=Clase1,Clase2 -Dsurefire.failIfNoSpecifiedTests=false`, con las variables de CI de H2 (`DB_URL=jdbc:h2:mem:testdb`, `JWT_SECRET` de prueba, etc.; ver el workflow de CI).
  - Suite completa, instancia local o rebuild de `static/`: `flock /workspace/hotclick/.suite-completa.lock nice <cmd>`. QA tiene prioridad.
  - Rebuild de `static/`: desde `Hot_click_outlet/frontend`, con **todas las `VITE_*` sin definir**, en un commit aparte. El box tiene Node 20, así que se usa `flock ... nice env -u VITE_... npx vite build` (`pnpm build` falla). El typecheck va aparte con `npx tsc --noEmit -p tsconfig.json`.
- **Aviso del box:** el disco se quedó sin inodos (`df -i` al 100%) el 2-nov. Antes de crear worktrees nuevos, pedir limpieza al Mentor. No borrar checkouts ajenos.

## Lo hecho (PRs y hashes)
| PR | Tema | Merge |
|---|---|---|
| #372, #378, #373 | área 6 (ALTO-1, ALTO-2) | `f6ded0be`, `bf5602c8` |
| #432 | cuota del asistente y precios Claude | `7dd0a11d` |
| #433 | C3 (USD) y frontend | `da481550` |
| #434 | MEDIO-1: memoria por tienda (V210) y BAJOs 404/logs | `02fd6fdd` |
| #442 | V211 (FK `customer_memory.empresa_id`), tarjeta de tarifas en el panel IA, `IncidentClaudeClient` escribe en `ai_uso` | `3be36833` |
| #450 | MEDIO-2: topes por red (IP, subred y subred × negocio; pozo `x:desconocida`), llaves con HMAC, aviso al 80% del global; sal propia o derivada de jwt.secret | `d106d5de` (head `4093f51f`) |

Doc de operación del cupo: `docs/operaciones/asistente-cuota.md`.

## Pendientes
- [PENDIENTE] **Antes del deploy, definir `ASISTENTE_CUOTA_SAL_IP` propia en producción.** Lo decide Andrés. Sin ella, la sal se deriva de `JWT_SECRET`, y rotar ese secreto reinicia los contadores del día.
- [PENDIENTE] **Ocultar al CAJERO los botones de crear, editar y borrar bodegas.** Para eso, guardar `rol_en_empresa` en el store del front desde el login y el cambio de negocio. El backend ya responde 403 desde #472, y el CAJERO se puede asignar desde #474. Leer antes `hot-click-diseno-figma`.
- [PENDIENTE] **BAJOs de Auditor 6:**
  - `INSERT ... ON CONFLICT DO NOTHING` en `CustomerMemoryService.java:83-89`, compatible con H2 y Postgres.
  - Quitar el índice redundante `idx_customer_memory_visitor` en la siguiente migración libre. Master llega a V222: revisar V212+ de #444 y lo que haya en master antes de numerar.
- [PENDIENTE] **BAJOs de Seguridad:**
  - FK de V211: `NOT VALID` + `VALIDATE`, o limpiar los huérfanos.
  - Índice `CONCURRENTLY`.
  - Valorizar los tokens de incidentes con la tarifa Sonnet.
  - Las llaves viejas con IP en claro vencen con `PURGAR`; verificar después del deploy.
  - Rangos del CDN en `SECURITY_TRUSTED_PROXIES`.
  - Monitorear el pozo compartido `x:desconocida`.
- [PENDIENTE] **BAJOs de front:**
  - `RangeError` en `formatMontoMoneda`.
  - i18n muestra 'US$0.35' con punto.
  - `Math.round` con 1.005.
  - `CuentaSuspendidaPage` muestra '₡6.200'; confirmar con UX.
  - Bottom sheets apilados (cupón y chat).
  - Sonar: constructor de 12 parámetros en `ClaudePrecios`.
  - La concurrencia de la cuota solo está probada en H2; falta Postgres.

## Rutas relevantes
- **Cupo:** `Hot_click_outlet/src/main/java/com/hotclick/service/shoppingassistant/AsistenteCuotaDiaria.java`, `AsistenteLimiteMensaje.java`. Se llama desde:
  - `ShoppingAssistantService` (`reservar`);
  - `PublicChatController`;
  - `ShoppingAssistantImageSearchHandler`.
- **Tests del cupo:** `src/test/java/com/hotclick/service/shoppingassistant/AsistenteCuotaDiariaTest.java`, `AsistenteCuotaDiariaRedTest.java`, `ShoppingAssistantCuotaTest.java`, `PublicChatController*Test`.
- **Memoria:** `service/shoppingassistant/CustomerMemoryService.java`. Test: `CustomerMemoryPorEmpresaTest`. Migraciones V210 y V211.
- **Precios de IA:** `ClaudePrecios`, `ClaudeUsoRegistrador`, `IncidentClaudeClient`; panel `/plataforma/ia` en el frontend.
- **Front:** `Hot_click_outlet/frontend/src` (`formatMontoMoneda`, `CuentaSuspendidaPage`).
- **Config:** `Hot_click_outlet/src/main/resources/application.properties` (`asistente.cuota.*`, `security.trusted-proxies`).

## Próximos pasos exactos
1. `cd /workspace/hotclick-dev2 && git fetch origin && git checkout master && git merge --ff-only origin/master`.
2. Ver los PR abiertos: `gh pr list --state open`. Si ya hay 3, esperar.
3. Rama `fix/area6-bajos-memoria`:
   - `ON CONFLICT` en `CustomerMemoryService`, con test en H2;
   - migración `V<siguiente>__drop_idx_customer_memory_visitor.sql` (`DROP INDEX IF EXISTS`);
   - fila en Amenazas.
4. Rama `fix/area9-cajero-bodegas`: `rol_en_empresa` en el store y ocultar los botones de bodegas, con test vitest. Rebuild de `static/` en un commit aparte.
5. Después, los BAJOs de front y de Seguridad, en PR chicos.
6. Tras cada merge, avisar al Mentor (hash), a QA (re-QA) y al auditor del área.
