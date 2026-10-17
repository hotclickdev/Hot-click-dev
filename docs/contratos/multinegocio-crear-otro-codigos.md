# Contrato · «Crear otro negocio»: códigos de error (Frontend #172, punto 10)

`POST /api/auth/nuevo-negocio` (usuario con sesión que ya tiene al menos un negocio). El cuerpo de éxito no cambia.

## Errores con `code`
| HTTP | Cuerpo | Cuándo |
|---|---|---|
| 409 | `{success:false, code:"NOMBRE_NEGOCIO_EN_USO", message:"Ese nombre de negocio ya está en uso. Probá con otro."}` | ya existe un negocio con ese nombre (sin distinguir mayúsculas, tildes ni espacios repetidos) |
| 409 | `{success:false, code:"CUPO_NEGOCIOS", message:"Alcanzaste el límite de 20 negocios por cuenta"}` | la cuenta ya tiene 20 negocios |

## Sin cambios
| HTTP | Cuándo |
|---|---|
| 400 | falta el nombre o el correo, o el correo del negocio ya está en uso (sin `code`) |
| 401 | sin sesión |
| 403 | la cuenta todavía no tiene ningún negocio |

## Cambio de estado
El tope de 20 negocios respondía **400**; ahora responde **409** con `code`, como pidió Frontend.
