# Traspaso: Auditor 6 Chatbots y Copilot

- Rol: auditor solo lectura de los chatbots de producto y el copilot de HotClick (relevancia, prompt injection, costos, fuga de datos). Reporta solo a Grok Bot.
- En qué quedé: auditoría completa sobre master fb9ef78e (25-oct). 2 ALTO, 3 MEDIO, 3 BAJO y 8 mejoras.
- Ramas y PRs: ninguno. Mi rol prohíbe tocar código, hacer push y abrir PRs.
- Pendientes: que Andrés apruebe la lista y los bots Dev implementen. Fuera de alcance quedaron Telegram/n8n (Auditor 8), la búsqueda por imagen y security-tools/guardrails.
- Próximos pasos: Dev corrige ALTO-1 (cuota y topes del chat público) y ALTO-2 (contingencia 200 fuera del circuit breaker). Después, re-auditar sobre el hash del arreglo.
- Decisiones de Andrés que conozco: solo lectura, cero cambios en prod, informes en dos listas (CORRECCIONES y MEJORAS), tope de uso semanal de 97%, Bugs investiga el 500 del asistente público.
- Evidencia: evidencia/auditor6-chatbots-copilot-fb9ef78e.md (sin secretos ni datos personales).

## Correcciones al README

Leído en origin/docs/traspaso-cuenta-nueva: el head era c69dcc32, no b9f241d8. Solo lectura.

### (a) Errores o datos viejos
- Fila del Auditor 6 (línea 136): el enlace a docs/traspaso/auditor-6-chatbots-y-copilot.md puede estar roto, porque yo no hice push. La nota y la evidencia están en local en /workspace/hotclick-reportes/traspaso/auditor-6-chatbots-y-copilot/ y hay que subirlas junto con esto.
- Misma fila: el informe está en /workspace/hotclick-reportes/auditoria/auditor6-chatbots-copilot-fb9ef78e.md, en la box y no en el repo. Conviene enlazar la copia en docs/traspaso/evidencia/auditor-6-chatbots-y-copilot/.
- Estado del área 6 (línea 211): mi auditoría es sobre fb9ef78e, anterior a #327 y #328. No verifiqué si esas cuotas cierran el ALTO-1 (el chat público sin cuota) ni el ALTO-2 (el 500 fuera del circuit breaker). Hay que marcarlos como "por verificar", no como resueltos.

### (b) Lo que le falta a mi reemplazo
- Archivos clave: ShoppingAssistantService.java (líneas 37-39 y 120-134 en fb9ef78e), RateLimitingFilter.java:128 y el endpoint /api/public/shopping-assistant/chat.
- Variables, solo por nombre: las del proveedor de IA (Anthropic, Gemini o NVIDIA) y las de Voyage para RAG. La línea 48 dice que son inferidas; mi auditoría vio llamadas a Claude (Anthropic) en el chat público.
- Trampas: el clon compartido en /workspace tenía cambios sin commitear, así que usá un git worktree aparte (el mío está en /workspace/a6-fb9 y se puede borrar). El 500 de prod lo investiga Bugs; no hay que duplicarlo ni martillar prod.
- Fuera de mi alcance: Telegram y n8n (Auditor 8), la búsqueda por imagen y security-tools/guardrails, que puede no estar conectado a producción.

### (c) Mejoras
- Re-auditar el área 6 sobre el hash que incluya #327 y #328, enfocado en ALTO-1, ALTO-2 y los 3 MEDIO (memoria de visitante sin aislar por tienda, historial y borrado públicos solo con el UUID, inyección indirecta).
- Que el QA del área 6 incluya una prueba de carga de costo con muchas IPs y un test de integración que fuerce un error de base de datos y espere 200.
