# Traspaso — QA: estado por área (30-oct-2026, CR)

Fuente: `/workspace/qa/*/progreso.md` del box y los reportes de QA. Hashes de `hotclickdev/Hot-click-dev`.
Detalle del rol QA 7 (admin/roles, #350, LECTOR) en `hotclick-qa.md`.

## Estado por área

| Área | Estado | Hash | Notas |
|---|---|---|---|
| C1 (ONVO test) | PASA | `649387e7` | Registro/OTP, tienda, SINPE y tarjeta (aprobada/declinada), invitado y usuario, retiro y envío, 2FA email. Solo llaves `onvo_test_`. |
| 2 Cuentas y roles | ✅ | `dcc27edc` | Sujeto al Auditor 2. `reporte-iva` sin probar en Postgres (solo H2). |
| 3 Marketplace | A-1 y #402 OK | `72eb8add` | Espera la decisión A-2 de Andrés. BAJO: falla en reglas de publicación deja la fila creada con `visible=true` (mismo orden que el alta individual). |
| 4 POS | ✅ | — | QA POS (ver `hotclick-qa-pos.md`). |
| 5 Suscripciones | ✅ | `0c85eb2d` | 28 clases, 283 tests, 0 fallos. |
| 6 Chatbots/Copilot | ✅ firme | `da481550` | Cupos, XFF/IPv6, V209 (H2 y PG17), ALTO-1/ALTO-2 verdes. MEDIO-1 en PR #434 pendiente. |
| 7 Facturación/Hacienda | ✅ firme | `da481550` | #431 (emisión solo admin HotClick, interruptor automático, token sin vacío, logs sanitizados). BAJO: `HaciendaLogSanitizer` no enmascara cédulas con guiones (`3-101-123456`). |
| 8 Bot Telegram | ✅ | `25b415d9` | 152 tests dirigidos + CI verde. |
| 9 Front/UX | ✅ firme | `da481550` | vitest, typecheck, build, C3 (`US$9,50`). BAJO: locales es/en/pt «US$0.35» con punto. |
| 10 Infraestructura | Trabada por INF-01 | `650da142` | INF-03 ✅ con reserva: falta definir el umbral en prod. |
| C2 a C6 | Pendientes | — | Correr sobre el master final. |

Staging local `:8081` en `3323bd1a` con el usuario 7 provisional. No tocarlo.

## Evidencia (box)
- `/workspace/qa/c1/` (evidencia saneada en `ev/`), `/workspace/qa/a2`, `a3`, `a5`, `a6`, `a7`, `a8`, `a9`, `a10`.
- Cada carpeta tiene `progreso.md`, logs (`mvn-*.log`, `vitest-*.log`, `pg-v209.log`) y tests temporales como `*.java.txt` / `*.test.ts.txt` (nunca se commitean).

## Checklist predeploy
- [ ] `PLANES_MONEDA` y precios de planes revisados contra ONVO (solo nombres de variables aquí).
- [ ] `ONVO_WEBHOOK_401_UMBRAL` definido para prod (INF-03).
- [ ] `hacienda.emision-automatica` (`HACIENDA_EMISION_AUTOMATICA`): apagado por defecto; encender solo tras probar la emisión manual.
- [ ] `hotclick.iva.cambio-regimen.enabled` (`HOTCLICK_IVA_CAMBIO_REGIMEN_ENABLED`): decidir valor.
- [ ] Smoke de `SKIP LOCKED` en Postgres real (cola de contingencia; en H2 el test se salta).
- [ ] `reporte-iva` probado en Postgres.

## Reglas
- Worktree propio por hash; sin stash, sin `pkill` (parar solo PIDs propios).
- `unset ONVO_*` antes de Maven; nunca imprimir ni guardar llaves.
- Todo Maven bajo `flock /workspace/hotclick/.suite-completa.lock`; esperar si la carga pasa de 50.
- Local solo tests dirigidos y negativos; la suite completa es el CI de GitHub (`gh run list --commit <hash>`).
- Sin commit/push/merge/deploy sin OK explícito; sin datos reales; no tocar staging ni prod.

## Cómo continuar
1. Re-QA de #434 (área 6) cuando Seguridad dé el APTO sobre el head exacto; después re-QA sobre master.
2. Área 3: aplicar la decisión A-2 de Andrés y repetir A3BulkQaTest.
3. Área 10: retomar cuando se cierre INF-01.
4. Área 7: PR chico para enmascarar cédulas con guiones.
5. C2 a C6 sobre el master final, con la checklist predeploy.
