# QA 1 — Ronda 3 — 24/10/2026 01:48–01:50 CR — staging local 387bab8c (:8080/:3000)
Cuenta: emprendedor de credenciales-internas.txt (no se repiten datos aquí). Negocio "QA1 Negocio Prueba" (id 5, slug qa1-negocio-prueba). Sin cobros ni cambios de plan, sin SQL.

| # | Tarea | Estado | Evidencia |
|---|---|---|---|
| 1 | Aprobar SOLO solicitud id 5 con admin QA (login HTTP) | OK: solo había esa pendiente; PUT …/5/aprobar → 200 "Empresa aprobada"; luego 0 pendientes | evidencia/r3/01-solicitudes-antes.json, 03-aprobar.txt, 04-despues.txt |
| 2 | Producto activo y en tienda pública | OK: antes /api/tienda/qa1-negocio-prueba → 404; después 200 y producto id 16 estado 1, visibleCatalogo true, stock 5, ₡5000; también en /api/productos. Vista en navegador: pendiente de captura | 02-antes.txt, 04-despues.txt |
| 3 | Chatbot visitante | P1 (productoId 16): responde mal la garantía y omite medidas → QA1-009. P1b por nombre: devuelve el cojín + otros QA-TEST. P2 "sala": cojín y sofá QA-TEST relacionados → repite QA3-013 (evidencia sumada, sin duplicar). P3 envío: no contesta → repite QA1-007 | 05-chatbot.txt |
| 4 | /cupos | NO CONCLUYENTE: usados 4/70 (66 libres) antes y después de aprobar; el cupo no cambia al aprobar. En ronda 2 (00:29) era 1; la baja pudo ocurrir en el registro por UI (01:44) pero el staging lo comparten otros QA y no se puede atribuir | 02-antes.txt, 04-despues.txt |
| 5 | 404 onboarding en /emprendedor | Reproducido con login emprendedor: 404 "Este negocio no viene de un enlace de asignación." Endpoint existe; aplica solo a negocios de enlace de asignación. Severidad Baja → QA1-010 en pendientes | 06-login-emprendedor.txt, 07-onboarding.txt |

Nota: el registro de empresa sin código de verificación ni cédula se re-verifica cuando el staging pase a #260 (sin bug abierto).
Observación: la descripción del producto dice "garantía 30 días" pero garantiaDias=0 (dato cargado por UI); conviene que el formulario pida la garantía en su campo.
