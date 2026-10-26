# Auditoría Bot de Telegram (clientes): HotClick, master fb9ef78e

Modo: solo lectura (git worktree en `/workspace/aud8-tg`, commit `fb9ef78e`). No hubo requests a prod ni a la API de Telegram, y no se corrieron tests.
Rutas relativas a `Hot_click_outlet/src/main/java/com/hotclick/`.

Lo que está bien (verificado): el secret del webhook se compara en tiempo constante y se rechaza si está vacío (`service/TelegramClienteBotService.java:83-87`). Solo se aceptan chats privados (`service/telegram/TelegramMessageHandler.java:27`). Hay rate limit por segundo, minuto y día (`TelegramRateLimitService.java:19-37`). La membresía se revalida en cada consulta (`TelegramEmpresaContextService.java:67-90`) y la selección de una empresa ajena se rechaza (`:52`). El código de vinculación usa SecureRandom, tiene 8 caracteres y vence a los 10 minutos (`TelegramConfigService.java:26-30`). `setWebhook` envía `secret_token` y `allowed_updates` (`TelegramClienteBotService.java:203-210`). No hay secretos hardcodeados: todo sale de variables de entorno (`application.properties:306-320`). Casi todos los logs del cliente pasan por `TelegramTexto.sinToken`.

## CORRECCIONES

### C1 · ALTO · El token del bot puede filtrarse en logs, en la respuesta HTTP y en el canal interno de alertas
- **Archivos:** `controller/TelegramConfigController.java:95-96`, `controller/TelegramBotWebhookController.java:57`, `service/TelegramBotUpdateService.java:91,93`
- **Riesgo:** las excepciones de RestTemplate traen la URL completa `https://api.telegram.org/bot<token>/...`; el propio `TelegramTexto.java:12-13` lo documenta. En estas líneas `e.getMessage()` se usa sin `sinToken`. En `:96` va en el body de la respuesta, en `:57` va al log junto con el stacktrace (que repite el mensaje) y en `:93` se manda al chat interno de alertas (`TelegramAbusoService.java:65` envía `resumen` sin sanitizar).
- **Reproducir:** en local, con un token de prueba y sin red (o apuntando a un host que no resuelve), llamar `POST /api/telegram/admin/webhook` como admin. La respuesta 502 trae `error` con la URL que contiene el token. Para `:91/:93`, forzar un fallo de `bot.enviarMensaje` dentro de `responderConIa`.
- **Corrección:** envolver todos esos mensajes con `TelegramTexto.sinToken(...)`. En `:96`, devolver un mensaje genérico ("setWebhook falló, ver logs"). En `:57`, loguear `e.getClass()` más el mensaje sanitizado y no pasar `e` crudo (o sanitizar con un `MessageConverter`/`TurboFilter` global de logback). Sanitizar también en `TelegramAbusoService.avisarErrorDeUsuario`.
- **Garantía:** un test unitario de `TelegramConfigController` con un mock de `configurarWebhook` que lance `ResourceAccessException("I/O error on POST request for \"https://api.telegram.org/bot123:ABC/setWebhook\"")` y verifique que el body no contiene `123:ABC`. Un test equivalente con `ListAppender` sobre los logs de webhook y de UpdateService, y otro que verifique que `telegramService.enviar` no recibe el token.

### C2 · ALTO · El antiabuso suspende la cuenta del usuario un año por falsos positivos (ráfaga de botones o texto "sospechoso")
- **Archivos:** `service/telegram/TelegramRateLimitService.java:20-22`, `TelegramAbusoService.java:76-103`, `TelegramTextoSospechoso.java:11-16`
- **Riesgo:** más de 3 updates en 1 segundo (por ejemplo, tocar rápido los botones, porque los callbacks también cuentan, `TelegramCallbackHandler.java:36`) pausa el chat. Una segunda vez en 24 h pone `usuario.estado = SUSPENDIDO` y `bloqueadoHasta = +365 días` (`:97-99`). Eso bloquea la cuenta entera de HotClick, no solo el bot. El detector de inyección marca textos legítimos que contienen `' or ` o `" or ` (por ejemplo, un nombre de producto citado en inglés) y aplica la misma escalada. Es una denegación de servicio autoinfligida contra clientes que pagan.
- **Reproducir:** en un test de integración, enviar 4 callbacks `inv` en menos de 1 s al mismo chat, esperar más de 30 s (ventana de `abuso-aviso`) y repetir. El usuario queda con `estado=SUSPENDIDO`. Lo mismo pasa con dos textos `Camisa "Rock" or "Pop"` separados por más de 30 s.
- **Corrección:** (a) no suspender la cuenta global desde el bot: como máximo pausar o revocar la vinculación de Telegram y alertar a un admin; (b) excluir los callbacks del umbral por segundo o subirlo (por ejemplo, 10/s) y contar solo los mensajes de texto; (c) dejar `TelegramTextoSospechoso` solo para rechazar el mensaje, sin escalar, porque las consultas ya son parametrizadas según su propia documentación.
- **Garantía:** un test con 2 ráfagas de callbacks y 2 textos marcados que verifique que `usuario.estado` sigue ACTIVO y `bloqueadoHasta` sigue en null. Otro test que verifique que la vinculación queda pausada o revocada y que se genera la alerta.

### C3 · MEDIO · La deduplicación de updates es solo en memoria y marca el update antes de procesarlo
- **Archivos:** `service/telegram/TelegramUpdateDedup.java:14-26`, `TelegramUpdateRouter.java:23`
- **Riesgo:** al reiniciar o redeployar (o con más de una réplica) se pierde el set de vistos. Telegram reintenta los updates que no recibieron 200 (por ejemplo, por timeout durante el deploy), lo que puede confirmar una venta o un ajuste de stock dos veces; el propio comentario de `:8-9` lo advierte. La purga solo corre con más de 2000 entradas, así que es correcta pero frágil.
- **Reproducir:** con un test que construya dos instancias de `TelegramUpdateDedup` (lo que simula un reinicio), `esNuevo(42)` devuelve true en ambas.
- **Corrección:** persistir el `update_id` (una tabla con PK única, o reusar el `RateLimiter` en BD con la clave `tg:upd:<id>` y un TTL de 24 h) dentro de la misma transacción del procesamiento. Además, que las acciones mutantes (confirmar venta o acción IA) sean idempotentes por id de borrador.
- **Garantía:** un test de integración que envíe el mismo update de "confirmar venta" dos veces con un reinicio del contexto, o con dedup limpio, y verifique que existe 1 sola venta.

### C4 · MEDIO · `revocarMiembro` revoca la vinculación global del usuario, también para las otras empresas
- **Archivos:** `service/telegram/TelegramConfigService.java:88-97` (revocarMiembro) y `:112-119` (revocar)
- **Riesgo:** el propietario o admin de la empresa A puede cortar el Telegram de un usuario que también es miembro o propietario de la empresa B, porque la vinculación es única por usuario. Es un efecto cruzado entre tenants.
- **Reproducir:** con un usuario U miembro de A y propietario de B, vinculado a Telegram, el propietario de A llama `DELETE /api/telegram/equipo/{U}`. La vinculación de U queda REVOCADA y U pierde el acceso a B desde el bot.
- **Corrección:** si U tiene otras membresías activas, solo limpiar `empresaActivaId` cuando sea A y bloquear A para ese chat (una lista de empresas excluidas, o depender de que A desactive la membresía). Revocar completo solo cuando A es su única empresa.
- **Garantía:** un test con un usuario en 2 empresas: después de la revocación desde A, `vinculacionActiva(chat)` sigue presente y `seleccionarEmpresa(A)` es rechazada.

### C5 · MEDIO · Se puede registrar el webhook sin secret y el bot queda muerto en silencio
- **Archivos:** `service/TelegramClienteBotService.java:203-210`, `controller/TelegramConfigController.java:82-90`
- **Riesgo:** si `TELEGRAM_CLIENT_WEBHOOK_SECRET` está vacío, igual se llama `setWebhook` con `secret_token=""`. Después `validarSecret` rechaza todo (`:84`) y cada update cuenta como "secreto inválido", hasta bloquear por IP a quien llama (`TelegramAbusoService.java:68-74`). Si la IP resuelta fuera la de Telegram o la del proxy, se bloquearía el canal entero.
- **Reproducir:** en local, con el token definido y el secret vacío, `POST /api/telegram/admin/webhook` responde 200. Después todo `POST /api/webhooks/telegram` responde 403.
- **Corrección:** en `registrarWebhook`, devolver 503 si el secret está vacío, y validar en el arranque (un `@PostConstruct` que loguee un error si hay token sin secret). Exigir un secret con el charset de Telegram (`A-Za-z0-9_-`, 1-256).
- **Garantía:** un test unitario donde un secret vacío lleve a 503 sin invocar `post("setWebhook")`.

### C6 · BAJO · Transacción larga y candados sin límite en el router
- **Archivos:** `service/TelegramBotUpdateService.java:47-50`, `service/telegram/TelegramUpdateRouter.java:19,29`
- **Riesgo:** todo el update corre dentro de una transacción `@Transactional` que incluye llamadas HTTP síncronas a Telegram (con timeouts de 5+10 s). Eso retiene conexiones del pool y puede provocar timeouts del webhook, lo que dispara reintentos de Telegram (ver C3). El mapa `candados` crece con cada `chatId` y nunca se purga.
- **Reproducir:** revisando el código: `candados.computeIfAbsent` no tiene ningún `remove`. Las llamadas `bot.enviarMensaje` ocurren dentro del método transaccional.
- **Corrección:** sacar los envíos a Telegram fuera de la transacción (por ejemplo, encolarlos y enviarlos `afterCommit`). Usar locks con stripes (`Striped<Lock>` o un arreglo fijo de 256 objetos indexado por hash del chatId).
- **Garantía:** un test unitario que confirme que el tamaño de la estructura de locks es constante después de 10k chats distintos. Revisión de que no hay `RestTemplate` dentro de `@Transactional`.

### C7 · BAJO · El código `/start` distingue mayúsculas
- **Archivos:** `service/telegram/TelegramVinculacionService.java:37-43`, `TelegramConfigService.java:26`
- **Riesgo:** los códigos se generan en mayúsculas y `vincular` no normaliza. Un usuario que escribe el código a mano en minúsculas recibe "no existe o venció".
- **Reproducir:** con el código `ABCD2345`, enviar `/start abcd2345`: falla, si la columna tiene collation case-sensitive. No verifiqué la collation de la BD.
- **Corrección:** `codigo.toUpperCase(Locale.ROOT)` antes de `findByCodigo`.
- **Garantía:** un test de integración `vinculacion_codigoMinusculas_ok`.

## MEJORAS

| # | Mejora | Impacto | Esfuerzo | Archivos | Cambio propuesto |
|---|---|---|---|---|---|
| M1 | Tests de seguridad que faltan | Alto | Bajo | `src/test/.../integration/TelegramBotIntegrationTest.java` | Agregar: update_id duplicado procesado una sola vez; ráfaga sin suspender cuenta (C2); bloqueo de IP tras 5 secrets inválidos; chat de grupo ignorado; texto mayor a 1000 caracteres truncado; callback de más de 64 caracteres ignorado; logs y respuestas sin token (C1). Hoy no hay tests de `TelegramUpdateDedup`, `TelegramAbusoService` ni `TelegramRateLimitService` (verificado con `rg`). |
| M2 | Sanitización global del token en logs | Alto | Bajo | `logback-spring.xml`, `TelegramTexto.java` | Agregar un converter o `PatternLayout` con un replace regex `bot\d+:[A-Za-z0-9_-]+` → `bot***`, como defensa en profundidad frente a futuros `e.getMessage()`. |
| M3 | Mensaje de pausa legible | Bajo | Bajo | `TelegramAbusoService.java:43-44` | Formatear `pausadoHasta` como `HH:mm` (hora CR) en vez del `LocalDateTime.toString()` crudo (`2026-10-25T20:31:12.123`). |
| M4 | Rotación del secret del webhook | Medio | Medio | `TelegramClienteBotService.java`, `TelegramConfigController.java` | Aceptar `secret` y `secret_anterior` durante la ventana de rotación, para cambiar el secret sin cortar el servicio. |
| M5 | Métricas del bot | Medio | Bajo | `TelegramUpdateRouter.java`, `TelegramAbusoService.java` | Contadores Micrometer: updates procesados, duplicados, rechazados por secret, rate limit y pausas. Facilita detectar falsos positivos (C2). |
| M6 | Purga periódica de la deduplicación | Bajo | Bajo | `TelegramUpdateDedup.java` | Si se mantiene en memoria (antes de C3), purgar con `@Scheduled` y no solo con más de 2000 entradas. |
| M7 | Auditoría de acciones mutantes desde Telegram | Medio | Medio | `TelegramFlujoAccionHandler.java`, flujos de venta y stock | Registrar en la bitácora (usuario, empresa, acción, update_id) cada venta, ajuste de stock o cambio de estado confirmado desde el bot. |

Conteo: ALTO 2 · MEDIO 3 · BAJO 2 · Mejoras 7.
Limitaciones: no revisé línea por línea los helpers de flujo de venta y producto (`TelegramFlujo*`). Su aislamiento por tenant está cubierto por tests existentes (`callback_empresaAjena_denegada`, `accion_confirmar_tenantAjeno_rechazada`), pero no corrí esos tests.
