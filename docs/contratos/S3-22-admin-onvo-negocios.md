# Contrato S2-29 / S3-22 · Admin de cuentas ONVO de los negocios (lectura) — Frontend #173

**Depende de #197** (tabla V183 `hot_click_negocio_onvo_cuenta_tb`). Esta rama sale de la de #197: hay que mergear #197 primero.

Base **`/api/admin/onvo/negocios`** con alias **`/api/plataforma/onvo/negocios`**: mismo controlador, sirven las dos.
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

## Acciones del admin
| Ruta | Respuesta | Errores |
|---|---|---|
| `POST /{id}/registrar` | 204 (crea la cuenta en ONVO; estado `ONBOARDING_PENDIENTE`; auditado) | 409 `CUENTA_YA_EXISTE` (se revisa antes de ONVO) · 503 `ONVO_NO_CONFIGURADO` · 404 |
| `POST /{id}/reenviar-enlace` | 204 (auditado) | 409 `SIN_CUENTA_ONVO` · 503 `ONVO_NO_CONFIGURADO` · 404 |
| `PUT /{id}/comision` `{ "porcentaje": 3.75 }` | 204. Guarda `pct_comision` (0–100, hasta 2 decimales), no llama a ONVO, queda auditado con el valor anterior y el nuevo | 400 `PORCENTAJE_INVALIDO` (falta, no numérico, fuera de rango o más de 2 decimales) · 404 |

## Endpoints del negocio (solo el propietario; el personal recibe 403 `SOLO_PROPIETARIO`)
Base `/api/negocio/onvo` (alias `/api/empresa/onvo`).
| Ruta | Respuesta | Errores |
|---|---|---|
| `POST /activar` | `{ data: { url } }`: enlace https de onboarding de ONVO | 409 `CUENTA_YA_EXISTE` · 503 `ONVO_NO_CONFIGURADO` |
| `POST /enlace` | `{ data: { url } }`: enlace vigente para «Continuar en ONVO» | 409 `SIN_CUENTA_ONVO` · 503 `ONVO_NO_CONFIGURADO` |
| `POST /reenviar-enlace` | 204 | 409 `SIN_CUENTA_ONVO` · 503 `ONVO_NO_CONFIGURADO` |

## ONVO: fail-closed (PAG-6)
Todo lo que habla con ONVO pasa por la interfaz `OnvoMarketplaceClient`.
- El único bean hoy es `OnvoMarketplaceNoConfigurado`: responde 503 `ONVO_NO_CONFIGURADO` y nunca simula una cuenta ni un enlace.
- Una URL que no sea https también se trata como 503, y en ese caso no se guarda la cuenta.
- **El comportamiento real necesita las llaves sandbox de ONVO (S2-01) y la implementación HTTP del cliente (S2-13).** Los tests usan el cliente mockeado.
- Cuerpo de error: `{ success:false, code, message }`.

## Errores
| Código | Cuándo |
|---|---|
| 400 `{success:false, code:"ESTADO_INVALIDO", message}` | `estado` fuera del enum |
| 403 | negocio o comprador en las rutas del admin |
| 404 | `{id}` inexistente |

## Fuera de este PR
- La implementación HTTP real de `OnvoMarketplaceClient` (S2-13), con las llaves sandbox (S2-01).
- Conciliación real (`CUADRA` / `DIFERENCIA`) y `conciliadoEl`: dependen de la sincronización con ONVO.
- Pausar o reanudar los cobros sigue en `PUT /api/admin/empresas/{id}/cobros-pausados` (#197 guarda el `motivo`).

## Desviación
La lista suma `total`, `pagina` y `tamano` para paginar.
