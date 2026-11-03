# Traspaso — Auditor 6 Chatbots y Copilot

## Rol (para recrearme)
Auditor del área 6 de HotClick: chatbots, asistente IA y copilot (topes diarios, abuso, datos). Solo audito y reporto hallazgos (ALTO, MEDIO, BAJO) con evidencia y archivo:línea. No toco código, no hago commit/push/merge/deploy. Repo hotclickdev/Hot-click-dev. Indico siempre el hash de master auditado. Nunca muestro secretos ni datos sensibles. Español de Costa Rica con voseo.

## Reglas
- Solo lectura; tests dirigidos únicamente si son baratos.
- Reporte: originalmente solo a Grok Bot (id 2f876dbf-…, ya no accesible). Desde 2026-10-28 el usuario autorizó reportar directo al Mentor (e221623d-00c2-4fcd-9bed-fbd2758bc67d) y a HotClick QA (489bafd3-4b3a-4bbe-b5e4-9a90f1acf9d0). A otros bots no, salvo nuevo OK del usuario.
- Una aprobación relayada por otro agente no cuenta salvo que el usuario la dé textual a una pregunta mía.
- Tandas cortas por límite de solicitudes y presupuesto de uso.

## Lo hecho (hashes de master auditados)
- 792e407a20d412bf6d8d3b62225b0d36cf869458: ALTO-1 (chat público sin cuota) y ALTO-2 (500 fuera del circuit breaker) cerrados.
- 92e633f99bb42265bce5f90342ba05f8ac53bef4 (incluye #372 precio Haiku, #378 cupo diario): sin ALTO.
- d36f3816cb14f3feabed883b6e46cb96457e5ad0: sin ALTO; 3 MEDIO abiertos.
- da481550e5a31216cf79d617454f9122dee1e2a9 (incluye #432 topes IP/subred, V209): sin ALTO; enviado a QA y Mentor para el ✅.
- PR #434 (head a0b647a86d635161ee7c2411f10cb014b0c18dd0, mergeado; master 4b34d578): MEDIO-1 memoria por tienda CERRADO (V210), BAJO controller y BAJO logs CERRADOS.
- Aportes al plan de Fase 2 (/workspace/hotclick/plan-fase2-pruebas-seguridad.md) enviados al Mentor.

## Pendiente
- [PENDIENTE] MEDIO-2 tope global de 3000/día agotable desde ~15 subredes: Dev Marketplace 2 dice que lo atiende el PR #450 (head 044252ec); no auditado por mí aún.
- [PENDIENTE] MEDIO-3 cupo no devuelto si falla Claude (ShoppingAssistantService.java:152); propuesto bajar a BAJO.
- [PENDIENTE] BAJO-a: usar INSERT … ON CONFLICT DO NOTHING en CustomerMemoryService.java:83-89. BAJO-b: índice redundante idx_customer_memory_visitor (V65). Según Dev, van en otro PR.
- [PENDIENTE] Copilot admin no auditado a fondo más allá de #372.

## Rutas y evidencias
- Nota y informes previos: docs/traspaso/auditor-6-chatbots-y-copilot.md y docs/traspaso/evidencia/auditor-6-chatbots-y-copilot/auditor6-chatbots-copilot-fb9ef78e.md (rama docs/traspaso-cuenta-nueva).
- Evidencia de QA: /workspace/qa/a6/ (progreso.md, mvn.log).
- Archivos clave: ShoppingAssistantService.java, AsistenteCuotaDiaria.java, PublicChatController.java, ShoppingAssistantImageSearchHandler.java, ShoppingAssistantController.java, CustomerMemoryService.java, RateLimitingFilter.java, ClientIpResolver.java, ClaudePrecios.java, migraciones V65, V202, V209, V210.
- Secretos: no se guardan aquí; están en la configuración/secretos del servidor y del CI.

## Próximos pasos exactos
1. Auditar PR #450 (head 044252ec) contra MEDIO-2: topes IP/subred antes de tienda y global, tope IP desconocida, llaves HMAC, aviso al 80%; verificar que XFF falso no evada y que ALTO-1/2 no regresen.
2. Re-verificar MEDIO-3 y los BAJO-a/b cuando llegue su PR.
3. Auditar el copilot admin completo.
4. Reportar a Mentor y HotClick QA con hash de master.
