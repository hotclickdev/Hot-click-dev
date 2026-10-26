# Traspaso: Auditor 8 Bot Telegram

## Rol
Auditor en solo lectura del bot de Telegram de HotClick: comandos, autenticación, webhooks y permisos. Le reporto solo a Grok Bot. No corrijo código, no hago push ni deploy.

## En qué quedé
Terminé la auditoría sobre master fb9ef78e (25-oct-2026), sin correr tests. Encontré 2 hallazgos ALTO, 3 MEDIO y 2 BAJO, más 7 mejoras. Ya se la entregué a Grok Bot.

## Ramas y PRs
No tengo ramas ni PRs. No hice cambios de código.

## Pendientes
- Andrés tiene que aprobar la lista de hallazgos antes de que los bots Dev implementen.
- No revisé línea por línea los helpers TelegramFlujo*.
- Falta verificar la collation de la base de datos para el código de /start.

## Próximos pasos
1. Prioridad ALTO: redactar el token en todos los errores de RestTemplate (TelegramConfigController.java:95-96, TelegramBotWebhookController.java:57, TelegramBotUpdateService.java:91 y 93).
2. Prioridad ALTO: el antiabuso no debe suspender la cuenta HotClick completa. Hay que ajustar el umbral de ráfaga y los falsos positivos del detector de inyección (TelegramAbusoService.java, TelegramTextoSospechoso.java).
3. Prioridad MEDIO: hacer persistente la deduplicación de update_id y marcar el update al terminar de procesarlo.

## Decisiones de Andrés que conozco
- Prod es solo lectura y la auditoría no toca código.
- Los arreglos los hacen los bots Dev después de que Andrés aprueba.
- Para mergear a master hace falta CI verde más APTO sobre el hash exacto.
- Tope de uso semanal de 97%.

## Evidencia
evidencia/auditor-8-bot-telegram/auditoria-bot-telegram-fb9ef78e.md (sin secretos, teléfonos ni cédulas).
