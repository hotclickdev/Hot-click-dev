# QA1 · Área 2 Cuentas y Roles · plan Emprendedor · 2026-10-26
Commit probado (revisión de código): master d552ab88d3b2ba07d307b8104a080ec41155844e (merge PR #324, 2026-10-26 12:09 CR). Clon: /workspace/qa1-master.
Alcance: por indicación de Grok Bot (12:15 CR) solo revisión de código; las pruebas HTTP/UI quedan PENDIENTES (staging caído, lo levanta CI/CD). Un backend propio que había empezado a arrancar en :8091 se detuvo y su base qa1_r4 se borró; no se creó ningún dato.

| Caso | Estado | Severidad | Evidencia (código) |
|---|---|---|---|
| 1 Login dueño (OK / clave mala / inexistente) | PENDIENTE HTTP. Código: OK | — | AuthCredentialLoginHandler: un solo mensaje "Credenciales inválidas" (L36, L97, L115) para clave mala y para cuenta inexistente |
| 2 Normalización de correo | PENDIENTE HTTP. Código: OK | — | CorreoNormalizer = trim()+toLowerCase(ROOT); se usa en el login (L62), en AuthRegistrationService L57, en EmprendedorRegistroService L58/L107 (con existsByCorreo para no duplicar) y en la invitación del equipo (EquipoController) |
| 3a ¿Emprendedor permite equipo? | Sí, limitado | — | V89: EMPRENDEDOR max_usuarios=2 (dueño + 1). EquipoService.invitar → verificarLimiteUsuariosEquipo. No se pueden tener LECTOR y EDITOR a la vez: hay que probarlos uno por uno (invitar, probar, quitar, invitar el otro). Que la 2.ª invitación se rechace es esperado |
| 3b Escrituras de billing y cobros, EDITOR/LECTOR | Código: OK | — | puedeGestionarEmpresa (solo el PROPIETARIO, sin impersonación) en: billing/trial, /portal, /cancelar, /cambiar-plan y /checkout (que delega en cambiar-plan); metodos-cobro POST/PUT; billing/preferencias PUT; equipo POST/PUT/DELETE. LectorSoloLecturaInterceptor: 403 a cualquier escritura del LECTOR |
| 3c Lecturas de billing y cobros, EDITOR/LECTOR | FALLO (posible) | MEDIO | GET /api/billing/suscripcion, /facturas, /tilopay/pendiente, /plan-pendiente y /preferencias solo piden hasRole EMPRENDEDOR. GET /api/metodos-cobro no tiene ningún guard. Los miembros llevan rol Spring EMPRENDEDOR (RolMembresia.paraJwt), así que EDITOR y LECTOR los leen con 200 y no con el 403 esperado |
| 3d POST /api/billing/tilopay/confirmar/{orderNumber} | FALLO (posible) | BAJO | No llama a puedeGestionarEmpresa: un EDITOR puede confirmar un cobro pendiente del negocio. No cobra nada nuevo, pero se sale de la regla de "solo el dueño" |
| 3e LECTOR no edita productos / EDITOR sí | Código: OK | — | Productos: hasAnyRole ADMIN/EMPRENDEDOR (EDITOR pasa). El LECTOR recibe 403 del interceptor en POST/PUT/PATCH/DELETE |
| UI: rutas de cobros/billing ocultas para miembros | PENDIENTE | — | No revisado (sin staging) |

Pasos HTTP pendientes (cuando el staging esté arriba): login del dueño qa1+...@example.com con la clave correcta, con una mala y con un correo inexistente (comparar los mensajes); login con ' QA1+Norm@Example.com ' y luego registro con la misma variante (esperado: rechazo por duplicado); invitar EDITOR → probar GET/POST billing, metodos-cobro y PUT producto → quitarlo → invitar LECTOR → repetir; además una 2.ª invitación simultánea (esperado: rechazo por límite).
Riesgo: si el negocio quiere que los miembros ni siquiera vean billing y métodos de cobro, 3c es real. Arreglo sugerido: poner puedeGestionarEmpresa (o una anotación propia) también en esos GET.
