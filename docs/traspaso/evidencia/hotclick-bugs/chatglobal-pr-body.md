## fix(chat-publico): tope global diario del modelo (Chatbots ALTO-1, opción B)

- `PublicChatController`: nuevo tope global `chat.publico.max-diario-global=${CHAT_PUBLICO_MAX_DIARIO_GLOBAL:5000}`. Se chequea antes del modelo, solo si pasó el tope por tienda (3000, sin cambios), así que una tienda sobre su tope no consume cupo global.
- Al superarlo responde con la misma degradación sin IA del tope por tienda (`conModelo=false`), sin cortar el chat.
- Fail-closed: `RateLimiter.tryAcquireEstricto` (nuevo) devuelve false ante error de BD. `tryAcquire` sigue fail-open, sin cambios.
- No consume créditos IA del plan.

Tests: `PublicChatControllerLimitesTest` (+2: tope global degrada sin modelo; tope de tienda no consume global), `RateLimiterEstrictoTest` (BD caída → niega), más `PublicChatControllerMarketplaceTest` y `PublicChatGlobalSinTiendaTest`: 11/11.

Deploy: definir `CHAT_PUBLICO_MAX_DIARIO_GLOBAL` si se quiere otro valor que 5000. Sin deploy en este PR.
