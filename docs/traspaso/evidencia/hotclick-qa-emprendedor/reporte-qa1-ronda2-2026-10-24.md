# QA 1 — Ronda 2 — 24/10/2026 00:28–00:31 CR — staging local 387bab8c (V188)
Ambiente: backend :8080 cupos 200, front :3000 200, Mailpit :8025 200 (evidencia/r2/00-ambiente.txt).
| Caso | Estado | Evidencia |
|---|---|---|
| Registro único send-verification (qa1+emp…@example.com, cédula sintética) | FALLÓ 400 — sin teléfono en el cuerpo; columna telefono NOT NULL (QA1-006). Sin reintento por regla | r2/01-send-verification.txt, r2/01-log-send-verification.txt |
| Código Mailpit + verify-registration | No ejecutado (no hubo envío) | — |
| Login, plan Emprendedor ONVO 4242, perfil, /emprendedor/* (E1-C4/C6, E3–E7) | BLOQUEADOS: sin cuenta. Sin cobros ni suscripciones sandbox | — |
| QA1-002 | Probablemente resuelto en send-verification; /register sin re-probar | bugs/QA1-002 |
| QA1-003 | RESUELTO (lectura de cupos 1/70, sin errores SQL) | r2/00-ambiente.txt |
| QA1-004 | Pendiente de re-prueba | bugs/QA1-004 |
| Chatbot P1 garantía/medidas (productoId 3) | Parcial: garantía sí ("no consta"), medidas no (QA1-008). 0 productos; sin QA-TEST | r2/chatbot.txt |
| Chatbot P2 "algo cómodo para la sala" | Contesta coherente: no hay productos (catálogo staging solo 2 productos "QA5 …"). 0 productos; sin QA-TEST. Relevancia no evaluable con este catálogo | r2/chatbot.txt, r2/productos.json |
| Chatbot P3 envío | FALLA: lo trata como búsqueda (QA1-007). 0 productos; sin QA-TEST | r2/chatbot.txt |
Credenciales: credenciales-internas.txt (600). La cuenta NO existe: no sirve para QA Compra/POS.
