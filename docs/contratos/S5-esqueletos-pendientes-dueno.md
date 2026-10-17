# Contrato · Esqueletos S5 que esperan decisiones del dueño

Las rutas, la autorización y la validación de entrada ya existen. La regla de negocio **no** está implementada: no hay plazos, montos ni políticas inventadas. Mientras tanto responden:

```json
{ "success": false, "code": "PENDIENTE_DECISION_DUENO", "historia": "S5-21", "message": "Todavía no disponible: …" }
```
con **HTTP 501**. El front debe mostrar «Todavía no disponible» ante `code = PENDIENTE_DECISION_DUENO`.

| Área | Rutas | Auth | Validación que ya corre | Falta del dueño |
|---|---|---|---|---|
| Reembolso del comprador (S5-21, front #186) | `GET/POST /api/pedidos/{id}/reembolso` | comprador dueño del pedido | 404 `PEDIDO_NO_ENCONTRADO`; 403 `SIN_ACCESO_PEDIDO`; 400 `SIN_ITEMS`, `MOTIVO_INVALIDO` (`NO_LLEGO`, `LLEGO_DANADO`, `NO_ES_LO_QUE_PEDI`, `OTRO`) | S5-05: plazo (el front supone 30 días, sin confirmar), montos, quién lo absorbe; ejecución con ONVO |
| Reembolsos del negocio (S5-22, #187) | `GET /api/negocio/reembolsos?vista=pendientes\|historial`, `POST /{id}/aprobar`, `POST /{id}/rechazar {motivo}` | `EMPRENDEDOR` | 400 `VISTA_INVALIDA`; 400 `MOTIVO_INVALIDO` (motivo de 3+ caracteres); comprador 403 | S5-05 |
| Contracargos (S5-23, #188) | `GET /api/admin/contracargos`, `GET /{id}`, `POST /{id}/pruebas`, `DELETE /{id}/pruebas/{pruebaId}`, `POST /{id}/responder` | ADMIN | vendedor 403 | S5-05, webhook de disputas de ONVO, bucket privado |
| Facturación manual (S5-13/14/16, #185, #190) | `GET /api/admin/facturacion/por-facturar`, `/por-facturar/{id}`, `GET/POST /emitidas`, `GET /negocios`, `GET /acuerdos` | ADMIN | 400 `CLAVE_INVALIDA` (50 dígitos), `CONSECUTIVO_INVALIDO` (20 dígitos); vendedor 403 | S1-07 (qué es «la tienda»), S5-01 (contador), S5-04 (circuito de factura del negocio), bucket privado |
| Resumen legal (S5-24, #189) | `GET /api/public/legal/{documento}/resumen` (público), `GET /api/admin/legal/{documento}/resumen` (ADMIN) | | `documento` ∈ `terminos`, `privacidad`, `devoluciones`, si no 400 `DOCUMENTO_INVALIDO` | textos aprobados por Legal y el dueño (LEG-6 a LEG-11) |

Excepción: el resumen legal público responde **404 `SIN_RESUMEN_APROBADO`**, como pidió el front, porque es el comportamiento real cuando no hay texto aprobado. La ruta admin responde 501.

Cuando el dueño decida, cada 501 se reemplaza por la implementación sin cambiar rutas ni códigos de error.
