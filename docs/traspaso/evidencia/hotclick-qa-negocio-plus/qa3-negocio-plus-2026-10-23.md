# QA 3 — Negocio Plus — ronda 2 (24/10/2026 00:28–00:33 CR)
Ambiente: staging local 387bab8c, V188 (front :3000, backend :8080, Mailpit :8025). Nada en producción.
Evidencia: `evidencia-http.log` (tokens, contraseñas, OTP y teléfonos omitidos), `chat1..6.txt`. Credenciales: solo en `credenciales-internas.txt` (600).

## Datos creados (staging)
- Negocio "QA Plus Prueba" empresaId 4, slug qa-plus-prueba-3, dueño qa3+plus@example.com (usuario 1018). Registro: **1 solo intento**, HTTP 200 (req c1495d0c0bdf, 00:29:20). registro-empresa no pide cédula ni teléfono, así que no se envió ninguno.
- Bodega "QA-TEST Bodega" id 4 (teléfono sintético, omitido en evidencias).
- 10 productos "QA-TEST …" ids 4–13, cat. 39, HTTP 200 c/u, "se publicará cuando tu negocio sea aprobado".
- Miembro qa3+editor@example.com (id 1023, EDITOR).
- Sin suscripciones ni cobros (no se pudo contratar).

## Resultados
| Caso | Estado | Evidencia |
|---|---|---|
| C1 registro + verificación | PASA. Mailpit recibió "Tu código de verificación" y "Tu tienda está lista"; verificar-correo-negocio 200 "Correo verificado correctamente" (00:29:45). Nota: un primer envío salió con código vacío por error de mi extracción -> 400 "Código incorrecto. 4 intento(s) restante(s)" | log 00:29:33 / 00:29:45 |
| C2 correo repetido | NO EJECUTADO (no gastar el límite de 5/h) | — |
| C3 código viejo no sirve | PASA: reusar el código -> 400 "No hay un código activo. Solicitá uno nuevo." Reenviar: no ejecutado (límite) | 00:29:45 |
| C4 login/refresh/logout | Login 200 (rol EMPRENDEDOR, correoVerificado true); refresh por cookie 200; logout no probado | 00:30 |
| C5 recuperar contraseña | NO EJECUTADO esta ronda (límite de intentos) | — |
| C6 cambiar contraseña / 2FA | PASA cambio: 200; contraseña vieja -> 401; token previo invalidado -> 401. 2FA no probado (sesión invalidada; no se repitió login) | 00:32:37 |
| C7 textos | Voseo en la mayoría; excepción QA3-008 (Baja) | — |
| N2 contratar Plus 4242 | **FALLA** QA3-005: checkout/3 -> 409 COBRO_PLAN_NO_DISPONIBLE; no se llegó a ONVO; facturas [] | 00:30:3x |
| N3 rechazo | BLOQUEADO por QA3-005 (sin checkout no hay tarjeta que rechazar). Fail-closed verificado: plan sigue SIN_SUSCRIPCION/FREE | — |
| N4 exclusivas Plus | Parcial (solo catálogo de la ronda 1); sin Plus activo no se pueden comparar pantallas | — |
| N5 Plus->PYME | BLOQUEADO: cambiar-plan/2 -> 409 COBRO_PLAN_NO_DISPONIBLE | 00:31:43 |
| N6 comisión 6% | Solo catálogo (6,00%); config del negocio no aplica sin Plus | — |
| N7 equipo/roles | Alta de EDITOR 200 y listado OK. **QA3-012**: el EDITOR inicia sesión con rol global EMPRENDEDOR y permisos []; su intento de invitar a un ADMIN pasó el control de rol y solo lo frenó el límite del plan (403 LIMIT_REACHED 2/2); cambiar-plan como EDITOR llegó a billing (409), no a 403 | 00:31–00:32 |
| Asistente (3 preguntas) | Garantía/medidas: no responde, lo trata como búsqueda vacía. "Cómodo para la sala": 0 productos. Envío a Cartago: no responde, búsqueda "hacen envíos cartago…". Productos QA-TEST: **no** se muestran a clientes (ni en el chat global ni en el de la tienda; destacados sin QA-TEST), porque el negocio está pendiente de aprobación. Bugs QA3-006/007 (Media) | chat1–6.txt |

## Bugs críticos y altos
ID: QA3-001  Cerrado: staging disponible.
ID: QA3-002 / QA3-003 (ronda 1, esquema)  Cerrados en la práctica: registro OK sobre V188 (re-verificar /api/auth/register de consumidor, no probado en esta ronda).

ID: QA3-005   Título: No se puede contratar Negocio Plus: checkout devuelve 409 COBRO_PLAN_NO_DISPONIBLE
Rol/cuenta usada: dueño qa3+plus (EMPRENDEDOR/FREE)   Ruta/pantalla: /negocio-plus-plan -> POST /api/billing/checkout/3 (lo mismo usa el front, billingService.crearCheckout)
Pasos: 1. Registrar y verificar el negocio. 2. POST checkout/3. 3. POST cambiar-plan/2.
Esperado: sesión de pago ONVO test para tarjeta 4242 y factura US$49.
Obtenido: 409 "Todavía no podemos cobrar este plan…" en ambos; facturas []; suscripción SIN_SUSCRIPCION. El cobro ONVO de suscripciones no está conectado en 387bab8c (CobroPlanNoDisponibleException; es fail-closed, sin cobro).
Evidencia: 24/10 00:30–00:31 CR, evidencia-http.log.
Severidad: Crítica (bloquea N2, N3, N4, N5, N6; no hay ingreso por plan)
¿Se pudo hacer desde la UI?: no.

ID: QA3-012   Título: Un miembro EDITOR pasa los controles de "solo el emprendedor" (rol global EMPRENDEDOR)
Rol/cuenta usada: qa3+editor (EDITOR de empresa 4)   Ruta: POST /api/empresa/equipo, POST /api/billing/cambiar-plan/3
Pasos: 1. El dueño crea un EDITOR. 2. Iniciar sesión como EDITOR (rol=EMPRENDEDOR, permisos=[]). 3. Invitar a un miembro con rolEnEmpresa ADMIN. 4. Pedir cambiar-plan/3.
Esperado: 403 "Solo el emprendedor puede agregar miembros" y 403 en billing.
Obtenido: (3) 403 LIMIT_REACHED (llegó al control de límite, o sea que pasó el control de rol); (4) 409 de billing, no 403. Con más cupo (Plus o PYME) el EDITOR probablemente podría crear un ADMIN y cambiar el plan. Hay que confirmarlo con cupo.
Evidencia: 24/10 00:31:5x CR, evidencia-http.log.
Severidad: Alta (escalada de privilegios dentro del negocio)
¿Se pudo hacer desde la UI?: sí (alta de equipo); la verificación de permisos se hizo por API, como lo hace el front.

Bugs medios y bajos (QA3-006 a 011): filas en /workspace/hotclick-reportes/bugs-pendientes-media-baja-2026-10-23.md.

## Ronda 3 (24/10/2026 00:34–00:36 CR): aprobación + Asistente
- Admin de staging (rol ADMIN; credenciales no impresas): GET solicitudes-aprobacion 200, empresa 4 PENDIENTE_APROBACION. PUT /api/admin/solicitudes-aprobacion/4/aprobar -> 200 "Empresa aprobada" (00:34:51). Productos pendientes: 0 (no hizo falta aprobarlos). No se tocó la empresa 3 (QA 2).
- Asistente, como visitante anónimo (POST /api/public/chat, global y ?slug=qa-plus-prueba-3, mismos resultados):
| Pregunta | ¿Responde? | Productos | QA-TEST visible |
|---|---|---|---|
| Garantía y medidas del sofá | No: ofrece el producto y no dice garantía ni medidas | 1: QA-TEST Sofá 3 plazas gris (relacionado) | Sí |
| Algo cómodo para la sala | Parcial | 1: QA-TEST Alfombra sala (poco relacionado; había sofá, sillón, manta) | Sí |
| Envío a Cartago y costo | No: lo trata como búsqueda de producto, 0 resultados | 0 | No |
Evidencia: r3chat1..3.txt y r3chat*-tienda.txt. Bugs QA3-013 a 016 (Media/Baja) en el archivo de pendientes. Sin bugs críticos ni altos nuevos; siguen abiertos QA3-005 (Crítica) y QA3-012 (Alta).

## Ronda 4 (24/10/2026 00:37–00:39 CR): C4, C5, C6, N7 (sin registro ni cobro; QA3-005 pospuesto, N2–N6 fuera)
| Caso | Resultado | Hora CR |
|---|---|---|
| C4 logout | PASA: logout 200; el mismo access token pasa a 401; refresh con el refreshToken previo da 401 "Sesión inválida"; la cookie se borra (refresh sin cookie da 400) | 00:37:00 |
| C5 recuperar contraseña | PASA: forgot 200 (mensaje neutro), código llega a Mailpit, verify-code 200, reset 200; reusar el código da 400; contraseña vieja 401, nueva 200. La caducidad por tiempo NO se verificó (no se esperó el TTL); se verificó la invalidación por uso. Sin 429 | 00:37:13 |
| C6 2FA correo | PASA: enable y activate 200; el login pide 2FA (requires2fa, EMAIL_OTP); código incorrecto 401; con código correcto 200; reusar el código 401; disable con contraseña mala 401, con la buena 200; luego el login es directo. Ver QA3-018 (Baja) | 00:37:26 |
| C6 2FA TOTP | PASA parcial: setup, código incorrecto 400, activate 200 con 8 códigos de recuperación; el login pide TOTP; incorrecto 401, correcto 200; disable con código malo 401, con el bueno 200; estado final sin 2FA. **El login con código de recuperación y su reutilización NO se verificaron**: /2fa/verify respondió 429 y se paró sin reintentar | 00:37:39–00:38:14 |
| N7 EDITOR | Lista el equipo 200. Cambiar rol o eliminar al PROPIETARIO da 400 (lo frena la regla de negocio, no un 403). Endpoints /api/admin/* dan 403. Invitar sigue en QA3-012. **QA3-017**: se autoascendió a ADMIN (200). También cambia la visibilidad pública (QA3-019) | 00:38:37 |

### Bug alto nuevo
- **QA3-017 (Alta)**: el EDITOR se autoasciende con `PUT /api/empresa/equipo/1023/rol {"rolEnEmpresa":"ADMIN"}` y recibe 200 "Rol actualizado a ADMIN". Se esperaba 403 "Solo el emprendedor puede cambiar roles". Es una escalada de privilegios dentro del negocio. Mismo origen probable que QA3-012 (`isEmprendedor()` es verdadero para el EDITOR porque su rol global es EMPRENDEDOR), pero es otra acción con impacto propio. **Revertido** por el dueño a EDITOR a las 00:38:44 (equipo: 1018 PROPIETARIO, 1023 EDITOR). Evidencia: evidencia-http.log, entradas "N7 EDITOR se autoasciende a ADMIN" y "N7 dueño revierte".

Contraseña del dueño cambiada por el reset de C5 y actualizada en credenciales-internas.txt (600). 2FA quedó desactivado en la cuenta del dueño.
