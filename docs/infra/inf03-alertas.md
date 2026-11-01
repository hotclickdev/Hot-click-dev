# INF-03 — Alertas (Sentry + Telegram): cómo activarlas

Todo viene **apagado por defecto**. El código ya está en master; solo falta cargar variables de entorno
en el servidor (nunca en el repo ni en chats). Sin ellas, la app arranca igual y no envía nada.

## Variables a cargar

| Variable | Para qué | Default en repo | Efecto si queda vacía |
|---|---|---|---|
| `SENTRY_DSN` | Errores y `log.error` a Sentry (PII redactada por `SentryRedaccionPii`) | vacío | Sentry deshabilitado |
| `SENTRY_ENVIRONMENT` | Etiqueta del entorno (opcional) | `production` | — |
| `TELEGRAM_BOT_TOKEN` | Token del bot de alertas internas que **ya existe** | vacío | Telegram no envía; log `warn` sin datos |
| `TELEGRAM_CHAT_ID` | Chat/canal donde llegan las alertas | vacío | Telegram no envía; log `warn` sin datos |
| `ONVO_WEBHOOK_401_UMBRAL` | Alerta si hay más de N 401 del webhook ONVO en la ventana | `0` (apagado) | sin alerta de secret inválido |
| `ONVO_WEBHOOK_401_VENTANA_MIN` | Ventana en minutos del conteo anterior (opcional) | `10` | — |
| `ONVO_PENDIENTE_MINUTOS` | Minutos para avisar pedidos ONVO pendientes (opcional) | `30` | — |

Referencias: `application.properties` (bloques SENTRY y TELEGRAM — Alertas operacionales, y `onvo.alertas.*`),
`TelegramService.enviar` (falla en silencio), `monitoreo/OnvoWebhookSecretInvalidoAlerta`, `monitoreo/OnvoPedidosPendientesJob`.

## Activar
1. Cargar `SENTRY_DSN`, `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` en el entorno del servicio.
2. Cargar `ONVO_WEBHOOK_401_UMBRAL=5` y `ONVO_WEBHOOK_401_VENTANA_MIN=10` (ver abajo).
3. Reiniciar el servicio. Para apagar, vaciar la variable y reiniciar.

## Valor aprobado para la alerta de 401 del webhook ONVO
Cargar en staging y producción: `ONVO_WEBHOOK_401_UMBRAL=5` y `ONVO_WEBHOOK_401_VENTANA_MIN=10`.
El default en código sigue en `0` (apagado); este valor se aplica solo vía variable de entorno.

Razón: con el secret bien configurado hay 0 de estos 401. Más de 5 en 10 minutos indica un secret mal
cargado (por ejemplo tras un deploy) o alguien probando el endpoint. La alerta salta con 6 o más dentro de
la ventana deslizante y no se repite hasta que pase una ventana completa.

## Pendientes
- **BAJO** — `security.alert.email` en `application.properties` tiene por defecto un correo real del proyecto.
  No es un secreto y se acepta por ahora, pero es el único destino de alertas que no queda vacío por defecto
  (se sobreescribe con `SECURITY_ALERT_EMAIL`).
