## fix(asistente): cuota diaria fail-closed del asistente de compras (Chatbots ALTO-1, opción B)

- Tope por tienda `asistente.cuota.por-tienda-dia=${ASISTENTE_CUOTA_TIENDA_DIA:300}` y tope global `asistente.cuota.global-dia=${ASISTENTE_CUOTA_GLOBAL_DIA:3000}`, chequeados antes del LLM en el chat y en la búsqueda por imagen.
- Contador estricto (UPDATE atómico); cualquier error niega. Si la cuota está agotada, responde con un mensaje degradado sin llamar a la IA.
- **No consume créditos IA del plan** (decisión de Andrés): se quitó `AiQuotaService.verificarYReservar`. Solo se siguen registrando los tokens para analytics (best-effort, como en master).
- Token de sesión ligado a la empresa (HMAC con clave derivada).
- Incluye el merge de origin/master; el conflicto en application.properties se resolvió conservando las dos propiedades.

Tests: `ShoppingAssistantCuotaTest`, `ShoppingAssistantChatContingenciaTest`, `ShoppingAssistantImageSearchHandlerTest`: 31/31. Sin deploy.
