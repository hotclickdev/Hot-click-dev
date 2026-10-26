# QA 2 – Cuentas y Roles, plan PYME (área 2)
Fecha: 2026-10-26 12:47–12:48 (hora Costa Rica, UTC-6) · Backend local http://localhost:8081 · master f9f0e506 (código leído con git en f9f0e506; origin/master ya está en 580eb4976)
Cuentas: dueño qa2+pyme3@example.com (usuario 1017, PROPIETARIO, empresa 3) y qa2+cajero@example.com (usuario 1026, EDITOR). No hay LECTOR. No se crearon cuentas. Credenciales cargadas en variables, sin imprimirse. Los archivos temporales con tokens se borraron.

| # | Caso | Resultado |
|---|------|-----------|
| 1 | Login dueño y EDITOR | OK |
| 2 | EDITOR sin acceso a cobros/billing/plan/payout/métodos | FALLO **MEDIO** (las escrituras sí se bloquean, pero puede LEER) |
| 2b | GET /api/facturas como EDITOR | FALLO **BAJO** (500) |
| 3 | EDITOR no puede subirse de rol | OK |
| 4 | Correo normalizado | FALLO **BAJO** (los espacios dan 400) |
| – | LECTOR | NO CUBIERTO (no hay cuenta) |

## 1. Login: OK
POST /api/auth/login {correo, contrasena}: dueño → 200 (rol EMPRENDEDOR, empresaId 3), EDITOR → 200 (rol EMPRENDEDOR, empresaId 3, permisos []).
Nota: el primer intento dio 429 ("Demasiados intentos") por el límite de intentos compartido. Pasó después de esperar 90 s.

## 2. Accesos del EDITOR a cobros y billing: MEDIO
Escrituras bloqueadas, como se espera:
- PUT /api/billing/preferencias → 403 "Solo el propietario del negocio puede hacer esto."
- POST /api/billing/cambiar-plan/999999 → 403
- POST /api/billing/checkout/999999 → 403
- PUT /api/metodos-cobro/999999/predeterminado → 403
- POST /api/wallet/payout {} → 403 "Acceso denegado"

Lecturas permitidas (se esperaba 401 o 403):
- GET /api/billing/suscripcion → 200 (estado y plan)
- GET /api/billing/facturas → 200
- GET /api/billing/preferencias → 200 (diaCobro, frecuenciaPayout, contraEntrega…)
- GET /api/metodos-cobro → 200 (lista de cuentas de cobro; hoy vacía, pero el endpoint expone datos bancarios cuando existan)
- GET /api/wallet/payouts → 200
- GET /api/admin/pagos → 200
- GET /api/billing/plan-pendiente y /tilopay/pendiente → 204

Causa probable: los miembros del equipo llevan el rol de Spring EMPRENDEDOR, y estos GET solo exigen hasAnyRole('EMPRENDEDOR','ADMIN'), sin PropietarioGuard. Es el mismo patrón que QA3-012.

No concluyente: POST /api/metodos-cobro {} y PUT /api/metodos-cobro/999999 {} → 400 por validación del body antes de la autorización. No envié un body válido para no crear un método de cobro real.
No ejecutado: POST /api/billing/cancelar y /portal, para no arriesgar la suscripción.

## 2b. GET /api/facturas (EDITOR) → 500 "Error interno del servidor": BAJO
No da acceso, pero debería ser 403 controlado. El dueño no se probó en este endpoint.

## 3. Subir de rol: OK
- PUT /api/empresa/equipo/1026/rol {rolEnEmpresa: ADMIN} → 403 "Solo el emprendedor puede cambiar roles"
- PUT …/1026/rol {EDITOR} → 403. PUT …/1017/rol (al dueño) → 403
- Verificado con el dueño, GET /api/empresa/equipo → 1017 PROPIETARIO, 1026 EDITOR (sin cambios)

## 4. Correo normalizado: BAJO
- "QA2+CAJERO@EXAMPLE.COM" → 200, correo devuelto en minúsculas: OK
- "  qa2+cajero@example.com  " → 400 "correo: Correo inválido"
- "  QA2+Cajero@Example.COM " → 400 "correo: Correo inválido"
Las mayúsculas se normalizan, pero los espacios alrededor no: la validación @Email rechaza el correo antes del trim.

## Otros
- El EDITOR puede ver la lista del equipo: GET /api/empresa/equipo → 200 (lista correos y roles). Es lectura de equipo, se deja como información.
- En el worktree no se pudo crear uno nuevo porque /tmp está lleno ("No space left on device"); se usó git show/grep sobre f9f0e506. No se tocaron los procesos de staging ni se usó pkill.
