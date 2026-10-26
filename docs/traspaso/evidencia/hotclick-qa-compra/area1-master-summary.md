# QA5 re-QA Área 1 (Pagos y Checkout) en master d552ab88 — 2026-10-26 CR
Backend propio :8080 (jar del worktree qa5-master-d552ab88, DB hotclick_qa5_b456, ONVO test). origin/master avanzó a f9f0e506 (solo scripts staging/backup #330/#331, sin código de pagos). Staging :3000/:8081 no se tocó; ningún secret en su .env.

| Caso | Estado | Nivel | Evidencia |
|---|---|---|---|
| SINPE marketplace cédula tipo 0 | OK | - | caso1-marketplace-tipo0.md (pedido 17) |
| SINPE marketplace cédula tipo 1 | OK | - | caso1-marketplace-tipo1.md (pedido 18) |
| SINPE POS tipo 0 / tipo 1 | OK | - | caso1-pos-tipo0.md, caso1-pos-tipo1.md (pedidos 19, 20) |
| Caso 2 confirmar/rechazar-sinpe → 410 | OK | - | caso2-confirmar-sinpe-410.md |
| Tarjeta paid+open → PAGADO, es_prueba, duplicate | OK | - | caso3-tarjeta-paid-open.md (pedido 14) |
| P-05 concurrencia [4,5]/[5,4] | OK (200/200, sin deadlock) | - | p05-concurrencia.md (pedidos 22, 23) |
| P-06 dirección obligatoria | OK (400 sin/vacía, 200 con dirección, envios[] sin dirección 400) | - | p06-direccion.md (pedido 21) |
| P-07 compra manual sin bodegaId | FALLO | MEDIO | p07-p08.md: bodega OK (plataforma), pero 400 + pedido 24 creado (CacheEvict con empresa null) |
| P-08 bodegaId=1 explícito | OK (400 "La bodega elegida no es de la tienda") | - | p07-p08.md |
| NUEVO: auto-bloqueo PaymentExpirationCleanupService | FALLO | ALTO | bloqueo-cleanup.md, threaddump-*.txt, backend-run1-bloqueo.log |

Cambio de datos local: pagos 11-13 fecha_creacion=now() (solo DB local) para destrabar el bloqueo.

Cierre: backend propio PID 2858255 detenido con kill por PID (13:06 CR). Worktree /workspace/qa5-master-d552ab88 (incluido su target/) eliminado con git worktree remove. No se tocaron los procesos de staging ni el puerto 8080 de otros.
