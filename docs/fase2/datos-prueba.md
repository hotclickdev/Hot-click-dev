# Datos de prueba ficticios · Fase 2 (solo staging)

Reglas: todo es inventado. Dominio `ejemplo.test` (reservado, no entrega correo). Cédulas con prefijo `QA-` y 9 ceros/letras: **inválidas a propósito** (no pasan validación de Hacienda ni pertenecen a nadie). Teléfonos `0000-00xx` (no existen en CR). **Sin números SINPE, sin IBAN reales, sin tarjetas reales** (solo tarjetas de prueba que da ONVO en modo test, consultadas en su doc, no copiadas aquí).
**Contraseñas:** no se escriben. Cada QA genera la suya en el vault ("HotClick QA staging – <rol>") y la fija con "recuperar contraseña" en staging. La semilla deja un hash inválido que no permite login.

## Cuentas QA (una por QA)
| Clave | Rol | Nombre | Correo | Cédula ficticia | Teléfono |
|---|---|---|---|---|---|
| cliente | Cliente consumidor | Ana Prueba Uno | qa+cliente@ejemplo.test | QA-000000001 | 0000-0001 |
| consumidor | TEST Usuario consumidor | Beto Prueba Dos | qa+consumidor@ejemplo.test | QA-000000002 | 0000-0002 |
| emprendedor | Emprendedor dueño | Carla Prueba Tres | qa+emprendedor@ejemplo.test | QA-000000003 | 0000-0003 |
| pyme-dueno | Pyme dueño | Diego Prueba Cuatro | qa+pyme-dueno@ejemplo.test | QA-000000004 | 0000-0004 |
| pyme-admin | Pyme ADMIN | Elena Prueba Cinco | qa+pyme-admin@ejemplo.test | QA-000000005 | 0000-0005 |
| pyme-editor | Pyme vendedor/EDITOR | Fabio Prueba Seis | qa+pyme-editor@ejemplo.test | QA-000000006 | 0000-0006 |
| pyme-lector | Pyme contador/LECTOR | Gina Prueba Siete | qa+pyme-lector@ejemplo.test | QA-000000007 | 0000-0007 |
| plus-dueno | Negocio Plus dueño | Hugo Prueba Ocho | qa+plus-dueno@ejemplo.test | QA-000000008 | 0000-0008 |
| plus-admin | Negocio Plus ADMIN | Irene Prueba Nueve | qa+plus-admin@ejemplo.test | QA-000000009 | 0000-0009 |
| cajero | Cajero POS | Jorge Prueba Diez | qa+cajero@ejemplo.test | QA-000000010 | 0000-0010 |
| cajero-b | Cajero POS tienda B (IDOR) | Karla Prueba Once | qa+cajero-b@ejemplo.test | QA-000000011 | 0000-0011 |
| admin | Admin plataforma | Luis Prueba Doce | qa+admin@ejemplo.test | QA-000000012 | 0000-0012 |
| soporte-tg | Soporte Telegram | Marta Prueba Trece | qa+soporte-tg@ejemplo.test | QA-000000013 | 0000-0013 |
| gracia | Emprendedor en gracia | Nico Prueba Catorce | qa+gracia@ejemplo.test | QA-000000014 | 0000-0014 |
| impago | Pyme en impago | Olga Prueba Quince | qa+impago@ejemplo.test | QA-000000015 | 0000-0015 |
| vencida | Negocio Plus vencida | Pablo Prueba Dieciséis | qa+vencida@ejemplo.test | QA-000000016 | 0000-0016 |
| upgrade | Emprendedor para upgrade | Rosa Prueba Diecisiete | qa+upgrade@ejemplo.test | QA-000000017 | 0000-0017 |
| downgrade | Negocio Plus para downgrade | Saúl Prueba Dieciocho | qa+downgrade@ejemplo.test | QA-000000018 | 0000-0018 |

## Roles reales (master adf05174)
- Equipo (`hot_click_miembro_empresa_tb.rol_en_empresa`): PROPIETARIO, ADMIN, EDITOR, LECTOR (`EquipoController.java:24`, `PropietarioGuard.java:31`) y CAJERO (`PosAnulacionService.java:45`).
- **Supuesto:** contador = LECTOR, vendedor/operador = EDITOR (no existen como roles).
- Globales (`hot_click_usuario_rol_tb`): ADMIN (admin plataforma), SUPPORT (soporte), EMPRENDEDOR (dueños). Constants.java:51-59.

## Reglas de gracia y vencimiento (área 5, adf05174)
- Días de gracia: `hotclick.billing.dias-gracia=8` (`Hot_click_outlet/src/main/resources/application.properties:549`; también default `:8` en `SuscripcionRenewalService.java:26`, `AdminSuspensionService.java:71`, `TrialEmprendedorService.java:53`). Comentario en :547-548: día 1 = día siguiente a `fecha_fin`; el día 8 vende normal; desde el día 9 la tienda queda `SUSPENDIDO_IMPAGO` (oculta, sin ventas) hasta pagar (`Constants.java:153-154`).
- Paso a VENCIDO: job `expirarPastDue` con `limite = hoy - diasGracia` (`SuscripcionRenewalService.java:77`); toma PAST_DUE con `fecha_fin < limite` (`SuscripcionRepository.java:99-111`). Con suscripción ONVO, solo baja si la reconsulta GET confirma NO_PAGADA (`SuscripcionRenewalService.java:128-130`); baja atómica `marcarVencidoSiPastDue` (`SuscripcionRepository.java:117`).
- Si ONVO no responde: queda INCIERTA hasta `hotclick.billing.dias-max-incierta=7` días desde `fecha_fin + dias-gracia` (`application.properties:553`).
- Extensión admin "Dar 3 días extra" = `EXTENSION_IMPAGO` (`Constants.java:155-156`).
- Trial Emprendedor: `TRIAL_EMPRENDEDOR_DIAS` por defecto 90 (`application.properties:540`); trial vencido → VENCIDO (`SuscripcionRepository.java:69`).

## Tiendas ficticias
| Tienda | Dueño | Plan | Bodegas |
|---|---|---|---|
| QA Tienda Emprendedor | emprendedor | Emprendedor (gratis) | 1 |
| QA Pyme Café | pyme-dueno | Pyme | 2 (Central, Norte) |
| QA Plus Ferretería | plus-dueno | Negocio Plus | 2 |
| QA Tienda B (IDOR) | plus-dueno | Negocio Plus | 1 |
| QA Tienda Gracia | gracia | Emprendedor PAST_DUE, fecha_fin = hoy-3 (día 3 de 8) | 1 |
| QA Tienda Pausada | impago | Pyme PAST_DUE, fecha_fin = hoy-9, SUSPENDIDO_IMPAGO | 1 |
| QA Tienda Vencida | vencida | Negocio Plus VENCIDO, fecha_fin = hoy-30 | 1 |
| QA Tienda Upgrade | upgrade | Emprendedor | 1 |
| QA Tienda Downgrade | downgrade | Negocio Plus | 2 |

## Productos (montos en ₡, IVA 13 % calculado en servidor)
| SKU | Producto | Tienda | Precio | Stock | Nota |
|---|---|---|---|---|---|
| QA-001 | Taza QA cerámica | Emprendedor | ₡4 500 | 10 | normal |
| QA-002 | Camiseta QA talla M | Emprendedor | ₡8 900 | 1 | última unidad (concurrencia POS vs online) |
| QA-003 | Café QA 340 g | Pyme Café | ₡6 250 | 20 / 0 | stock solo en bodega Central |
| QA-004 | Queque QA personalizado | Pyme Café | ₡15 000 | 5 | personalizado |
| QA-005 | Martillo QA | Plus | ₡12 300 | 8 | con oferta ₡9 900 (MEDIO self-checkout) |
| QA-006 | Tornillos QA x100 | Plus | ₡1 250 | 500 | cantidades raras (0, -1, 99999) |
| QA-007 | Producto QA tienda B | Tienda B | ₡3 000 | 3 | IDOR |
| QA-008 | Producto QA pausado | Pausada | ₡2 000 | 5 | no debe venderse |

## Direcciones (#447)
- Válida GAM: San José, San José, Carmen, "Calle QA ficticia 0".
- Válida fuera GAM: Guanacaste, Liberia, Liberia, "Calle QA ficticia 1".
- Inválida: provincia "QA-Inexistente" → debe dar 400.

## Cupones
`QA-DESC10` (10 %), `QA-VENCIDO` (vencido), `QA-USO1` (un uso).

## Negocio activo de los dueños (P7)
La semilla solo inserta, así que no puede setear `hot_click_usuario_tb.fk_id_empresa`: queda NULL en las 18 cuentas. QA lo confirmó en PG17: hasta hacer cambiar-negocio, todo devuelve `EMPRESA_REQUERIDA`, incluso al dueño.
Después de cada login, y antes de probar, cada cuenta de dueño o de equipo llama a **cambiar-negocio** con su tienda (plus-dueno elige entre qa-plus-ferreteria y qa-tienda-b). La propuesta de QA no trae una forma segura de hacerlo solo con INSERT, por eso queda como paso manual.
