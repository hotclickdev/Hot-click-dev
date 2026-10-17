# Contrato · Multinegocio: planNombre y 403 estable (pedido de Frontend #172)

## POST /api/auth/login (respuesta con varios negocios, sin cambios de ruta)
Cada elemento de `empresas` suma **`planNombre`**:
```json
{ "success": true, "requiresEmpresaSelection": true, "tempToken": "…",
  "empresas": [ { "id": 12, "nombre": "Casa Luna", "logoUrl": null, "slug": "casa-luna", "estadoEmpresa": "ACTIVO", "rol": "PROPIETARIO", "planNombre": "PYME" } ] }
```
- `planNombre`: nombre del plan en mayúsculas con `_` (p. ej. `EMPRENDEDOR`, `PYME`, `NEGOCIO_PLUS`); `null` si el negocio no tiene plan estructurado. Sale de la base, no de una lista fija.

## POST /api/auth/seleccionar-empresa
- Body `{ tempToken, empresaId }`.
- **403** `{ "success": false, "code": "SIN_ACCESO_NEGOCIO", "message": "No tenés acceso a ese negocio" }` si el usuario no es miembro activo de ese negocio (también en el cambio de negocio con sesión).

| Código | Cuándo |
|---|---|
| 400 | falta `tempToken` o `empresaId` |
| 401 | token de selección inválido o vencido |
| 403 `SIN_ACCESO_NEGOCIO` | no es miembro activo del negocio |

**No incluido:** los `code` de «Crear otro negocio» (`NOMBRE_NEGOCIO_EN_USO`, `CUPO_NEGOCIOS`) van en #176 (`feat/s2-multinegocio`), que es la rama que toca ese alta.
