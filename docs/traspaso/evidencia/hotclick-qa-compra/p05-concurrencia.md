## P-05 dos checkouts concurrentes [4,5] vs [5,4] — 2026-10-26 13:04:31 CR (master d552ab88, backend propio :8080)
### orden items empezando por 4
{"success":true,"message":"Sesión de pago creada","data":{"pedidoId":23,"numeroPedido":"ORD-9B113B4FE091","redirectUrl":"https://checkout.onvopay.com/pay/<sesion>","estadoPago":"PENDIENTE","total":32000,"proveedor":"ONVO","sdkToken":null,"orderNumber":null,"modoEmbebido":false,"moneda":"CRC","cancelToken":"<redactado>","paquetes":[{"numeroPedido":"ORD-9B113B4FE091","tienda":"QA Plus Prueba","origen":"SAN JOSE","metodoEnvio":"ENCOMIENDA_PROPIA","costoEnvio":2000,"total":32000}],"sinpeDestino":null,"plazoInterno":null},"timestamp":"2026-10-26T13:04:32.<NUMERO_REDACTADO>"} HTTP 200 t=1.229936s
### orden items empezando por 5
{"success":true,"message":"Sesión de pago creada","data":{"pedidoId":22,"numeroPedido":"ORD-31B01A6D47FF","redirectUrl":"https://checkout.onvopay.com/pay/<sesion>","estadoPago":"PENDIENTE","total":32000,"proveedor":"ONVO","sdkToken":null,"orderNumber":null,"modoEmbebido":false,"moneda":"CRC","cancelToken":"<redactado>","paquetes":[{"numeroPedido":"ORD-31B01A6D47FF","tienda":"QA Plus Prueba","origen":"SAN JOSE","metodoEnvio":"ENCOMIENDA_PROPIA","costoEnvio":2000,"total":32000}],"sinpeDestino":null,"plazoInterno":null},"timestamp":"2026-10-26T13:04:32.<NUMERO_REDACTADO>"} HTTP 200 t=0.838517s
/tmp/p05_4.out:HTTP 200 t=1.229936s
/tmp/p05_5.out:HTTP 200 t=0.838517s
deadlock/40P01 en backend.log: 0
