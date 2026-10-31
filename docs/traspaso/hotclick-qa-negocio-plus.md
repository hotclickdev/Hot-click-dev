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

## Correcciones al README
**(a) Errores o datos viejos**
- Fila de QA 3: falta el BAJO del trim de email (caso 5), la observación del LECTOR con `correoVerificado=true` sin verificar y los bugs de prod QA3-P01 (medio), QA3-P02 y QA3-P03 (bajos). QA3-017 está cerrado (403).
- Comisión Negocio Plus: el README dice 6 %, pero prod (`GET /api/billing/planes`, 24/10) devolvía 7 % con mínimo ₡700. Hay que confirmar si #332 ya está desplegado.
- "Clerk" aparece como autenticación, pero lo que QA usa es JWT propio en `POST /api/auth/login`. Verificar.
- El plan `/workspace/hotclick-reportes/plan-qa-funcional-2026-10-23.md` (citado en el prompt) está en el box viejo, no en el repo. Hay que subirlo o resumirlo en `docs/`.

**(b) Lo que le falta al reemplazo**
- Variables, solo por nombre: llaves ONVO de test (prefijo `onvo_test_`, en `.env`), `EMPRENDEDOR_/PYME_/NEGOCIO_PLUS_PRECIO_MENSUAL_USD` y `HOTCLICK_NUMEROS_PROHIBIDOS`.
- Staging local: front en `:3000`, backend en `:8081` (perfil dev) y Mailpit en `:8025` (UI/API para leer correos). Lo levanta CI/CD o un único bot; no levantar duplicados. No tocar los procesos `hotclick-staging-*` ni usar `pkill`.
- Accesos: cuentas sintéticas `qa3+…@example.com` (staging) y `andres.prueba+…@example.com` (prod, solo PRUEBA). Las credenciales van solo por canal interno y nunca al repo.
- Trampas:
  - La invitación de equipo no llega a Mailpit; no reintentar en bucle.
  - `SendToAgent` con `priority: false` queda retenido; lo urgente va con `priority: true`.
  - No borrar `frontend/node_modules` del worktree de staging ni `/workspace/tools/node22`.
  - El tope de usuarios del plan (2/2) bloquea invitaciones; liberar cupo quitando solo un miembro de QA, nunca al dueño.
- Pendientes de Andrés: la limpieza de prod (productos 668/669 y miembro 138) y la rotación de las contraseñas de las cuentas de prueba de prod, que se expusieron en una salida interna.

**(c) Mejoras**
- Agregar al README una tabla de bugs abiertos por QA, con severidad y PR de fix.
- Agregar un checklist de arranque de staging con un comando de salud (`/actuator/health` o equivalente) antes de probar.
- Llevar un registro único de limpieza de prod (`docs/traspaso/pendientes/limpieza-prod.md`) que junte los ítems de todos los QA.
