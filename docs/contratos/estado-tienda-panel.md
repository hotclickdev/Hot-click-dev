# Contrato · Estado de la tienda en el panel (pedido de Frontend #182)

## GET /api/negocio/estado-tienda
- **Auth:** JWT de negocio (`EMPRENDEDOR`, dueño o personal); el negocio sale del token. Comprador → 403, anónimo → 401.
```json
{ "success": true, "message": "Estado de la tienda",
  "data": { "estado": "ACTIVA", "reactivada": false, "plan": "PYME", "montoMensualidad": 15000, "diasGracia": null, "pedidosEnCurso": 2 } }
```
| Campo | Origen |
|---|---|
| `estado` | `PAUSADA` si `empresa.tiendaPausada` (V181), si no `ACTIVA` |
| `reactivada` | **siempre `false` por ahora.** Desviación: la reactivación después de pagar depende del cobro de mensualidad con ONVO (S4-11/S4-12) |
| `plan` | nombre del plan estructurado; si no tiene, `planSaas` (p. ej. `GRATUITO`) |
| `montoMensualidad` | `plan.precioMensual` guardado en la base; `null` sin plan. No se inventa |
| `diasGracia` | `null`: los días de gracia son una **decisión pendiente del dueño** |
| `pedidosEnCurso` | pedidos del negocio en PENDIENTE, PENDIENTE_COMPROBANTE, PENDIENTE_APROBACION, CONFIRMADO, PAGADO, PREPARANDO, EN_PREPARACION, LISTO_RETIRO o ENVIADO |

## Errores
| Código | Cuándo |
|---|---|
| 401 | sin token |
| 403 | usuario sin negocio (comprador) |

## No incluido
- `tienda: { nombreComercial, logoUrl }` dentro del 410 público: queda para un PR aparte sobre `SlugTenantInterceptor`.
