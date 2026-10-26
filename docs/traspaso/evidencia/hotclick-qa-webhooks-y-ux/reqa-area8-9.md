# Re-QA áreas 9 (Front/UX) y 8 (Bot Telegram) — origin/master d552ab88d
Fecha: 2026-10-26 (CR). Worktree /workspace/qa8-wt (ya eliminado). Solo lectura, análisis estático con `rg`/`sed`. Rutas front relativas a `Hot_click_outlet/frontend/src`, back a `src/main/java/com/hotclick`.
Tests: no corrieron. No hay `mvnw` ni `mvn` en el box (`mvn ... -Dtest=TelegramTokenFugaTest` → exit 127, log en tg-test.log). Vitest no se corrió. Existe el test nuevo `src/test/.../controller/TelegramTokenFugaTest.java` (C1). No había servidores locales; no se hizo curl.

## Área 9 — Front y UX
| # | Nivel | Estado | Evidencia |
|---|---|---|---|
| C1 subtotal USD en ₡ | ALTO | CORREGIDO | ItemRow.tsx:115 `formatMonto(subtotal, moneda)` |
| C2 unidades USD | ALTO | CORREGIDO (en código; falta confirmar la unidad del backend) | ItemRow.tsx:37 `precioAutollenado(p.precioVenta, moneda)`, :104-105 `aValorInput`/`desdeValorInput` |
| C3 US$ con 3 formatos | MEDIO | SIGUE | cotizacionService.ts:43 (en-US «$»), planesPrecios.ts:24 («US$9,50»), suscripcionHelpers.ts:43 («US$ 9.50») |
| C4 ₡ NBSP vs punto | MEDIO | SIGUE | 22 archivos con `new Intl.NumberFormat('es-CR')` fuera de utils/format.ts; POSReceipt.tsx:4, comprasHelpers.ts:3 |
| C5 err.message crudo | MEDIO | SIGUE | TilopayCardForm.tsx:81-82, configUi.tsx:37, WebAuthnStep.tsx:14, AdminWebAuthnSetup.tsx:9 |
| C6 modales sin scroll/role | MEDIO | SIGUE | ModalCliente.tsx y ProveedorFormModal.tsx: 0 coincidencias de `overflow-y-auto`, `max-h` y `role="dialog"` |
| C7 tuteo/usted | MEDIO | SIGUE | TiendaRapidaPanel.tsx:117, es.json:3283, AdminReporteContador.tsx:138, SuscripcionAcciones.tsx:39, CategoriaSelect.tsx:71 |
| C8 labels sin htmlFor | BAJO | SIGUE | CapturaProductoForm.tsx:73-75 (label sin htmlFor, `outline-none`) |
| C9 cerrar 32 px | BAJO | SIGUE | ClienteDetailModal.tsx:46, ProveedoresTable.tsx:85, SidebarContent.tsx:85 `w-8 h-8` |
| C10 texto 10 px | BAJO | SIGUE | MetodosPago.tsx:72 `text-[10px]` |
| QA8-003 video 4 redes | MEDIO | SIGUE | ProductVideo.tsx:40 `SEGMENTOS` fijo, :51 `SEGMENTOS.map`, :155 |
| Tuteo 1 usePayment | BAJO | SIGUE | hooks/usePayment.ts:128 «Intenta de nuevo o contáctanos» |
| Tuteo 2 VisitantePagoResultado | BAJO | CORREGIDO | VisitantePagoResultado.tsx:143 «Contactanos» |
| Tuteo 3 AdminForecast | BAJO | SIGUE | AdminForecast.tsx:166 «Necesitas…» |
| Tuteo 4 SuscripcionAcciones | BAJO | SIGUE | SuscripcionAcciones.tsx:39 «Elige un plan y paga» |
| Tuteo 5 AdminWebAuthnSetup | BAJO | SIGUE | AdminWebAuthnSetup.tsx:60 «Tienes una llave» |

## Área 8 — Bot Telegram
| # | Nivel | Estado | Evidencia |
|---|---|---|---|
| C1 token en logs/respuesta | ALTO | CORREGIDO (estático; test no corrido) | TelegramConfigController.java:98-99 `sinToken` + body genérico; TelegramBotWebhookController.java:57; TelegramBotUpdateService.java:91,93; TelegramTokenFugaTest.java existe |
| C2 suspensión 1 año | ALTO | SIGUE | TelegramRateLimitService.java:11 `RATE_POR_SEGUNDO = 3`; TelegramAbusoService.java:24 `BLOQUEO_DIAS = 365`, :98 `ESTADO_SUSPENDIDO`; TelegramMessageHandler.java:45 `rechazarSiInyeccion` |
| C3 dedup en memoria | MEDIO | SIGUE | TelegramUpdateDedup.java:15 `ConcurrentHashMap` |
| C4 revocarMiembro global | MEDIO | SIGUE | TelegramConfigService.java:88-97 revoca la vinculación del usuario |
| C5 webhook sin secret | MEDIO | CORREGIDO | TelegramConfigController.java:91-93 devuelve 503; TelegramClienteBotService.java:80,212 valida el charset |
| C6 tx larga/candados | BAJO | SIGUE | TelegramUpdateRouter.java:19,29 `computeIfAbsent` sin purga; TelegramBotUpdateService.java:47 `@Transactional` |
| C7 /start mayúsculas | BAJO | SIGUE | TelegramVinculacionService.java:37-43, sin `toUpperCase` antes de `findByCodigo` |
