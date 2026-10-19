# QA: pendientes (resumen redactado)

Fuentes, en la máquina compartida de los agentes: `/workspace/qa/sprint1/CIERRE-S1.md` (QA calidad), `/workspace/qa/sprint1/compradores-S1.md` (QA Compradores), `/workspace/qa/sprint1-negocios.md`, `sprint2-negocios.md` y `sprint3-6-negocios.md` (QA Negocios), y `/workspace/qa/regresion/cierre-S1.md`, `PENDIENTES-PAUSA.md` y `triage-s1-s6.md` (QA Automatización).
**Es un resumen, no una copia.** Los originales tienen correos de cuentas QA-TEST, números de pedido y datos de prueba que no se suben a un repo público. Hay un log de reverificación con tokens que nunca se abre.

Regla: QA prueba **solo desde la web**, como un usuario normal: sin código, sin base de datos, sin servidor y sin llamar a la API.

## Estado
- **QA (calidad), cierre S1 (16-oct):** veredicto «No listo» para cerrar S1 o abrir la beta. Varios de sus motivos ya se arreglaron en producción el 16-oct (#150, #151, #154, #159 y #161); falta volver a probarlos (QA-COM-002, 003, 006 y 007).
- **QA Automatización:** pausada el 17-oct a las 2:14 am CR por presupuesto. El smoke nocturno del 16-oct dio 7/7 OK. Las rutinas del smoke nocturno y de la revisión de las 6:00 están pausadas; al retomar hay que reanudarlas y avisarle a QA (calidad).
- `staging.hotclick.lat` **no existe**. Todo lo que depende de staging o del sandbox de ONVO queda bloqueado por «staging efímero del CI de DevOps CI/CD + llaves sandbox de ONVO».

## Pendientes
| Ítem | Qué falta | Bloqueo |
| --- | --- | --- |
| Retest QA-COM-002/003/006/007 | Volver a probar los arreglos ya desplegados | Ninguno (hacerlo en prod como usuario) |
| QA-CAL-007 recorrido beta | Compra contra entrega y avance del pedido | Contra entrega por negocio (#211 y #171) |
| QA-CAL-008 regresión post-deploy | Repartir entre los 4 bots de QA | Deploy de la cola |
| SINPE pedido de prueba + stock | Aprobar o rechazar SINPE | **OK explícito del dueño para pagos** |
| NP-18 | Botones de estado en el panel del vendedor | Fix del Desarrollador y retest |
| QA-COM-016/018/019 | Tope de pedidos y registro con reenvío de código | Memoria del box (Chrome se cae por OOM) |
| QA-COM-011 | Personalización en el pedido | Deploy correspondiente |
| NEG-004/014/025/030 | Verificar correo, notificaciones por Telegram, mapa | Acceso a la casilla, una persona con Telegram, Google API key |
| NEG-013 | Producto en modo cotización desde el wizard Emprendedor | Bug a revisar |
| NEG-014 a 034 | Corrida P1/P2 completa | Memoria del box |
| NEG-036/037 | Variantes y servicios | Deploy |
| QA-NEG-042/044 | Frecuencia de liquidación | Deploy de #197 + #213 |
| QA-NEG-043, 046, 049, 050, 052–054, 057, 059, 060, 063, 064, 067, 069 | Flujos de ONVO | Staging efímero + sandbox ONVO (057 y 069 además necesitan OK del dueño) |
| QA-NEG-045/047/051/055/058/062 | Pedido pagado, personal LECTOR/EDITOR/cajero, Pyme pago | Sandbox ONVO |
| **QA-NEG-056** | Un negocio no aprobado puede usar la caja (POS) y ve el QR SINPE | **El backend debe bloquear el POS de negocios no aprobados; ocultar el QR SINPE de caja** (decisión del dueño: SINPE solo en ONVO) |
| **QA-NEG-062** | `/emprendedor/facturacion` se ve en blanco | Debe dar 403 claro |
| QA-NEG-066/071/072 | Acuerdo de vendedores publicado, negocio activo en ONVO, recorrido con teclado | Legal, ONVO, otro turno |
| QA-AUT (42 bloqueados) | Esqueletos `test.fixme` listos; completar selectores y correr | Staging + sandbox ONVO + cuenta admin QA-TEST. Cambiar el motivo del bloqueo a «staging efímero del CI + llaves sandbox ONVO» y coordinar con DevOps CI/CD para correrlos en su pipeline |
| QA-AUT-027/063 | Matriz y manual (documentación) | Ninguno |
| S2 de Automatización | Sin arrancar; sus 4 ejecutables están en `triage-s1-s6.md` | Presupuesto |
| Límite de intentos por IP | Retest después del fix | Deploy + revisión de nginx |

## Datos de prueba en producción
Hay negocios, productos, pedidos y cuentas QA-TEST creados en producción (la lista está en los originales). **No se borró nada.** Borrarlos necesita OK del dueño.
