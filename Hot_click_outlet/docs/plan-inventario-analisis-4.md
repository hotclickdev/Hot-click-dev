# Analisis 4 agentes

### 7886acaf
## Global `@ControllerAdvice`

**Sí existe.** `C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\src\main\java\com\hotclick\config\GlobalExceptionHandler.java`

- `@RestControllerAdvice` L27
- `IllegalArgumentException` → **400** L106–109
- `IllegalStateException` → **400** sin cause, **500** con cause L111–120
- `RecursoNoEncontradoException` (inventario) hereda `NoSuchElementException` → **404** L123–128

`InventarioPaqueteController` no tiene handlers locales.

---

## I1 — UI editar línea en detalle tablet

| | |
|---|---|
| **(a) Gap** | BE + service FE listos; **sin UI de edición**. Detalle solo lectura + borrar: `AdminInventarioPaqueteDetalle.tsx` L211–240 (lista), L124–136 (`borrarLinea` única acción). `actualizarLinea` nunca invocado en FE. BE exige paquete ABIERTO: `InventarioPaqueteService.java` L137. |
| **(b) Files** | `frontend\src\pages\admin\AdminInventarioPaqueteDetalle.tsx` (form/modal editar + guardar); opcional componente hermano; `frontend\src\services\inventarioPaqueteService.ts` (ya OK L87–88). BE sin cambio salvo relajar estado (fuera de scope I1). |
| **(c) Risk** | **Medio** — flujo bloqueado sin I7 (reabrir CERRADO); validación `@Min(1)` en `precioVenta` (`PaqueteLineaRequest.java` L22). |
| **(d)** | **ACCEPT** — API existe; sin UI no se resuelven CONFLICTO antes de assign. |

---

## I2 — Bloquear assign si 0 líneas LISTO

| | |
|---|---|
| **(a) Gap** | `asignar` valida CONFLICTO (L206–212) pero **no cuenta LISTO**. Con 0 líneas o 0 LISTO marca ASIGNADO sin materializar: L215–223. Test vacío solo cubre empresa distinta: `InventarioPaqueteServiceTest.java` L192–193. |
| **(b) Files** | `src\main\java\com\hotclick\service\inventario\InventarioPaqueteService.java` (guard pre-loop ~L213); `src\test\java\com\hotclick\service\inventario\InventarioPaqueteServiceTest.java`; opcional disable/guard FE: `AdminInventarioPaqueteDetalle.tsx` L104–122, L185. |
| **(c) Risk** | **Bajo** — guard de negocio claro; mensaje vía `IllegalStateException` → 400 global. |
| **(d)** | **ACCEPT** — bug real; fix acotado (~5 líneas + test). |

---

## I3 — Mapear IAE/ISE inventario → HTTP 400

| | |
|---|---|
| **(a) Gap** | **BE ya mapea** IAE/ISE sin cause a 400 en `GlobalExceptionHandler.java` L106–115. Inventario usa esos tipos: `InventarioPaqueteService.java` L145, L175, L203, L210, L392, L460. **Gap real: FE** — toasts usan `e.message` de Axios (`"Request failed with status code 400"`), no `response.data.message`: `AdminInventarioPaqueteDetalle.tsx` L84, L98, L118, L132; `AdminInventarioCaptura.tsx` L68, L131, L146. 500 restantes = excepciones no-IAE/ISE (p. ej. unique violation → I4). |
| **(b) Files** | `frontend\src\services\api.ts` o util `mensajeErrorApi.ts`; consumidores inventario arriba. **No** nuevo `@ControllerAdvice` salvo auditoría puntual. |
| **(c) Risk** | **Bajo** si solo FE; **medio** si handler global amplía scope (afecta todo el API). |
| **(d)** | **SHRINK** — backend cubierto; priorizar helper FE que lea `ResponseDTO.message`. |

---

### Resumen

| ID | Veredicto | Razón |
|----|-----------|-------|
| I1 | ACCEPT | BE listo; UI edit ausente bloquea resolver conflictos |
| I2 | ACCEPT | Assign vacío permitido hoy |
| I3 | SHRINK | Global handler ya devuelve 400; basura viene del FE |

[REDACTED]

### bd33c8d8
## I4 — `agregarLinea` unique violation → retry sum stock

**Plan:** `docs/plan-inventario-no-contemplado.md:20`

| | |
|---|---|
| **Gap** | `C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\src\main\java\com\hotclick\service\inventario\InventarioPaqueteService.java:115-131` — find-or-insert sin `catch`; carrera pistola/doble tap → ambos pasan `findByPaqueteIdAndBarcode` → insert choca `idx_paquete_linea_barcode_unico` (`V131:49-51`) → 500. Documentado en `docs/qa-inventario-pendientes.md:8`. Test solo happy-path merge (`InventarioPaqueteServiceTest.java:118-141`), sin race. |
| **Touch** | `InventarioPaqueteService.java`, `InventarioPaqueteServiceTest.java` |
| **barcodeHid hoy** | N/A (BE). FE ya normaliza antes del POST. |
| **useOffline hoy** | N/A. |
| **Veredicto** | **ACCEPT** — gap real. **SHRINK:** solo catch+retry, sin test de concurrencia real (mock `DataIntegrityViolationException`). |

---

## I5 — Normalizar barcode BE = reglas `barcodeHid`

**Plan:** `docs/plan-inventario-no-contemplado.md:21`

| | |
|---|---|
| **Gap** | FE `barcodeHid.ts:2-6`: `trim()` + rechaza vacío/`length < 4`. BE inconsistente: `agregarLinea`/`actualizarLinea` → `blankToNull(sanitizer.cleanWithLimit(...))` (`:118`, `:140`, mapper `:51`) — trim + strip control chars, **sin min 4**; `lookup` → solo `trim()` (`:177`), sin sanitizer; import → `blankToNull(req.getBarcode())` (`:250`) sin sanitizer. Cámara FE solo `trim()` (`BarcodeCameraScan.tsx:56`), no usa `barcodeHid`. |
| **Touch** | Nuevo util BE (p.ej. `BarcodeNormalizer.java`), `InventarioPaqueteService.java` (lookup/agregar/actualizar/import), tests BE; opcional alinear cámara FE con `barcodeHid`. |
| **barcodeHid hoy** | `trim()` → null si vacío o `<4` chars. Tests: EAN-13, espacios, rechazo corto (`barcodeHid.test.ts`). Usado en `BarcodeHidInput.tsx:29`; cámara no. |
| **useOffline hoy** | N/A. |
| **Veredicto** | **ACCEPT** — discrepancia FE/BE confirmada. **SHRINK:** util compartido solo `trim`+`minLength(4)` en lookup/agregar/actualizar; omitir sanitizer en barcode numérico y no tocar cámara. **REJECT:** no hace falta si se acepta solo trim BE (insuficiente vs plan). |

---

## I6 — Auto-sync cola captura + contador en Captura

**Plan:** `docs/plan-inventario-no-contemplado.md:22`

| | |
|---|---|
| **Gap** | `capturaSyncService.ts` existe pero solo invocado manual en `AdminOfflineCola.tsx:51-54`. `useOffline.ts:27-37,41,62` — `syncAhora`/evento `online`/mount llaman solo `procesarCola()` (`offlineDb`), **no** `procesarColaCaptura()`. `contarPendientes()` (`offlineDb.ts:104`) no incluye IndexedDB captura (`hotclick-captura-offline`). `AdminInventarioCaptura.tsx:27` — solo `isOnline`; encola offline (`:103-114`) sin auto-sync ni badge pendientes. |
| **Touch** | `useOffline.ts`, `capturaSyncService.ts`, `capturaOffline.ts` (+ `contarCapturaPendientes`), `AdminInventarioCaptura.tsx`; opcional `OfflineBanner.tsx` si unificar contadores. |
| **barcodeHid hoy** | N/A. |
| **useOffline hoy** | `navigator.onLine` + listeners `online`/`offline`; `syncAhora` → `procesarCola()` FIFO POS/pedidos; contador = cola general; auto-sync al online y al mount; Captura UI ignora `pendientes`/`syncAhora`. |
| **Veredicto** | **ACCEPT** — cola captura huérfana del hook. **SHRINK:** wire `procesarColaCaptura` en evento `online` sin contador UI (sync silencioso). **REJECT:** no aplica; el problema es real. |

---

**Resumen:** I4–I6 **ACCEPT** tal como están en el plan. SHRINK posible en I4 (sin test race), I5 (

### c3216101
## I7 — Reabrir CERRADO → ABIERTO

**Verdict: must-now**

`PaqueteInventario` states: `ABIERTO` | `CERRADO` | `ASIGNADO` (`C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\src\main\java\com\hotclick\model\PaqueteInventario.java`).

Flow today: edit only in `ABIERTO`; `cerrar` → `CERRADO`; `asignar` requires `CERRADO` → `ASIGNADO` (terminal). No `reabrir` in service/controller. Model allows `CERRADO`→`ABIERTO`; `ASIGNADO` must stay blocked.

---

## I8 — Tests regresión

**Verdict: must-now**

**Existing in `InventarioPaqueteServiceTest`** (`C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\src\test\java\com\hotclick\service\inventario\InventarioPaqueteServiceTest.java`):

| Test | Covers I8? |
|------|------------|
| `lookup_enPaquete` | no |
| `lookup_enMaestro` | no |
| `agregarLinea_mismoBarcode_sumaStock` | partial (upsert, not unique race) |
| `actualizarLinea_barcodeDuplicado` | no |
| `asignar_rechazaConflictos` | **yes — CONFLICTO falla** |
| `asignar_rechazaEmpresaDistinta` | extra |

**Missing:** assign OK (crea/reusa), vacío falla, reabrir, unique race graceful.

**Security smoke:** `SecurityEndpointsTest` — 3 GET `/api/inventario/paquetes` (401/403/200). No POST assign/reabrir.

---

## R1–R6 — Recomendados

| ID | Qué | Verdict |
|----|-----|---------|
| **R1** | Auto CONFLICTO si EN_EMPRESA difiere | **later** — manual via I1/notas enough for MVP; deferred in `qa-inventario-pendientes.md` |
| **R2** | Plantilla Excel FE | **later** — UX; FE-only ok |
| **R3** | Filtro lista por estado/código | **later** — repo has `findByEstado…`, no API/UI |
| **R4** | `garantiaDias` → Producto | **later** — optional mapping |
| **R5** | Auditoría al asignar | **later** — ops nice-to-have |
| **R6** | Borrar línea en mobile | **later** — DELETE + tablet borrar exist; mobile symetry only |

**skip:** none — all R items are valid **later** work, not out of scope.

[REDACTED]

### e5e47965
## Consejo — I1–I8 (`plan-inventario-no-contemplado.md`)

### 1. ¿Está bien implementar I1–I8 ahora?

**Sí, con un recorte.** El plan apunta a huecos reales confirmados en código:

| ID | Estado actual | ¿Indispensable? |
|----|---------------|-----------------|
| **I1** | API `actualizarLinea` existe; `AdminInventarioPaqueteDetalle` solo lista/borra | **Sí** — sin UI no se resuelven CONFLICTO |
| **I2** | `asignar` no exige ≥1 línea LISTO | **Sí** — puede marcar ASIGNADO sin productos |
| **I3** | `GlobalExceptionHandler` ya mapea `IllegalArgumentException` / `IllegalStateException` → 400 | **Parcial** — ver drops |
| **I4** | Race check-then-insert; unique index puede dar 500 | **Sí** en campo (doble tap pistola) |
| **I5** | BE solo `trim`; FE exige ≥4 chars (`barcodeHid`) | **Sí** — discrepancia FE/BE |
| **I6** | `procesarColaCaptura` solo en `/admin/offline/cola` manual; `useOffline` sync la cola general | **Sí** para valor offline real |
| **I7** | No existe `reabrir`; CERRADO es terminal salvo assign | **Sí** — cierre prematuro = callejón |
| **I8** | Tests parciales (conflicto, empresa, barcode); faltan happy path assign, vacío, reabrir, race | **Sí** — red de seguridad |

Sin migraciones nuevas. No viola capas, tenants ni secretos.

---

### 2. ¿Qué afecta? (módulos / riesgos)

**Tocado:** `InventarioPaqueteService`, `InventarioPaqueteController`, `AdminInventarioPaqueteDetalle`, `AdminInventarioCaptura`, `capturaSyncService` / `useOffline`, tests inventario + smoke security.

**Riesgos indirectos:**
- **Assign** materializa vía `ProductoService` + `StockService` — I2 mal hecho no debe romper idempotencia.
- **I7 reabrir** — revalidar que solo CERRADO→ABIERTO y no ASIGNADO; evitar editar post-materialización.
- **I4 retry** — debe sumar stock, no duplicar línea.
- **I6** — dos colas offline (general vs captura); no mezclar contadores.

**Bajo impacto** fuera del módulo inventario-paquetes.

---

### 3. ¿Vale la pena vs shippear código actual?

**Sí, pero no todo junto es igual de urgente.**

El gate QA está verde, pero el flujo manual real tiene callejones:
- CONFLICTO sin UI de edición → assign bloqueado sin salida (sin I1/I7).
- Paquete vacío assignable → ASIGNADO basura (I2).
- Offline captura requiere ir a cola manual (I6).
- Doble scan / trim → 500 o lookup fallido (I4/I5).

**Costo:** ~1–2 días enfocados. **Costo de no hacerlo:** operaciones en campo trabadas o datos inconsistentes. El workaround manual (cola offline, SQL) no escala.

---

### 4. ¿Alternativa más chica?

**Oleada mínima (ship blocker):** I1 + I2 + I7 + I8 (happy/empty/reabrir)

**Oleada 2:** I6 (auto-sync + contador en captura)

**Oleada 3:** I4 + I5 (+ handler `DataIntegrityViolation` aquí, no como I3 aparte)

**Drops explícitos:**
- **I3 como ítem standalone** — ya cubierto para IAE; solo agregar DataIntegrity dentro de I4.
- **R1–R6** — mantener fuera (plan ya lo dice).

---

## Veredicto: **PROCEED_WITH_CHANGES**

| Mantener | Recortar / reordenar |
|----------|----------------------|
| I1, I2, I4, I5, I7, I8 | **Drop I3** → fusionar en I4 |
| I6 si hay capacidad | Si timebox apretado: **defer I6** (workaround en `/admin/offline/cola`) |

Orden: **I1+I2+I7+I8** → **I6** → **I4+I5**. No ampliar a R1–R6 ni export server en esta oleada.

[REDACTED]
