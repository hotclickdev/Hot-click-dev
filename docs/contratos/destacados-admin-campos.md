# Contrato · Destacados en la lista y ficha del admin (Frontend #178, punto 12)

Ruta y body de destacar coinciden con #177 (ya en master). Este PR solo suma campos a las respuestas.

**Auth:** admin de plataforma (`ADMIN` / `ADMIN_IT`). Comprador → 403.

## GET /api/admin/empresas  y  GET /api/admin/empresas/{id}
Cada negocio trae, además de lo existente:
```json
{ "destacado": true, "destacadoOrden": 3, "destacadoDesde": "2026-10-16T21:30:00" }
```
- `destacado`: boolean (nunca null).
- `destacadoOrden`: 0–999, menor primero; `null` si no está destacado o se destacó sin orden.
- `destacadoDesde`: fecha y hora local de Costa Rica (mismo formato que `fechaRegistro`, sin zona) en que se destacó; `null` si no está destacado. Volver a destacar uno ya destacado no la cambia.

## PUT /api/admin/empresas/{id}/destacado  (existente, #177)
Body `{ "destacado": boolean, "orden"?: 0–999 }`. La respuesta ahora también trae `destacadoDesde`:
```json
{ "success": true, "message": "Negocio destacado en el inicio",
  "data": { "destacado": true, "destacadoOrden": 3, "destacadoDesde": "2026-10-16T21:30:00" } }
```
Quitar el destacado deja `destacadoOrden` y `destacadoDesde` en `null`.

## Errores (sin cambios)
| Código | Cuándo |
|---|---|
| 400 «Solo se pueden destacar negocios activos y visibles al público.» | destacar un negocio no ACTIVO u oculto |
| 400 «El orden va de 0 a 999» / «El orden tiene que ser un número» | `orden` inválido |
| 403 | quien no es admin |

## Desviación
`destacadoDesde` va sin zona (como el resto de fechas de este listado), no ISO con offset.
