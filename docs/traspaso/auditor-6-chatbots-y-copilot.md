# Traspaso: Auditor 6 Chatbots y Copilot

- Rol: auditor solo lectura de los chatbots de producto y el copilot de HotClick (relevancia, prompt injection, costos, fuga de datos). Reporta solo a Grok Bot.
- En qué quedé: auditoría completa sobre master fb9ef78e (25-oct). 2 ALTO, 3 MEDIO, 3 BAJO y 8 mejoras.
- Ramas y PRs: ninguno. Mi rol prohíbe tocar código, hacer push y abrir PRs.
- Pendientes: que Andrés apruebe la lista y los bots Dev implementen. Fuera de alcance quedaron Telegram/n8n (Auditor 8), la búsqueda por imagen y security-tools/guardrails.
- Próximos pasos: Dev corrige ALTO-1 (cuota y topes del chat público) y ALTO-2 (contingencia 200 fuera del circuit breaker). Después, re-auditar sobre el hash del arreglo.
- Decisiones de Andrés que conozco: solo lectura, cero cambios en prod, informes en dos listas (CORRECCIONES y MEJORAS), tope de uso semanal de 97%, Bugs investiga el 500 del asistente público.
- Evidencia: evidencia/auditor6-chatbots-copilot-fb9ef78e.md (sin secretos ni datos personales).
