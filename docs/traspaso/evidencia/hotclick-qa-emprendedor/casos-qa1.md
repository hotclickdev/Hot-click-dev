# QA 1 — Emprendedor — Casos de prueba (preparados 23/10/2026, 21:05 CR)
Estado: NO EJECUTADO — bloqueo: esperando URL de staging local (CI/CD).
Reglas: plan §0 (solo staging, ONVO sandbox `onvo_test_`, tarjeta 4242, todo desde la UI, sin datos reales, sin secretos en reportes).
Datos: cuentas `qa1+a@…`, `qa1+b@…` (+ `qa1+cliente@…` para E3); 5 productos ficticios con foto.

| ID | Caso | Pasos | Esperado | Evidencia a guardar | Resultado |
|---|---|---|---|---|---|
| E1-C1 | Registro correo nuevo | /registro → datos qa1+a → código → verificar | Cuenta activa, rol emprendedor tras /registrar-negocio | captura + respuesta register/verify (sin tokens) | pendiente |
| E1-C2 | Correo repetido | Registrar qa1+a otra vez | Mensaje claro en español, sin duplicado | captura | pendiente |
| E1-C3 | Reenviar código | Pedir reenvío, probar código viejo | Viejo inválido, nuevo válido | captura | pendiente |
| E1-C4 | Login/logout/refresh | Login → panel /emprendedor → logout → volver atrás | Panel correcto; sesión invalidada | capturas | pendiente |
| E1-C5 | Recuperar contraseña | /recuperar-contrasena → código → reset → login con vieja | Vieja rechazada; código caduca | capturas | pendiente |
| E1-C6 | Cambiar contraseña y 2FA | Activar 2FA correo y TOTP, recovery codes, desactivar | Login pide 2FA; desactivar funciona | capturas (sin secretos TOTP) | pendiente |
| E1-C7 | Textos | Revisar todas las pantallas | Español CR voseo, sin errores crudos | capturas | pendiente |
| E2 | Cupos /emprende | Ver contador antes/después de registrar qa1+b gratis | Contador baja en 1 | capturas antes/después | pendiente |
| E3 | Cliente → emprendedor | Cliente con compra previa hace upgrade | Conserva historial; obtiene ROLE_EMPRENDEDOR | capturas /mis-pedidos antes/después | pendiente (depende de compra QA4/QA5) |
| E4 | Onboarding por pasos | Avanzar a paso N, salir, volver | Retoma en el mismo paso | capturas | pendiente |
| E5 | Cupo agotado | Admin simula cupo agotado (UI admin) → registro → pago 4242 | Ofrece US$9/mes; pago sandbox pagado | id sandbox (sin llaves) | pendiente (requiere admin) |
| E6 | Productos CRUD | Crear 5, editar, stock, imágenes, despublicar | Visible en /emprendimientos/:slug y /productos/:id; despublicado oculto | capturas + URLs | pendiente |
| E7 | Comisión | Ver comisión en panel y configuración | 9% coherente con configuración | capturas | pendiente |
| E8 | Tienda rápida | Abrir /tienda-rapida/:token en incógnito | Catálogo correcto | captura | pendiente |
| E9 | Tilopay | Revisar pantallas de pago/plan | No aparece Tilopay (si aparece → bug) | captura | pendiente |
| E10 | Cierre | Cancelar suscripciones sandbox | Canceladas (ojo #256: posible 404) | id sandbox | pendiente |
Observación pendiente decisión Andrés: cupo al darse de baja.
