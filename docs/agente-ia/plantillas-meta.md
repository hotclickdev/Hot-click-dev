# Plantillas de WhatsApp para aprobar en Meta (AG-06)

Plantillas de categoría **UTILITY** que usa el sistema para avisar a un cliente fuera de la ventana de 24 h
desde su último mensaje. Se crean en Meta Business Manager, WhatsApp Manager, Plantillas de mensajes.

- Categoría: `UTILITY` (no Marketing).
- Idioma: `es` (español). Meta no ofrece un código es_CR; `es` sirve para Costa Rica.
- Tipo de variables: números `{{1}}`, `{{2}}`... Ejemplos de muestra: usar valores ficticios.
- El texto debe copiarse **idéntico**: el código (`PlantillaMeta.java`) envía el nombre técnico y los parámetros en ese orden.
- No cambiar el nombre técnico una vez aprobado. Para modificar el texto, crear una versión `_v2` y actualizar el catálogo.

| # | Nombre técnico | Cuándo se envía | Variables |
|---|----------------|-----------------|-----------|
| 1 | `hotclick_pago_confirmado_v1` | Pago confirmado del pedido | 1 nombre, 2 número de pedido, 3 total en colones |
| 2 | `hotclick_guia_asignada_v1` | Se asignó la guía de envío | 1 nombre, 2 número de pedido, 3 courier, 4 número de guía |
| 3 | `hotclick_pedido_entregado_v1` | Pedido entregado | 1 nombre, 2 número de pedido |
| 4 | `hotclick_compra_pendiente_v1` | Recordatorio de compra pendiente (AG-12) | 1 nombre, 2 productos |
| 5 | `hotclick_traspaso_asesor_v1` | Aviso de que un asesor responderá (traspaso) | 1 nombre |

## Textos

**1. hotclick_pago_confirmado_v1**
```
Hola {{1}}, recibimos tu pago del pedido {{2}} por ₡{{3}}. Estamos preparando tu pedido y te avisaremos cuando salga. Gracias por comprar en HOTCLICK.
```
Muestra: Ana, HC-1001, 12.500

**2. hotclick_guia_asignada_v1**
```
Hola {{1}}, tu pedido {{2}} ya fue enviado con {{3}}. Tu número de guía es {{4}}. Gracias por comprar en HOTCLICK.
```
Muestra: Ana, HC-1001, Correos CR, ABC123

**3. hotclick_pedido_entregado_v1**
```
Hola {{1}}, tu pedido {{2}} figura como entregado. Si algo no llegó bien, respondé a este mensaje y te ayudamos. Gracias por comprar en HOTCLICK.
```
Muestra: Ana, HC-1001

**4. hotclick_compra_pendiente_v1**
```
Hola {{1}}, tenés pendiente la compra de {{2}} en HOTCLICK. Si querés terminarla o tenés dudas, respondé a este mensaje.
```
Muestra: Ana, audífonos

**5. hotclick_traspaso_asesor_v1**
```
Hola {{1}}, recibimos tu consulta. Un asesor de HOTCLICK te responderá lo antes posible en este mismo chat.
```
Muestra: Ana

## Regla de envío en el código

1. Si el contacto escribió en las últimas 24 h (`VentanaServicioWhatsApp.dentroDeVentana(telefono)`), se manda texto libre.
2. Si no, se manda la plantilla del escenario (tabla de arriba).
3. Por ahora la ventana siempre devuelve `false` (siempre plantilla). AG-05 (tabla de conversaciones) registrará la implementación real como bean y el remitente la tomará solo.
4. Sin credenciales de Meta el sistema trabaja en modo SIMULADO (se registra, no se envía).
5. La plantilla usada queda en `hot_click_wa_log_tb.variante`.

## Modo de fallo

- Plantilla no aprobada o pausada por Meta: el envío falla, el registro queda en `ERROR` y no hay reintento automático (evita duplicar avisos).
- Meta caído o lento: timeouts de 5 s (conexión) y 10 s (lectura); el registro queda en `ERROR`.
- Claude caído (solo mensajes del CRM dentro de ventana): se usa el texto fijo de respaldo.

## Configuración

| Variable | Uso | Por defecto |
|----------|-----|-------------|
| `WHATSAPP_GRAPH_VERSION` | Versión del Graph API de Meta. Meta retira versiones viejas: revisar cada 6 meses | `v19.0` |
| `WHATSAPP_IA_MODELO` | Modelo de Claude que personaliza mensajes del CRM dentro de ventana | `claude-haiku-5-5` |

## Escenarios sin plantilla de utilidad (pendiente)

Reactivación de clientes (es marketing, requiere otra categoría), aviso de nuevo pedido al emprendedor, aviso al admin y aviso de cambio de cuenta de cobro. Se siguen enviando como texto libre y Meta los rechaza fuera de la ventana de 24 h.
