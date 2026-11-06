# QA5 área 1 — master b4560f3c (local, ONVO test) — 2026-10-26 CR
| Caso | Resultado | Evidencia |
|---|---|---|
| 1 SINPE marketplace pendiente hasta webhook | FALLA (alta) | caso1-sinpe-webhook.md |
| 2 confirmar/rechazar-sinpe 410 | PARCIAL (401 sin token; 410 solo por código, no hay admin plataforma local) | caso2-confirmar-sinpe-410.md |
| 3 pedido de prueba e2e | PARCIAL (checkout test OK, webhook sin pago -> 409; captura no completada) | caso3-pedido-prueba.md |
| 4 logs sin nombre/cédula | OK | caso4-logs-pii.md |
| QA5-002 bodegaId=1 envío | NO REPRODUCE (200, bodega 2) | qa5-002-003-recheck.md |
| QA5-003 FK 500 pago | REPRODUCE en hotclick_dev (drift FKs legacy "HOT_CLICK_*"), no en copia | backend-run1-hotclick_dev.log 04:08:41 |

Altas: OnvoService.java:356-372 (mobileNumber sin number -> ONVO 400); OnvoService.java:338-348 (tipo id 0 rechazado / formato con guiones).
Intent ONVO test huérfano: cmvp3iquv0bsuk87ggb4oz6qk. DB copia hotclick_qa5_b456 se conserva. Backend detenido.
