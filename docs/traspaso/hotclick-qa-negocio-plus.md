# Traspaso — HotClick QA Negocio Plus (QA 3)

## Rol
Tester funcional QA 3, cuenta **Negocio Plus**. Plan: `plan-qa-funcional-2026-10-23.md`, sección QA 3. No toca código; prueba desde la app (ONVO solo modo test) y reporta bugs con la plantilla del plan.

## En qué quedé
**Área 2 Cuentas y Roles — cerrada** en staging local `f9f0e506` (front :3000, backend :8081):
| Caso | Resultado |
|---|---|
| 1 Login dueño/EDITOR/LECTOR | OK (activación por Mailpit bloqueada: la invitación no llega a Mailpit) |
| 2 EDITOR sin acceso a billing | FALLO parcial — **MEDIO**: GET suscripción/facturas/preferencias/wallet/métodos de cobro dan 200 a EDITOR (y LECTOR) |
| 3 QA3-017 EDITOR cambia rol a ADMIN | OK, 403 — **cerrado** |
| 4 LECTOR no escribe | OK, 403 en productos, equipo y billing |
| 5 Normalización de correo | FALLO parcial — **BAJO**: espacios alrededor dan 400 en vez de recortarse |

Observación (posible bug): el LECTOR invitado entra con `correoVerificado=true` sin haber verificado nunca.
En staging se quitó el EDITOR de prueba 1023 y se agregó el LECTOR 1067.

**Producción 24/10 (hotclick.lat, cuenta de prueba, solo PRUEBA, sin dinero real):**
- QA3-P01 Medio — suscripción muestra FREE/SIN_SUSCRIPCION con plan NEGOCIO_PLUS.
- QA3-P02 Bajo — en la invitación nombre/apellido se guardan invertidos.
- QA3-P03 Bajo — dashboard cuenta 1 usuario con 2 miembros en el equipo.

## Ramas y PRs
Ninguno (QA 3 no tiene código).

## Pendientes
- **Limpieza en prod:** productos 668 y 669 (PRUEBA, empresa de prueba Negocio Plus) y miembro de equipo 138. Agregar pedidos de QA Compra si compraron 668/669.
- **Billing de planes pagos pospuesto** (N2–N6, QA3-005): sin tarjeta 4242 ni cambio de plan hasta nueva orden.
- Reintentar activación por correo cuando Mailpit reciba invitaciones.

## Próximos pasos
1. Corregir/verificar MEDIO de billing visible a EDITOR/LECTOR y QA3-P01.
2. Re-probar casos 2 y 5 y la observación de `correoVerificado` sobre el hash con el fix.
3. Ejecutar la limpieza de prod listada arriba.

## Decisiones de Andrés conocidas
- Autorización de prod (24/10 02:29 CR): solo productos PRUEBA, invitación de editor y POS sin dinero real; sin tarjeta ni cambio de plan; todo lo creado se anota para limpieza.
- Sin deploy, sin crear servidores ni cuentas reales.
- Merges a master solo con CI verde + APTO sobre el hash exacto.
- **Recomendación:** rotar las contraseñas de las cuentas de prueba de prod, porque se expusieron en una salida interna de herramienta (no en reportes).

## Evidencia
- Resumida en `docs/traspaso/evidencia/hotclick-qa-negocio-plus/` (reportes .md y logs HTTP cortos redactados).
- Original en el box anterior: `/workspace/qa-funcional/qa3/`. Las credenciales nunca se suben.
