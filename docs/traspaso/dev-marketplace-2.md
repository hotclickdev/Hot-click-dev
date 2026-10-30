# Traspaso — HotClick Dev Marketplace 2

Actualizado: 30-oct-2026, 12:10 (hora CR). Sin secretos: ninguna llave, token ni `.env` aparece acá.

## Rol
- Segundo dev full-stack del repo `hotclickdev/Hot-click-dev` (Spring Boot + React/Vite).
- Dueño del **área 6** (chatbots, asistente de compras, copilot, IA) y del **área 9** (frontend/UX).
- Reporta solo al Mentor (que habla por Andrés). Coordina con HotClick Dev Marketplace (áreas 2 y 3), que no toca `shoppingassistant`, `rag` ni frontend fuera de 2/3.
- Checkout de trabajo en el box: `/workspace/hotclick-dev2` (identidad git configurada solo local).

## Estado
- **Área 6: cerrada** (ALTO-1, ALTO-2 y MEDIO-1 en master; ✅ del Mentor sobre `da481550`).
- **Área 9:** C1, C2 y C3 en master.

### PRs mergeados
| PR | Tema | Merge en master |
|---|---|---|
| #372 | área 6 | `f6ded0be` |
| #378 | área 6 | `bf5602c8` |
| #373 | área 6 | ya en master |
| #432 | cuota del asistente / precios Claude | `7dd0a11d` |
| #433 | C3 (USD) y frontend | `da481550` |
| #434 | MEDIO-1 memoria por tienda (V210) + BAJOs 404/logs | `02fd6fdd` |

## Trabajo abierto
- **#442** `feat/area6-fk-tarifas-incident` (https://github.com/hotclickdev/Hot-click-dev/pull/442):
  - V211: FK `customer_memory.empresa_id` → `hot_click_empresa_tb` (ON DELETE CASCADE) + índice; NULL = memoria global.
  - 404/5xx del asistente con motivo genérico (nunca el `reason`), log del guard sin slug.
  - Panel `/plataforma/ia`: tarjeta "Tarifas vigentes" leída del backend (`ClaudePrecios`, `ia.precio.*`).
  - `IncidentClaudeClient` registra en `ai_uso` vía `ClaudeUsoRegistrador` (4 tipos de token).
  - Estado: esperar CI verde → APTO de Seguridad sobre el hash exacto → automerge de CI/CD.
- **#363**: PR anterior que sigue abierto; revisar estado antes de abrir más (máximo 3 abiertos).
- **#440**: esta rama de traspaso (`docs/traspaso-cuenta-nueva`), compartida por todos los bots.

## Pendientes BAJO (para un PR posterior)
1. Hashear las IPs en las llaves de los contadores (`r:`, `s:`, `rn:`).
2. Tope por red cuando la IP es desconocida.
3. Atrapar el `RangeError` en `formatMontoMoneda`.
4. i18n muestra "US$0.35" con punto (definir separador).
5. Artefacto de `Math.round` (1.005 da US$1).
6. `CuentaSuspendidaPage` muestra "₡6.200": confirmar con UX.
7. Dos bottom sheets apilados (cupón debajo del chat).
8. Cuota: 3 consultas por solicitud denegada → pasar a `INSERT ... ON CONFLICT`.
9. Concurrencia de la cuota probada solo en H2 (falta Postgres).
10. Sonar MAJOR: constructor de 12 parámetros en `ClaudePrecios`.
11. Filas viejas de memoria global (`empresa_id` NULL): limpiar o dejar vencer (requiere OK de Andrés si es borrar en producción).
12. La llave de la memoria sigue siendo el `visitorId` de la cookie.
13. El panel valoriza `ai_uso` con la tarifa principal (Haiku); los tokens de incidentes (Sonnet) quedan subvalorados en el total. Separar por modelo si importa.

## Ciclo de merge
1. Fix con test de regresión.
2. CI verde (gates: E2 comentario `tenant-global-ok` en cada rama sin empresa; fila en `docs/security/amenazas-activas.md` si cambian archivos de copilot; Sonar; gitleaks; E3 `static/` actualizado).
3. APTO de HotClick Seguridad **sobre el hash exacto** del head.
4. HotClick CI/CD hace el automerge.
- Git: merge de master en la rama; nunca rebase ni force-push. Máximo 3 PRs abiertos.
- Prohibido sin OK explícito de Andrés: deploy, gasto, cuentas nuevas, servidores nuevos, borrar datos de producción, llave live de ONVO. ONVO es el único procesador.

## Reglas de carga del box
- Local solo tests puntuales: `mvn -o -B test -Dtest=Clase1,Clase2 -Dsurefire.failIfNoSpecifiedTests=false` o un solo archivo de vitest.
- Suite completa, instancia local o rebuild de `static/`: `flock /workspace/hotclick/.suite-completa.lock nice <cmd>`, de a uno, y apagar lo que quede corriendo. QA tiene prioridad (C1 y área 8).
- Rebuild de `static/`: desde `Hot_click_outlet/frontend`, con todas las `VITE_*` sin definir (E3 rechaza los placeholders de CI): `flock ... nice env -u VITE_... npx vite build`. El `pnpm build` del box falla con Node 20 (pnpm 11 pide ≥22), así que typecheck aparte con `npx tsc --noEmit -p tsconfig.json`. `static/` siempre en commit aparte.
- Si master cambia y `static/` choca, reconstruir `static/` en vez de resolver conflictos a mano.

## Cómo continuar
1. `cd /workspace/hotclick-dev2 && git fetch origin` y revisar #442 y #363 (`gh pr view`).
2. Si master se movió, `git merge origin/master` en la rama, rebuild de `static/` si hay conflicto, push y pedir APTO nuevo a Seguridad con el hash.
3. Tras cada merge, avisar al Mentor (hash), a QA (re-QA en master) y al auditor del área (6 o 9).
4. Tomar los BAJO de la lista en un PR nuevo con su test.
5. Antes de tocar UI, leer la skill `hot-click-diseno-figma`; antes de trabajar, `hot-click-dev-workflow`.
