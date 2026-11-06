## Caso 3 fix 62b7c0e1 — sesión <sesion_test>, pedido 16 ORD-8179250FF028 — 2026-10-26 04:47:00 CR
### 1) GET /v1/checkout/sessions/<sesion_test> (llave onvo_test_)
{"id":"<sesion_test>","status":"open","paymentStatus":"paid","paymentIntentId":"cmvp4qf1r0tzkk125kvdpgawq","mode":"test"}
GET /v1/payment-intents/cmvp4qf1r0tzkk125kvdpgawq:
{"id":"cmvp4qf1r0tzkk125kvdpgawq","status":"succeeded","amount":500000,"currency":"CRC","mode":"test","metadata":{"pedidoId":"16","numeroPedido":"ORD-8179250FF028"}}
### 2) DB antes del webhook
 id_pedido |  numero_pedido   | estado_pedido | es_prueba | id_pago | estado_pago |          
-----------+------------------+---------------+-----------+---------+-------------+----------------------------------
        16 | ORD-8179250FF028 | PENDIENTE     | f         |      14 | PENDIENTE   | <sesion_test>
(1 row)

### 2b) Snapshot completo antes
 id_pedido |  numero_pedido   | estado_pedido | es_prueba | id_pago | estado_pago |          
-----------+------------------+---------------+-----------+---------+-------------+----------------------------------
        16 | ORD-8179250FF028 | PENDIENTE     | f         |      14 | PENDIENTE   | <sesion_test>
(1 row)

filas pago pedido16=1
webhook_event token=0 
mov_stock prod2 total=2 ref16=0 
billing_ledger total=0
producto2 stock_actual=6 reservado=4
mailpit total=23 ORD-8179250FF028=0
log lineas sesion=2
### 3) webhook checkout-session.succeeded (secreto correcto, id <evento>)
{"status":"ok","type":"checkout-session.succeeded"}
HTTP 200
DB después:
 id_pedido |  numero_pedido   | estado_pedido | es_prueba | id_pago | estado_pago |          
-----------+------------------+---------------+-----------+---------+-------------+----------------------------------
        16 | ORD-8179250FF028 | PAGADO        | t         |      14 | CAPTURADO   | <sesion_test>
(1 row)

filas pago pedido16=1
webhook_event token=1 3:checkout-session.succeeded:true
mov_stock prod2 total=2 ref16=0 
billing_ledger total=0
producto2 stock_actual=5 reservado=3
mailpit total=23 ORD-8179250FF028=0
log lineas sesion=4
### 4) MISMO webhook duplicado (mismo id de evento)
{"status":"duplicate","type":"checkout-session.succeeded"}
HTTP 200
DB después:
 id_pedido |  numero_pedido   | estado_pedido | es_prueba | id_pago | estado_pago |          
-----------+------------------+---------------+-----------+---------+-------------+----------------------------------
        16 | ORD-8179250FF028 | PAGADO        | t         |      14 | CAPTURADO   | <sesion_test>
(1 row)

filas pago pedido16=1
webhook_event token=1 3:checkout-session.succeeded:true
mov_stock prod2 total=2 ref16=0 
billing_ledger total=0
producto2 stock_actual=5 reservado=3
mailpit total=23 ORD-8179250FF028=0
log lineas sesion=5
### 6) GET /api/payments/status/ORD-8179250FF028 (endpoint que consulta /pago/exito cada 3 s, máx 60 intentos)
{"success":true,"message":"Estado del pago","data":{"pagoId":14,"estadoPago":"CAPTURADO","numeroPedido":"ORD-8179250FF028","metodoPago":"ONVO","cardLast4":null,"cardBrand":null,"fechaTransaccion":null,"total":5000,"proveedor":"ONVO"},"timestamp":"2026-10-26T04:47:34.<NUMERO_REDACTADO>"}
HTTP 200
### Log backend (líneas relevantes)
40:2026-10-26 04:44:25.134 DEBUG [-] org.hibernate.SQL - select e1_0.id_empresa,e1_0.actividad_economica,e1_0.ambiente_hacienda,e1_0.fk_id_bodega_venta_online,e1_0.categoria_negocio,e1_0.cedula_juridica,e1_0.cert_p12_path,e1_0.clave_hacienda_enc,e1_0.cobros_pa
42:Hibernate: select e1_0.id_empresa,e1_0.actividad_economica,e1_0.ambiente_hacienda,e1_0.fk_id_bodega_venta_online,e1_0.categoria_negocio,e1_0.cedula_juridica,e1_0.cert_p12_path,e1_0.clave_hacienda_enc,e1_0.cobros_pausados,e1_0.color_acento,e1_0.color_primari
44:2026-10-26 04:44:25.134 DEBUG [-] org.hibernate.SQL - select e1_0.id_empresa,e1_0.actividad_economica,e1_0.ambiente_hacienda,e1_0.fk_id_bodega_venta_online,e1_0.categoria_negocio,e1_0.cedula_juridica,e1_0.cert_p12_path,e1_0.clave_hacienda_enc,e1_0.cobros_pa
45:Hibernate: select e1_0.id_empresa,e1_0.actividad_economica,e1_0.ambiente_hacienda,e1_0.fk_id_bodega_venta_online,e1_0.categoria_negocio,e1_0.cedula_juridica,e1_0.cert_p12_path,e1_0.clave_hacienda_enc,e1_0.cobros_pausados,e1_0.color_acento,e1_0.color_primari
175:2026-10-26 04:44:25.303 DEBUG [-] org.hibernate.SQL - select u1_0.id_usuario from hot_click_usuario_tb u1_0 where u1_0.correo=? fetch first ? rows only
176:Hibernate: select u1_0.id_usuario from hot_click_usuario_tb u1_0 where u1_0.correo=? fetch first ? rows only
187:2026-10-26 04:44:25.339 DEBUG [-] org.hibernate.SQL - select e1_0.id_empresa,e1_0.actividad_economica,e1_0.ambiente_hacienda,e1_0.fk_id_bodega_venta_online,e1_0.categoria_negocio,e1_0.cedula_juridica,e1_0.cert_p12_path,e1_0.clave_hacienda_enc,e1_0.cobros_p
188:Hibernate: select e1_0.id_empresa,e1_0.actividad_economica,e1_0.ambiente_hacienda,e1_0.fk_id_bodega_venta_online,e1_0.categoria_negocio,e1_0.cedula_juridica,e1_0.cert_p12_path,e1_0.clave_hacienda_enc,e1_0.cobros_pausados,e1_0.color_acento,e1_0.color_primar
193:2026-10-26 04:44:25.348 DEBUG [-] org.hibernate.SQL - select e1_0.id_empresa,e1_0.actividad_economica,e1_0.ambiente_hacienda,e1_0.fk_id_bodega_venta_online,e1_0.categoria_negocio,e1_0.cedula_juridica,e1_0.cert_p12_path,e1_0.clave_hacienda_enc,e1_0.cobros_p
194:Hibernate: select e1_0.id_empresa,e1_0.actividad_economica,e1_0.ambiente_hacienda,e1_0.fk_id_bodega_venta_online,e1_0.categoria_negocio,e1_0.cedula_juridica,e1_0.cert_p12_path,e1_0.clave_hacienda_enc,e1_0.cobros_pausados,e1_0.color_acento,e1_0.color_primar
199:2026-10-26 04:44:25.355 DEBUG [-] org.hibernate.SQL - select e1_0.id_empresa,e1_0.actividad_economica,e1_0.ambiente_hacienda,e1_0.fk_id_bodega_venta_online,e1_0.categoria_negocio,e1_0.cedula_juridica,e1_0.cert_p12_path,e1_0.clave_hacienda_enc,e1_0.cobros_p
200:Hibernate: select e1_0.id_empresa,e1_0.actividad_economica,e1_0.ambiente_hacienda,e1_0.fk_id_bodega_venta_online,e1_0.categoria_negocio,e1_0.cedula_juridica,e1_0.cert_p12_path,e1_0.clave_hacienda_enc,e1_0.cobros_pausados,e1_0.color_acento,e1_0.color_primar
223:2026-10-26 04:44:25.928 DEBUG [-] org.hibernate.SQL - select i1_0.fk_id_pedido,i1_0.id_pedido_item,i1_0.cantidad,i1_0.costo_unitario_momento,i1_0.descuento_aplicado,i1_0.fk_id_estado,i1_0.precio_unitario_momento,i1_0.fk_id_producto,p2_0.id_producto,p2_0.fk
224:Hibernate: select i1_0.fk_id_pedido,i1_0.id_pedido_item,i1_0.cantidad,i1_0.costo_unitario_momento,i1_0.descuento_aplicado,i1_0.fk_id_estado,i1_0.precio_unitario_momento,i1_0.fk_id_producto,p2_0.id_producto,p2_0.fk_id_admin_cliente,p2_0.barcode,p2_0.fk_id_b
227:2026-10-26 04:44:25.956 DEBUG [-] org.hibernate.SQL - select p1_0.id_producto,p1_0.fk_id_admin_cliente,p1_0.barcode,p1_0.fk_id_bodega,b1_0.id_bodega,b1_0.acepta_efectivo,b1_0.fk_id_admin_cliente,b1_0.canton,b1_0.capacidad_maxima,b1_0.correo_contacto,b1_0.d
228:Hibernate: select p1_0.id_producto,p1_0.fk_id_admin_cliente,p1_0.barcode,p1_0.fk_id_bodega,b1_0.id_bodega,b1_0.acepta_efectivo,b1_0.fk_id_admin_cliente,b1_0.canton,b1_0.capacidad_maxima,b1_0.correo_contacto,b1_0.direccion_exacta,b1_0.distrito,b1_0.fk_id_em
246:2026-10-26 04:44:26.387 DEBUG [-] org.hibernate.SQL - select i1_0.fk_id_pedido,i1_0.id_pedido_item,i1_0.cantidad,i1_0.costo_unitario_momento,i1_0.descuento_aplicado,i1_0.fk_id_estado,i1_0.precio_unitario_momento,i1_0.fk_id_producto,p2_0.id_producto,p2_0.fk
247:Hibernate: select i1_0.fk_id_pedido,i1_0.id_pedido_item,i1_0.cantidad,i1_0.costo_unitario_momento,i1_0.descuento_aplicado,i1_0.fk_id_estado,i1_0.precio_unitario_momento,i1_0.fk_id_producto,p2_0.id_producto,p2_0.fk_id_admin_cliente,p2_0.barcode,p2_0.fk_id_b
250:2026-10-26 04:44:26.393 DEBUG [-] org.hibernate.SQL - select p1_0.id_producto,p1_0.fk_id_admin_cliente,p1_0.barcode,p1_0.fk_id_bodega,b1_0.id_bodega,b1_0.acepta_efectivo,b1_0.fk_id_admin_cliente,b1_0.canton,b1_0.capacidad_maxima,b1_0.correo_contacto,b1_0.d
251:Hibernate: select p1_0.id_producto,p1_0.fk_id_admin_cliente,p1_0.barcode,p1_0.fk_id_bodega,b1_0.id_bodega,b1_0.acepta_efectivo,b1_0.fk_id_admin_cliente,b1_0.canton,b1_0.capacidad_maxima,b1_0.correo_contacto,b1_0.direccion_exacta,b1_0.distrito,b1_0.fk_id_em
285:2026-10-26 04:44:27.848 DEBUG [76c49f4cb459] org.hibernate.SQL - select b1_0.id_bodega,b1_0.acepta_efectivo,b1_0.fk_id_admin_cliente,b1_0.canton,b1_0.capacidad_maxima,b1_0.correo_contacto,b1_0.direccion_exacta,b1_0.distrito,b1_0.fk_id_empresa,b1_0.encargad
286:Hibernate: select b1_0.id_bodega,b1_0.acepta_efectivo,b1_0.fk_id_admin_cliente,b1_0.canton,b1_0.capacidad_maxima,b1_0.correo_contacto,b1_0.direccion_exacta,b1_0.distrito,b1_0.fk_id_empresa,b1_0.encargado_nombre,b1_0.fk_id_estado,b1_0.fecha_creacion,b1_0.ho
291:2026-10-26 04:44:27.859 DEBUG [76c49f4cb459] org.hibernate.SQL - select e1_0.id_empresa,e1_0.actividad_economica,e1_0.ambiente_hacienda,e1_0.fk_id_bodega_venta_online,e1_0.categoria_negocio,e1_0.cedula_juridica,e1_0.cert_p12_path,e1_0.clave_hacienda_enc,e1
292:Hibernate: select e1_0.id_empresa,e1_0.actividad_economica,e1_0.ambiente_hacienda,e1_0.fk_id_bodega_venta_online,e1_0.categoria_negocio,e1_0.cedula_juridica,e1_0.cert_p12_path,e1_0.clave_hacienda_enc,e1_0.cobros_pausados,e1_0.color_acento,e1_0.color_primar
299:2026-10-26 04:44:28.195 INFO  [76c49f4cb459] com.hotclick.service.OnvoService - [onvo] Checkout session creada: <sesion_test>
300:2026-10-26 04:44:28.196 INFO  [76c49f4cb459] c.h.payment.OnvoPaymentProvider - [onvo] Checkout session creada: <sesion_test> pedido=ORD-8179250FF028
307:2026-10-26 04:44:28.208 INFO  [76c49f4cb459] com.hotclick.service.PaymentService - Checkout iniciado: provider=ONVO pedido=ORD-8179250FF028 paquetes=1 total=5000
315:2026-10-26 04:45:00.021 DEBUG [-] org.hibernate.SQL - select e1_0.id_empresa,e1_0.actividad_economica,e1_0.ambiente_hacienda,e1_0.fk_id_bodega_venta_online,e1_0.categoria_negocio,e1_0.cedula_juridica,e1_0.cert_p12_path,e1_0.clave_hacienda_enc,e1_0.cobros_p
316:Hibernate: select e1_0.id_empresa,e1_0.actividad_economica,e1_0.ambiente_hacienda,e1_0.fk_id_bodega_venta_online,e1_0.categoria_negocio,e1_0.cedula_juridica,e1_0.cert_p12_path,e1_0.clave_hacienda_enc,e1_0.cobros_pausados,e1_0.color_acento,e1_0.color_primar
317:2026-10-26 04:45:00.032 DEBUG [-] org.hibernate.SQL - select cf1_0.id_comprobante,cf1_0.ambiente,cf1_0.clave_numerica,cf1_0.fk_id_compra,cf1_0.fk_id_empresa,cf1_0.estado,cf1_0.fecha_emision,cf1_0.fecha_respuesta,cf1_0.intentos_envio,cf1_0.mensaje_hacienda,
318:Hibernate: select cf1_0.id_comprobante,cf1_0.ambiente,cf1_0.clave_numerica,cf1_0.fk_id_compra,cf1_0.fk_id_empresa,cf1_0.estado,cf1_0.fecha_emision,cf1_0.fecha_respuesta,cf1_0.intentos_envio,cf1_0.mensaje_hacienda,cf1_0.moneda,cf1_0.numero_consecutivo,cf1_0
319:2026-10-26 04:45:00.037 DEBUG [-] org.hibernate.SQL - select cf1_0.id_comprobante,cf1_0.ambiente,cf1_0.clave_numerica,cf1_0.fk_id_compra,cf1_0.fk_id_empresa,cf1_0.estado,cf1_0.fecha_emision,cf1_0.fecha_respuesta,cf1_0.intentos_envio,cf1_0.mensaje_hacienda,
320:Hibernate: select cf1_0.id_comprobante,cf1_0.ambiente,cf1_0.clave_numerica,cf1_0.fk_id_compra,cf1_0.fk_id_empresa,cf1_0.estado,cf1_0.fecha_emision,cf1_0.fecha_respuesta,cf1_0.intentos_envio,cf1_0.mensaje_hacienda,cf1_0.moneda,cf1_0.numero_consecutivo,cf1_0
321:2026-10-26 04:45:00.038 DEBUG [-] org.hibernate.SQL - select cf1_0.id_comprobante,cf1_0.ambiente,cf1_0.clave_numerica,cf1_0.fk_id_compra,cf1_0.fk_id_empresa,cf1_0.estado,cf1_0.fecha_emision,cf1_0.fecha_respuesta,cf1_0.intentos_envio,cf1_0.mensaje_hacienda,
322:Hibernate: select cf1_0.id_comprobante,cf1_0.ambiente,cf1_0.clave_numerica,cf1_0.fk_id_compra,cf1_0.fk_id_empresa,cf1_0.estado,cf1_0.fecha_emision,cf1_0.fecha_respuesta,cf1_0.intentos_envio,cf1_0.mensaje_hacienda,cf1_0.moneda,cf1_0.numero_consecutivo,cf1_0
323:2026-10-26 04:45:00.039 DEBUG [-] org.hibernate.SQL - select cf1_0.id_comprobante,cf1_0.ambiente,cf1_0.clave_numerica,cf1_0.fk_id_compra,cf1_0.fk_id_empresa,cf1_0.estado,cf1_0.fecha_emision,cf1_0.fecha_respuesta,cf1_0.intentos_envio,cf1_0.mensaje_hacienda,
324:Hibernate: select cf1_0.id_comprobante,cf1_0.ambiente,cf1_0.clave_numerica,cf1_0.fk_id_compra,cf1_0.fk_id_empresa,cf1_0.estado,cf1_0.fecha_emision,cf1_0.fecha_respuesta,cf1_0.intentos_envio,cf1_0.mensaje_hacienda,cf1_0.moneda,cf1_0.numero_consecutivo,cf1_0
365:2026-10-26 04:45:26.160 DEBUG [2c402f3ec96e] org.hibernate.SQL - select e1_0.id_empresa,e1_0.actividad_economica,e1_0.ambiente_hacienda,e1_0.fk_id_bodega_venta_online,e1_0.categoria_negocio,e1_0.cedula_juridica,e1_0.cert_p12_path,e1_0.clave_hacienda_enc,e1
366:Hibernate: select e1_0.id_empresa,e1_0.actividad_economica,e1_0.ambiente_hacienda,e1_0.fk_id_bodega_venta_online,e1_0.categoria_negocio,e1_0.cedula_juridica,e1_0.cert_p12_path,e1_0.clave_hacienda_enc,e1_0.cobros_pausados,e1_0.color_acento,e1_0.color_primar
1407:2026-10-26 04:47:27.810 WARN  [95bbcf788d40] c.h.payment.OnvoCapturaService - [ALERTA-PAGO] Cobro ONVO en modo prueba: pedido marcado es_prueba. sessionId=<sesion_test>
1416:2026-10-26 04:47:27.832 DEBUG [95bbcf788d40] org.hibernate.SQL - select i1_0.fk_id_pedido,i1_0.id_pedido_item,i1_0.cantidad,i1_0.costo_unitario_momento,i1_0.descuento_aplicado,i1_0.fk_id_estado,i1_0.precio_unitario_momento,i1_0.fk_id_producto,p2_0.id_prod
1417:Hibernate: select i1_0.fk_id_pedido,i1_0.id_pedido_item,i1_0.cantidad,i1_0.costo_unitario_momento,i1_0.descuento_aplicado,i1_0.fk_id_estado,i1_0.precio_unitario_momento,i1_0.fk_id_producto,p2_0.id_producto,p2_0.fk_id_admin_cliente,p2_0.barcode,p2_0.fk_id_
1420:2026-10-26 04:47:27.840 DEBUG [95bbcf788d40] org.hibernate.SQL - select p1_0.id_producto,p1_0.fk_id_admin_cliente,p1_0.barcode,p1_0.fk_id_bodega,b1_0.id_bodega,b1_0.acepta_efectivo,b1_0.fk_id_admin_cliente,b1_0.canton,b1_0.capacidad_maxima,b1_0.correo_con
1421:Hibernate: select p1_0.id_producto,p1_0.fk_id_admin_cliente,p1_0.barcode,p1_0.fk_id_bodega,b1_0.id_bodega,b1_0.acepta_efectivo,b1_0.fk_id_admin_cliente,b1_0.canton,b1_0.capacidad_maxima,b1_0.correo_contacto,b1_0.direccion_exacta,b1_0.distrito,b1_0.fk_id_e
1426:2026-10-26 04:47:27.850 DEBUG [95bbcf788d40] org.hibernate.SQL - select ep1_0.id_encargo,ep1_0.email,ep1_0.fk_id_empresa,ep1_0.estado,ep1_0.estado_fulfillment,ep1_0.fecha_actualizacion,ep1_0.fecha_creacion,ep1_0.fecha_vencimiento,ep1_0.imagen_url_1,ep1_0.
1427:Hibernate: select ep1_0.id_encargo,ep1_0.email,ep1_0.fk_id_empresa,ep1_0.estado,ep1_0.estado_fulfillment,ep1_0.fecha_actualizacion,ep1_0.fecha_creacion,ep1_0.fecha_vencimiento,ep1_0.imagen_url_1,ep1_0.imagen_url_2,ep1_0.imagen_url_3,ep1_0.mensaje_vendedor
1433:2026-10-26 04:47:27.857 INFO  [95bbcf788d40] c.h.payment.OnvoCapturaService - [onvo] Checkout confirmado: sessionId=<sesion_test>
1436:2026-10-26 04:47:27.860 DEBUG [95bbcf788d40] org.hibernate.SQL - select e1_0.id_empresa,e1_0.actividad_economica,e1_0.ambiente_hacienda,e1_0.fk_id_bodega_venta_online,e1_0.categoria_negocio,e1_0.cedula_juridica,e1_0.cert_p12_path,e1_0.clave_hacienda_enc,e
1437:Hibernate: select e1_0.id_empresa,e1_0.actividad_economica,e1_0.ambiente_hacienda,e1_0.fk_id_bodega_venta_online,e1_0.categoria_negocio,e1_0.cedula_juridica,e1_0.cert_p12_path,e1_0.clave_hacienda_enc,e1_0.cobros_pausados,e1_0.color_acento,e1_0.color_prima
1440:2026-10-26 04:47:27.864 INFO  [95bbcf788d40] c.h.s.p.PaymentNotificationsFacade - Pedido ORD-8179250FF028 confirmado PAGADO via ONVO
1443:2026-10-26 04:47:27.969 INFO  [95bbcf788d40] com.hotclick.service.OnvoService - [onvo] SINPERefNumber no disponible para intent cmvp4qf1r0tzkk125kvdpgawq: BadRequest
1444:2026-10-26 04:47:28.145 ERROR [-] c.h.s.e.NotificacionPedidoEmailSender - No se pudo enviar email de confirmación para pedido ORD-8179250FF028: SendGrid respondió 401: {"errors":[{"message":"Permission denied, wrong credentials","field":null,"help":null
1447:2026-10-26 04:47:28.154 WARN  [-] c.h.s.whatsapp.WhatsAppMessageSender - [WA-SIMULADO] CONFIRMACION_PEDIDO → <TELEFONO_PRUEBA>: Hola Invitado, tu pedido ORD-8179250FF028 fue confirmado por ₡5.000. Gracias por comprar en HOTCLICK.
1448:2026-10-26 04:47:28.395 ERROR [-] c.h.s.e.NotificacionPedidoEmailSender - No se pudo enviar email nueva venta a emprendedor para pedido ORD-8179250FF028: SendGrid respondió 401: {"errors":[{"message":"Permission denied, wrong credentials","field":null,"h
1465:2026-10-26 04:47:31.223 INFO  [b31fab569c08] c.h.payment.OnvoPaymentProvider - [onvo] Sesión ya procesada: sessionId=<sesion_test>
### 7) Backend pid 2500592 detenido 04:47:46 CR
notif: CONFIRMACION_PEDIDO WA=1 email_conf=1 email_vendedor=1 confirmado=1 ya_procesada=1
### Conclusión
- PAGADO + es_prueba: OK. Sesión ONVO open+paid, intent succeeded → webhook 200 {"status":"ok"} → pedido 16 PAGADO, es_prueba=t, pago 14 CAPTURADO, alerta [ALERTA-PAGO] modo prueba. Fix 62b7c0e1 corrige el bug paid+open del caso 3.
- Idempotencia: OK. Duplicado (mismo id <evento>) → 200 {"status":"duplicate"}, log "Sesión ya procesada"; 1 fila de pago, 1 webhook_event, stock descontado una sola vez (6/4 → 5/3), notificaciones disparadas 1 vez, billing_ledger sin cambios (0).
- /pago/exito: hace polling a GET /api/payments/status/{numero} cada 3 s (máx 60 = 3 min); tras el webhook responde CAPTURADO → la página pasaría a éxito si aún estaba dentro de los 3 min.
- Observaciones menores: no se crea fila en hot_click_movimiento_stock_tb por el descuento de stock (sin kardex); correos fallan con SendGrid 401 en local (no se envían a mailpit); SINPERefNumber BadRequest para intent de tarjeta (esperable, best-effort).
