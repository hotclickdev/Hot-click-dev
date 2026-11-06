# Fase 1: auditoría de Cuentas y Roles (Auditor 2)
- Commit auditado: master `aa907776` (merge del PR #279). Antes se había auditado `0c295646`; en `src/main/java` cambiaron 17 archivos. Los que tocan esta parte (EquipoController, PropietarioGuard, AuthVerificationHandler, CheckoutValidator) se revisaron. **El código del login no cambió.**
- Modo: solo lectura. Contra prod se hizo una sola petición: `POST /api/auth/login` con cuerpo `{}`. Respondió HTTP 400 `{"success":false,"message":"contrasena: La contraseña es obligatoria; correo: El correo es obligatorio",...}`. No se probaron credenciales.
- Las rutas son relativas a `Hot_click_outlet/src/main/java/com/hotclick/`. Se omiten correos, teléfonos y claves.
- Conteo: **ALTO 3 · MEDIO 4 · BAJO 2**

## Conclusión sobre el 401 de la cuenta de prueba cliente
El 401 solo sale de dos ramas. Una es `user_not_found`, en `service/auth/AuthCredentialLoginHandler.java:62-64` y `:92-97`. La otra es `wrong_password`, en `:109-114`. Las cuentas bloqueadas o inactivas responden 403, no 401 (`:105` y `:117-127`). Si falla Turnstile, la respuesta es 400 (`:59-60`).
- **El hash no es la causa (verificado):** solo hay un encoder, `BCryptPasswordEncoder(cost)`, en `security/config/SecurityConfig.java:91-92`. No hay pepper, ni prefijo, ni DelegatingPasswordEncoder, ni doble hash. Todos los que crean usuarios llaman a `passwordEncoder.encode(...)`. Los hashes literales en SQL (`$2b$10$placeholder` y `$2a$12$AAAA…`) son inutilizables a propósito.
- **Causa más probable, en orden:**
  1. **El correo no coincide exacto (verificado en el código).** El login busca con `WHERE u.correo = :correo` (`repository/UsuarioRepository.java:18-19`) y no aplica trim ni lowercase al correo recibido. En cambio, el registro guarda `trim().toLowerCase()` (`service/auth/AuthRegistrationService.java:56`). Si el teclado del celular pone mayúscula inicial o un espacio al final, el resultado es `user_not_found` y 401.
  2. **La cuenta "cliente" se creó por un camino que pone una contraseña aleatoria.** Pasa con la compra de invitado (`service/payment/GuestUserResolver.java:23,33-36`, con UUID aleatorio), con Clerk/Google (`service/auth/ClerkSyncService.java:101,110`), con "Asignar cliente" del vendedor (`controller/AdminAsignarController.java:115,118`) y con el mostrador POS. Esa cuenta nunca tuvo la contraseña "conocida". Hay que tomar en cuenta además que **ningún seeder crea una cuenta de prueba cliente.** `config/QaCuentasSeeder.java:88-93` solo crea cuentas de emprendedor, PYME y Negocio Plus, y solo con el perfil dev (`:37`).
  3. Que la contraseña real sea distinta. No se verificó, porque no se prueban credenciales.
- **Cómo confirmarlo sin tocar datos (lo hace un Dev o Andrés):** buscar en los logs de prod el evento de auditoría de `logLoginFailed` para ese intento. Si el motivo es `user_not_found`, la causa es la 1. Si es `wrong_password`, es la 2 o la 3. Para separar esas dos, revisar en la BD (solo lectura) el `identificacion` del usuario: `GUEST-…`, `CL…` y `HC-…` indican una contraseña aleatoria.

## 1. CORRECCIONES

### A1 · ALTO · C1 · El login no normaliza el correo
- **Archivos:** `service/auth/AuthCredentialLoginHandler.java:62` y `repository/UsuarioRepository.java:18-19`.
- **Cómo reproducir:** registrar `x@dominio.com` y luego intentar entrar con `X@dominio.com` o con `x@dominio.com ` (espacio al final). La respuesta es 401 "Credenciales inválidas".
- **Corrección propuesta:** normalizar con `correo.trim().toLowerCase(Locale.ROOT)` en el login (y en recuperar contraseña y OTP), y buscar con `LOWER(u.correo) = :correo`. Prueba que lo reproduce: login con mayúsculas y con espacio debe dar 200.
- **Evidencia:** `@Query("... WHERE u.correo = :correo")` frente a `usuario.setCorreo(req.getCorreo().trim().toLowerCase())` en AuthRegistrationService:56.

### A2 · ALTO · C5 · Los roles de equipo no se aplican: LECTOR y EDITOR tienen los mismos permisos de escritura que el dueño
- **Archivos:** `service/auth/RolMembresia.java:20-21`, `controller/EquipoController.java:25` y `security/config/SecurityAuthorizationRules.java` (reglas `hasAnyRole(ADMIN, EMPRENDEDOR)`, por ejemplo `/api/metodos-cobro` en las líneas 158-161 del archivo).
- **Qué pasa:** cualquier membresía se convierte en el rol Spring `EMPRENDEDOR`. En `src/main/java`, fuera de los correos, `LECTOR` no aparece en ningún chequeo. Solo 5 controladores usan `PropietarioGuard`: Equipo, EmpresaPerfil, Wallet, AdminReset y Suscripcion.
- **Cómo reproducir:** invitar a un LECTOR. Con su token, hacer `POST /api/metodos-cobro` o `PUT /api/metodos-cobro/{id}` (cambio de la cuenta de cobro), o crear o editar productos o pedidos. El resultado esperado es 2xx. No se ejecutó: la conclusión sale de leer el código. `service/MetodoCobroService.java:78-82` solo valida `companyScope.assertCanAccess(empresa)`, que comprueba el tenant y no el rol.
- **Corrección propuesta:** sacar `rolEnEmpresa` al JWT o a la autoridad (por ejemplo `EMPRESA_LECTOR`, `EMPRESA_EDITOR` o `EMPRESA_PROPIETARIO`). Luego: (a) un filtro o aspecto que niegue POST, PUT, PATCH y DELETE a LECTOR, y (b) `puedeGestionarEmpresa` en los métodos de cobro, el wallet, el plan, los datos fiscales y el equipo.
- **Evidencia:** `if (membresia != null) { return Constants.ROL_EMPRENDEDOR; }`.

### A3 · ALTO · C5 · No existe el rol "cajero" ni una matriz de pruebas de permisos
- **Archivos:** `controller/EquipoController.java:25` (`Set.of("EDITOR","LECTOR","ADMIN")`). Las pruebas actuales son `src/test/.../IDORCrosstenantAttackTest.java`, `EmprendedorEquipoTest.java` y `PropietarioWalletGuardTest.java`.
- **Qué pasa:** el plan exige probar dueño, admin, EDITOR, cajero y comprador. No hay un rol CAJERO que se pueda asignar (CAJERO solo aparece en el código de POS/QR), así que el criterio C5 no se puede cumplir. Tampoco hay una suite parametrizada de rol × endpoint.
- **Corrección propuesta:** decidir si el cajero será un rol de equipo (POS y turno de caja sí; productos, cobros y equipo no). Agregarlo a `ROLES_PERMITIDOS` y a A2. Crear `RolesMatrizTest` (MockMvc) con los 5 perfiles × endpoints críticos (productos, pedidos, métodos de cobro, equipo, plan, reset, POS, compra del comprador), con su 200 o 403 esperado, y sumarlo a CI.

### M1 · MEDIO · C1 · Los usuarios creados por otros caminos no normalizan el correo y pueden quedar duplicados por mayúsculas
- **Archivos:** `service/payment/GuestUserResolver.java:23,33` (con `CheckoutValidator.java:64-71`, que pasa `guestEmail` tal cual), `controller/AdminAsignarController.java:83,115` (solo hace trim), `service/auth/ClerkSyncService.java:61,101`, y la migración `V15__soft_delete_correo_unico.sql:15` (el índice único es sobre `correo`, no sobre `lower(correo)`).
- **Cómo reproducir:** hacer una compra de invitado con `Cliente@x.com`. Se crea un usuario nuevo con mayúscula, distinto de `cliente@x.com`. Al registrarse luego en minúsculas, la persona queda con dos cuentas y el historial de pedidos dividido.
- **Corrección propuesta:** un normalizador único `CorreoNormalizer` usado en todos los `setCorreo` y `findByCorreo`. Una migración que normalice los datos (revisar colisiones antes, en solo lectura) y cree el índice único `lower(correo)`.

### M2 · MEDIO · C1 · Las cuentas con contraseña aleatoria (invitado, Clerk, asignada) reciben 401 sin ninguna pista
- **Archivo:** `service/auth/AuthCredentialLoginHandler.java:109-114`.
- **Cómo reproducir:** comprar como invitado y luego intentar entrar con el mismo correo. La respuesta es 401.
- **Corrección propuesta:** marcar estas cuentas (por ejemplo `sinContrasenaPropia=true`). En el login, si coincide el correo, no revelar que la cuenta existe y mandar por correo un enlace de "crear contraseña". En el front, ofrecer "¿Compraste como invitado? Creá tu contraseña".

### M3 · MEDIO · C4 · Una persona autenticada puede leer la afinidad de otro visitante
- **Archivo:** `controller/CustomerMemoryController.java:31-36`.
- **Qué pasa:** `GET /api/customer-memory/affinity?visitorId=` no comprueba que el visitorId sea del usuario. El riesgo es bajo porque el ID es un UUID, pero es un IDOR. Además `getOrCreate` crea registros.
- **Corrección propuesta:** derivar el visitorId de la sesión o validar que pertenezca al usuario.

### M4 · MEDIO · C2 · No hay pruebas de regresión del login con mayúsculas ni de los caminos de creación de usuario
- **Archivo:** `src/test/.../AuthIntegrationTest.java`.
- **Corrección propuesta:** pruebas de login con mayúsculas y espacios, de usuario invitado y luego login, y de usuario Clerk y luego login con contraseña.

### B1 · BAJO · C1 · El campo de contraseña tiene un mínimo distinto en login y en registro
- **Archivos:** `dto/JwtRequest.java:15` (mínimo 6) y `dto/RegisterRequest.java` (mínimo 8).
- **Corrección propuesta:** usar 8 en los dos o quitar el mínimo del login, para que el usuario vea "Credenciales inválidas" de forma consistente.

### B2 · BAJO · C4 · Los logs incluyen el correo en claro
- **Archivo:** `service/auth/AuthCredentialLoginHandler.java:103,135`. Ejemplo: `log.warn("Login bloqueado para {}", correo)`.
- **Corrección propuesta:** enmascarar el correo (por ejemplo `a***@dominio`) o loguear solo el `usuarioId`.

## 2. MEJORAS
| # | Cambio | Impacto | Esfuerzo | Archivos | Cambio propuesto |
|---|---|---|---|---|---|
| 1 | Normalización central del correo | Elimina la mayoría de los 401 "misteriosos" | Bajo | UsuarioRepository, AuthCredentialLoginHandler, GuestUserResolver, ClerkSyncService, AdminAsignarController, PasswordResetService | `CorreoNormalizer.normalizar()` y consultas con LOWER |
| 2 | Front: trim y lowercase antes de enviar, con `autocapitalize="none"` e `inputmode="email"` | Menos errores en el celular | Bajo | `frontend/src/services/authService.ts:6` y el formulario de login | Normalizar en el cliente además del servidor |
| 3 | Autoridades por rol de empresa en el JWT | Base para C5 y para la interfaz por rol | Medio | RolMembresia, JwtUtil, CompanyScope | Claim `rolEmpresa` y autoridad `EMPRESA_<ROL>` |
| 4 | Ocultar en el front las acciones según el rol (LECTOR sin botones de editar) | Mejor UX y menos 403 | Medio | Panel admin del front | Leer `rolEmpresa` del token |
| 5 | Mensaje de login más útil sin enumerar cuentas | Menos soporte | Bajo | AuthCredentialLoginHandler y la pantalla de login | "Revisá el correo o recuperá tu contraseña", con enlace directo |
| 6 | Matriz de permisos e2e en Playwright (Fase 3) | Cumple C5 con evidencia | Medio | qa-automation | Los 5 perfiles iniciando sesión, con capturas del 403 o el 200 |

## No verificado
- La causa exacta del 401 en prod: requiere logs o BD en solo lectura, según los pasos de arriba.
- A2: el acceso de LECTOR a la escritura se dedujo del código; no se probó en ningún entorno.
