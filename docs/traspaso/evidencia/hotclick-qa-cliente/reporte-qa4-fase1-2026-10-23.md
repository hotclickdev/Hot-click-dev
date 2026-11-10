# QA 4 Cliente — Fase 1 (23/10/2026, hora CR) — staging local master 43188186
Tarea | Estado | Hecho | Evidencia | Archivos | Riesgos | Bloqueos | Siguiente paso
QA4 Fase 1 | Parcial / bloqueado en registro | K2 pasó, K7 invitado pasó, K6 falla parcial, C1/C2 bloqueados (400 en send-verification), login no verificado OK | evidencia/ | este archivo, evidencia/*.png | backend 8080 se cayó 21:10–21:11 (502) | C1 bloquea K1,K3,K4,K5 y Persona 1/2 para QA 5 | dev diagnostica 400; luego repetir C1–C6

## Resultados
- K2 invitado (21:08): PASÓ. /productos, /categorias, /buscar/foto, /tiendas/san-jose cargan sin errores crudos.
- K6 cookies (21:09): FALLA PARCIAL. Ver QA4-002 y QA4-003. Preferencias persisten tras recargar.
- K7 invitado (21:09): PASÓ. /pyme, /admin, /emprendedor, /perfil, /mis-pedidos redirigen a /login?redirect=. Solo hay captura de /mis-pedidos.
- C1 registro (21:10–21:12): BLOQUEADO. Ver QA4-001. Mailpit 0 mensajes.
- C2 duplicado: BLOQUEADO (no existe cuenta).
- Login no verificado (21:12): PASÓ. 401 "Credenciales inválidas", no revela existencia.
- C3–C6, K3, K4, K5, K7 autenticado: BLOQUEADOS por C1.
- Tilopay: no se vio en ninguna pantalla.

## Bugs
ID: QA4-001  Título: Registro de cliente falla siempre con 400 en /api/auth/send-verification y mensaje genérico
Rol/cuenta: invitado   Ruta: /registro
Pasos: 1. Abrir /registro 2. Completar nombre, apellido, correo, teléfono +506, identificación, contraseña (datos ficticios) 3. Enviar
Esperado: se envía código y se muestra pantalla de verificación
Obtenido: 400 "No se pudo enviar el código. Revisá tus datos e intentá de nuevo." en todas las combinaciones; un 502 durante caída del backend
Evidencia: C1-persona1-error-no-se-pudo-enviar-codigo-telefono-vacio.png, C1-persona1-error-al-enviar-codigo-502.png, C1-persona2-error-no-se-pudo-enviar-codigo.png; 21:10–21:12 CR
Severidad: Crítica (bloquea flujo)   ¿Desde UI?: no, no se puede crear la cuenta

ID: QA4-002  Título: Cookies de "Análisis" activadas por defecto sin consentimiento
Rol: invitado   Ruta: pie > Preferencias de cookies
Pasos: 1. Entrar al home 2. Abrir Preferencias de cookies
Esperado: solo esenciales hasta que el usuario autorice
Obtenido: Análisis activado por defecto (opt-out); banner de cookies en DOM pero no visible, tapado por el modal de cupón
Evidencia: K6-preferencias-cookies-analisis-activado-por-defecto.png, K6-home-sin-banner-cookies-solo-cupon.png; 21:09 CR
Severidad: Alta (consentimiento)   ¿Desde UI?: sí

ID: QA4-003  Título: Textos: error genérico sin campo, "usted" en cookies, aria-label en inglés, títulos en mayúsculas, /api/public/branding 404
Ruta: /registro, /login, preferencias cookies   Evidencia: C7-mensaje-error-generico-sin-detalle.png
Severidad: Baja (Media para el error sin campo)   ¿Desde UI?: sí

## Actualización 21:18 CR
QA4-001 reabierto, responsable QA 4. Causa según CI/CD: en una base nueva falta cargar el tipo de código de verificación REGISTRO. No es duplicado de QA1-002. El fix va a una rama. Se reintenta solo cuando Grok Bot avise.
