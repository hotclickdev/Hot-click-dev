# Bot de Telegram para clientes (Emprendedor / PyME / Negocio Plus)

Bot con el que cada dueño de negocio (y su equipo) consulta inventario, ventas y
finanzas, recibe avisos automáticos de venta y alertas de stock, y confirma su
inventario una vez por semana — todo desde Telegram, sin depender de soporte.

> Es un bot DISTINTO al de alertas internas (`TELEGRAM_BOT_TOKEN`). Este usa las
> variables `TELEGRAM_CLIENT_*`.

## Setup único (una sola vez, ~5 minutos)

### 1. Crear el bot en BotFather

1. En Telegram, abrí [@BotFather](https://t.me/BotFather).
2. Mandá `/newbot`.
3. Nombre visible: `HotClick` (o el que prefieras).
4. Username: algo tipo `HotClickCRBot` (debe terminar en `bot` y estar libre).
5. BotFather te da el **token** (formato `1234567:AAF...`). Guardalo.
6. Opcional: `/setuserpic` para el logo, `/setdescription` para la descripción.

### 2. Configurar variables en el servidor

```bash
ssh -i "C:\Users\pmdan\Downloads\hotclick-key.pem" ec2-user@18.227.68.15
nano /home/ec2-user/app/.env
```

Agregar (el secret se genera con `openssl rand -hex 32`):

```bash
TELEGRAM_CLIENT_BOT_TOKEN=1234567:AAF...        # token de BotFather
TELEGRAM_CLIENT_BOT_USERNAME=HotClickCRBot      # username SIN @
TELEGRAM_CLIENT_WEBHOOK_SECRET=<hex aleatorio>  # openssl rand -hex 32
```

```bash
docker restart hotclick
```

### 3. Registrar el webhook en Telegram

Con tu sesión de ADMIN en el panel (una sola vez):

```bash
curl -X POST https://hotclick.lat/api/telegram/admin/webhook \
  -H "Authorization: Bearer <JWT de admin>"
```

Esto llama a `setWebhook` de Telegram apuntando a
`https://hotclick.lat/api/webhooks/telegram` con el secret configurado.
Listo — desde ahí todo es autoservicio de los clientes.

## Cómo lo usa un cliente (autoservicio)

1. Panel → **Configuración → Telegram** → botón **Conectar Telegram**.
2. Escanea el QR o toca "Abrir en Telegram" (código de un solo uso, vence en 10 min).
3. En el chat toca **Iniciar** — queda vinculado.

Desde ese momento:

| Función | Cómo |
|---------|------|
| Menú de consultas | `/menu` → botones Inventario / Ventas de hoy / Finanzas del mes |
| Pregunta libre (IA) | Escribir cualquier cosa — usa los créditos de IA del plan |
| Cambiar de negocio (multi-empresa) | `/empresa` o botón "Cambiar negocio" |
| Chequeo semanal | Llega solo los lunes 9:00 AM; responde con botones o cantidades |
| Desvincular | `/desvincular`, o desde el panel |
| Avisos automáticos | Venta online, venta POS, stock bajo, producto agotado |

El equipo: cada empleado con usuario en el panel vincula SU propio Telegram
desde su sesión. El propietario ve la lista en Configuración → Telegram y puede
revocar a cualquiera.

## Seguridad implementada

- **Webhook autenticado**: cada update debe traer el header
  `X-Telegram-Bot-Api-Secret-Token` correcto (comparación en tiempo constante);
  sin match → 403 sin parsear el update.
- **Códigos de un solo uso**: 8 caracteres aleatorios (SecureRandom), vencen a
  los 10 minutos, se anulan al usarse. Un chat de Telegram solo puede estar
  vinculado a una cuenta del panel.
- **Aislamiento multi-tenant**: toda consulta valida que el usuario siga siendo
  miembro ACTIVO de la empresa activa (`hot_click_miembro_empresa_tb`).
  Desactivar un miembro corta su acceso por Telegram al instante.
- **Solo texto y botones**: fotos, documentos, audios, stickers y video se
  rechazan; grupos y canales se ignoran (solo chat privado).
- **SQL**: todas las consultas parametrizadas; la IA no ejecuta SQL, solo recibe
  datos ya agregados del negocio.
- **Rate limit por chat** (tabla `hot_click_rate_limit_tb`): 20 mensajes/minuto
  y 300/día; además la IA respeta la cuota mensual del plan (`AiQuotaService`).
- **Ajustes de stock**: solo roles PROPIETARIO/ADMIN de la empresa; cada ajuste
  queda auditado en `hot_click_movimiento_stock_tb` (AJUSTE_ENTRADA/SALIDA,
  referencia `telegram-chequeo`, correo del operador).

## Arquitectura

| Pieza | Archivo |
|-------|---------|
| Webhook entrante | `controller/TelegramBotWebhookController.java` |
| Lógica del bot | `service/TelegramBotUpdateService.java` |
| Cliente HTTP saliente | `service/TelegramClienteBotService.java` |
| Endpoints del panel | `controller/TelegramConfigController.java` |
| Notificaciones (venta/stock) | `service/TelegramNotificacionClienteService.java` |
| Chequeo semanal (ShedLock) | `scheduler/TelegramInventarioScheduler.java` |
| IA síncrona | `AiCopilotService.chatSync()` |
| Ajuste de stock | `StockService.ajustarAExistencia()` |
| Vinculaciones | `hot_click_telegram_vinculacion_tb` (migración V97) |
| UI | `AdminConfiguracion.jsx` sección Telegram + `services/telegramService.js` |

## Pruebas

`TelegramBotIntegrationTest` (17 casos) simula los updates reales de Telegram
contra el webhook con el envío mockeado — no requiere token ni teléfono:

```bash
.\maven\bin\mvn test -Dtest=TelegramBotIntegrationTest
```

## Ideas para fases siguientes

- Resumen del día al cierre (opt-in por chat)
- Aviso de carrito abandonado y de pago fallido
- Crear producto desde el chat (foto + precio)
- Registrar gastos o ventas manuales por mensaje
- Recordatorio de pedidos sin gestionar hace 24h
- Bot con marca propia por negocio (token del cliente, plan Negocio Plus)
