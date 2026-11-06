## Caso 3 tarjeta 4242 paid+open — sesión <sesion_test> (pagada con 4242 en checkout ONVO modo test el 26/10 ~04:35 CR) — 2026-10-26 12:48:59 CR (master d552ab88)
### GET /v1/checkout/sessions/<sesion_test> (llave onvo_test_)
{"id": "<sesion_test>", "status": "open", "paymentStatus": "paid", "paymentIntentId": "cmvp4eno80twkk125h1tzhrn9", "mode": "test"}
### DB antes
 id_pedido |  numero_pedido   | estado_pedido | es_prueba | id_pago | estado_pago |          
-----------+------------------+---------------+-----------+---------+-------------+----------------------------------
        14 | ORD-3A58EFCEF6CC | PENDIENTE     | f         |      12 | PENDIENTE   | <sesion_test>
(1 row)

 eventos 
---------
       0
(1 row)

### webhook checkout-session.succeeded (secreto correcto)
{"type":"checkout-session.succeeded","status":"ok"}
HTTP 200
 id_pedido |  numero_pedido   | estado_pedido | es_prueba | id_pago | estado_pago |          
-----------+------------------+---------------+-----------+---------+-------------+----------------------------------
        14 | ORD-3A58EFCEF6CC | PAGADO        | t         |      12 | CAPTURADO   | <sesion_test>
(1 row)

 id_webhook_event |        evento_tipo         | procesado 
------------------+----------------------------+-----------
                7 | checkout-session.succeeded | t
(1 row)

### MISMO webhook duplicado
{"type":"checkout-session.succeeded","status":"duplicate"}
HTTP 200
 id_pedido |  numero_pedido   | estado_pedido | es_prueba | id_pago | estado_pago |          
-----------+------------------+---------------+-----------+---------+-------------+----------------------------------
        14 | ORD-3A58EFCEF6CC | PAGADO        | t         |      12 | CAPTURADO   | <sesion_test>
(1 row)

 eventos 
---------
       1
(1 row)

### GET /api/payments/status/{numero}
{"success":true,"message":"Estado del pago","data":{"pagoId":12,"estadoPago":"CAPTURADO","numeroPedido":"ORD-3A58EFCEF6CC","metodoPago":"ONVO","cardLast4":null,"cardBrand":null,"fechaTransaccion":null,"total":5000,"proveedor":"ONVO"},"timestamp":"2026-10-26T12:49:01.<NUMERO_REDACTADO>"}
HTTP 200
