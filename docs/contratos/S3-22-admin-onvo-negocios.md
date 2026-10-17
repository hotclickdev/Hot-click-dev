# Contrato S2-29 / S3-22 · Admin de cuentas ONVO de los negocios (lectura) — Frontend #173

**Depende de #197** (tabla V183 `hot_click_negocio_onvo_cuenta_tb`). Esta rama sale de la de #197: hay que mergear #197 primero.

Base **`/api/admin/onvo/negocios`**. De las dos rutas que propuso Frontend, se eligió la de `/api/admin`.
**Auth:** admin de plataforma (`ADMIN` / `ADMIN_IT`). Negocio o comprador → 403.

## GET /api/admin/onvo/negocios?estado=&page=0&size=50
```json
{ "success": true, "message": "Negocios ONVO",
  "data": { "conciliadoEl": null,
            "negocios": [ { "id": 12, "nombre": "Café Bruma", "plan": "PYME", "porcentajeOnvo": 4.25,
                            "porcentajePlan": 6.5, "estado": "EN_REVISION", "conciliacion": "SIN_DATOS" } ],
            "total": 1, "pagina": 0, "tamano": 50 } }
```
- `id` es el `empresaId`. `nombre` es el nombre comercial; si no hay, la razón social.
- `estado` usa el enum del punto 1: `SIN_CUENTA` | `ONBOARDING_PENDIENTE` | `EN_REVISION` | `ACTIVA` | `PAUSADA` | `SUSPENDIDA`.
  - `PAUSADA` gana siempre (`empresa.cobrosPausados`, pausa de HotClick).
  - Sin fila de cuenta en el modo ONVO en uso (`hotclick.onvo.modo`), el estado es `SIN_CUENTA`.
- `estado` (filtro): sin distinguir mayúsculas; vacío trae todos.
- `porcentajeOnvo`: `pct_comision` de la cuenta, `null` hasta que el admin lo fije (nunca un valor inventado). `porcentajePlan`: `plan.comisionPorcentaje`.
- `conciliacion` siempre `SIN_DATOS` y `conciliadoEl` siempre `null`, hasta que exista la sincronización con ONVO (S2-13 / S3-12).
- Paginado, orden por `id`. `size` de 1 a 200 (por defecto 50).

## GET /api/admin/onvo/negocios/{id}
Lo de la lista más:
```json
{ "correo": "negocio@correo.cr", "cuentaOnvo": "acct_…", "ibanEnmascarado": "•••• 4066",
  "frecuencia": "MENSUAL", "frecuenciaPendiente": "QUINCENAL" }
```
- **IBAN solo enmascarado:** `"•••• " + últimos 4`. Se toma el IBAN activo del negocio (`hot_click_metodo_cobro_tb`, el predeterminado primero). Sin IBAN → `null`. Con menos de 8 caracteres → `"••••"`. El número completo nunca sale, ni en la lista ni en la ficha.
- `cuentaOnvo`: id de la cuenta en ONVO o `null`. Solo aparece en la ficha.
- `frecuencia` / `frecuenciaPendiente`: las de #197. No hay valor por defecto: `null` si el negocio no eligió.

## Errores
| Código | Cuándo |
|---|---|
| 400 `{success:false, code:"ESTADO_INVALIDO", message}` | `estado` fuera del enum |
| 403 | negocio o comprador |
| 404 | `{id}` inexistente |

## Fuera de este PR
- `POST /{id}/registrar` y `POST /{id}/reenviar-enlace`: necesitan `OnvoMarketplaceClient` (S2-13) y las llaves sandbox (S2-01).
- `PUT /{id}/comision { porcentaje }` (0–100, auditado): queda para el siguiente PR. El porcentaje lo carga el admin; el backend no fija ninguno.
- Conciliación real (`CUADRA` / `DIFERENCIA`) y `conciliadoEl`: dependen de la sincronización con ONVO.
- Pausar o reanudar los cobros sigue en `PUT /api/admin/empresas/{id}/cobros-pausados` (#197 guarda el `motivo`).

## Desviación
La lista suma `total`, `pagina` y `tamano` para paginar.
