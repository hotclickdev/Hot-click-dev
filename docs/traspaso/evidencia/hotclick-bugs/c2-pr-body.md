## Telegram C2: saneo de logs (hallazgos bajos de Seguridad)

- `getMessage()` de errores de Telegram pasa por `TelegramTexto.sinToken` en TelegramInventarioScheduler, AltaEmprendedorNotificador, ModeracionAdminAvisoService, VentaAvisoService y EncargoService.
- `sinToken` cubre `%3A` (case-insensitive) y tokens sin prefijo `bot` (`\d{6,}:[A-Za-z0-9_-]{30,}`).
- Asistente paso 8 (tokens): se loguea solo la clase de la excepción.
- `esErrorDeDatos`: cadena de más de 16 causas falla cerrado; detecta `SQLException` cruda.

Tests: nuevo `TelegramC2SaneoTest` (5) + TelegramTokenFugaTest, ShoppingAssistantChatContingenciaTest y TelegramServiceTest en verde. Solo tokens ficticios.
