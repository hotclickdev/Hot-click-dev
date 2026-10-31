# QA5 área 1 — PR #308 head b7b61632 (local :8080, DB copia hotclick_qa5_b456, ONVO test) — 2026-10-26 CR
| Run | Resultado | Evidencia |
|---|---|---|
| Caso 1 marketplace tipo 0 (<IDENTIFICACION_PRUEBA>) | OK — PM creado, PENDIENTE hasta webhook; secreto malo 401 sin cambio; webhook válido -> PAGADO/CAPTURADO, es_prueba=t | caso1-marketplace-tipo0.md |
| Caso 1 marketplace tipo 1 (<NUMERO_REDACTADO>) | OK — idem (pedido 12) | caso1-marketplace-tipo1.md |
| Caso 1 POS tipo 0 | OK — sesión PENDIENTE hasta webhook; 401 sin cambio; válido -> PAGADO, pedido 10, stock liberado | caso1-pos-tipo0.md |
| Caso 1 POS tipo 1 | OK — idem (pedido 11) | caso1-pos-tipo1.md |
| Caso 2 confirmar/rechazar-sinpe con admin plataforma | OK — 410 ambos, pago 5 sigue PENDIENTE | caso2-confirmar-sinpe-410.md |

Notas:
- Primer intento marketplace con números SINPE no-prueba (<NUMERO_REDACTADO>/<NUMERO_REDACTADO>): ONVO test 400 "not part of the testing payment methods" (esperado en test; usar <TELEFONO_PRUEBA>). Evidencia *-intento1-numero-no-prueba.md.
- 1er webhook de tipo0 se envió con "ONVOPI:" prefijo (error del tester) -> 200 sin cambio; reintento con id crudo OK.
- Un 429 rate-limit en guest-checkout por ráfaga del tester; reintento OK.
- PII: 0 coincidencias de nombre/cédulas en backend.log.
- Intents ONVO test huérfanos nuevos: cmvp45vtj0bt3k77fpdq6wdcu, cmvp45wag0tqlk125ly7c2fka (de los intentos con número no-prueba; confirma QA5-B456-02). Previo: cmvp3iquv0bsuk87ggb4oz6qk.
- Admin ficticio id 1069 <cuenta-prueba> y turno de caja 1 (abierto) solo en hotclick_qa5_b456. Password en <archivo-local-credencial> (600).
- Backend detenido. Worktree /workspace/qa5-b7b61632.
- Sin bugs críticos/altos nuevos.
