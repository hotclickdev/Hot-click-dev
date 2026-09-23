# Auditoría de seguridad — 2026-09-23

Contexto para retomar este trabajo desde otra herramienta (Cursor, u otro
agente). Resume qué se auditó, qué se encontró, qué se corrigió y qué queda
pendiente. No reemplaza los reportes previos (`SECURITY_REVIEW_F29.md`,
`AUDITORIA_TECNICA.md`, etc.) — los complementa con lo nuevo de esta sesión.

## Alcance de la auditoría

Se pidió una auditoría agresiva de seguridad/abuso sobre hotclick.lat
(backend Spring Boot en `Hot_click_outlet/`, frontend React en
`Hot_click_outlet/frontend/`). Se descartó explícitamente cualquier ataque de
carga real contra producción (2000 requests simultáneos, etc. — eso es DoS,
no auditoría) y en su lugar se hizo:

1. Resumen de auditorías previas ya documentadas en el repo (para no
   duplicar trabajo).
2. 6 revisiones de código en paralelo por área: rate limiting / cupo IA,
   spam en endpoints públicos, inyección/XSS/mass-assignment/IDOR, manejo de
   errores y timeouts HTTP, aislamiento multi-tenant, secretos/CORS/headers.
3. Corrección de los hallazgos accionables.
4. Verificación: compilación backend + build frontend + suite de tests.

## Hallazgos y su estado

### 🔴 Crítico — corregido

**1. `FacturaController.emitir` sin chequeo de tenant.**
`POST /api/facturas/emitir/{pedidoId}` no verificaba que el pedido
perteneciera a la empresa del usuario autenticado. Un ADMIN/EMPRENDEDOR/
CONTABILIDAD de la Empresa A podía forzar la emisión de una factura
electrónica a Hacienda por un pedido de la Empresa B, y recibía en la
respuesta los datos del pedido/cliente ajeno.
- Fix: `FacturacionService.emitir()` ahora llama
  `companyScope.assertCanAccessNullable(pedido.getEmpresaId())` antes de
  invocar `emisionSupport.emitir(...)`.
- Archivos: `service/FacturacionService.java`.

**2. `POST /api/pedidos` aceptaba precios y empresa arbitrarios del cliente.**
El endpoint crudo (`PedidoController.crearPedido`) solo exigía estar
autenticado (cualquier rol, incluido cliente final) y guardaba el `Pedido`
tal cual llegaba del JSON — precios, totales y hasta la empresa (`fk_id_
empresa`) los decidía el cliente. Se confirmó que el frontend real de
checkout NO usa este endpoint (usa `/api/tienda/{slug}/pedido` y
`/api/qr/{token}/pedido`), así que era superficie muerta pero explotable
directamente por API.
- Fix: restringido a `ADMIN`/`EMPRENDEDOR`; la empresa se toma del scope del
  usuario (`companyScope.getCurrentEmpresaIdOrOwn()`), nunca del body; los
  precios/costos/totales se recalculan siempre desde `ProductoRepository`
  (`recalcularDesdeCatalogo()`), ignorando lo que mande el cliente.
- Archivos: `controller/PedidoController.java`.

### 🟠 Alto — corregido

**3. Sin timeout HTTP en 3 servicios que llaman APIs externas.**
`GeminiService` (análisis de imágenes vía Claude), `VoyageEmbeddingService`
(embeddings para RAG) y `BccrService` (tipo de cambio) usaban `new
RestTemplate()` sin timeout — si la API externa no responde, el thread de
Tomcat que atiende ese request queda bloqueado indefinidamente. Con ~30-50
requests concurrentes se agota el pool y el sitio entero deja de responder
para todos los usuarios, no solo para esa función.
- Fix: los tres ahora inyectan el bean `RestTemplate` compartido de
  `WebConfig` (ya tenía 10s conexión / 30s lectura, solo no se usaba en
  estos tres puntos).
- Archivos: `service/GeminiService.java`,
  `rag/service/impl/VoyageEmbeddingService.java`, `service/BccrService.java`.

**4. Email bombing vía carrito abandonado.**
`POST /api/cart/abandoned` es público (sin auth), acepta cualquier `email`
de un tercero junto a un `sessionId` propio, sin rate limit ni dedupe. El
scheduler (`CarritoAbandonadoScheduler`, cada 6h) manda un email de
recuperación por cada carrito PENDIENTE con email — un atacante podía crear
N carritos falsos con el email de una víctima y usar la infraestructura de
SendGrid del negocio para floodear su bandeja. Además, el DTO tenía
`@Email`/`@Size` pero el controller nunca llamaba `@Valid`, así que esas
validaciones nunca se ejecutaban.
- Fix: tope de 3 carritos/sesiones distintas por email en 24h
  (`CarritoAbandonadoService.puedeAsociarEmail()` — si se supera, el
  carrito se guarda igual pero sin asociar el email, no dispara otro
  correo); rate limit de 10/60s por IP en el endpoint; `@Valid` agregado al
  controller.
- Archivos: `service/CarritoAbandonadoService.java`,
  `controller/CarritoAbandonadoController.java`,
  `security/RateLimitingFilter.java`,
  `repository/CarritoAbandonadoRepository.java`.

**5. Sin límite de tamaño en bodies JSON.**
Solo había límite para multipart (`spring.servlet.multipart.max-file-
size=30MB`); cualquier endpoint público podía recibir un JSON de varios MB
sin rechazo.
- Fix: nuevo filtro `MaxRequestBodySizeFilter` (2MB, no aplica a multipart)
  registrado en `SecurityConfig`. Limitación conocida: solo chequea el
  header `Content-Length`, no cubre `Transfer-Encoding: chunked` sin ese
  header — es defensa en profundidad, no una garantía absoluta.
- Archivos: `security/MaxRequestBodySizeFilter.java` (nuevo),
  `security/config/SecurityConfig.java`.

**6. JWT sin forma de revocar un access token ya emitido.**
Los tokens no tenían `jti`; un access token robado seguía siendo válido
hasta expirar (15 min) sin forma de invalidarlo. Peor: se confirmó que
`AuthPasswordChangeHandler` decía en un comentario "revocar todos los
refresh tokens" pero el código solo revocaba el que venía en el body (bug
real, no hacía lo que decía) y `PasswordResetService.cambiarContrasena`
(flujo de "olvidé mi contraseña") **no revocaba ninguna sesión existente**
— si la cuenta estaba comprometida con una sesión abierta, resetear la
contraseña no la cerraba.
- Fix (sin rediseñar a `jti` + tabla de revocación individual, que es mucho
  más invasivo): nuevo campo `sesiones_invalidadas_en` en
  `hot_click_usuario_tb`. Cualquier access token con `iat` anterior a ese
  timestamp se trata como revocado en `JwtRequestFilter`, aunque no haya
  expirado (efectivo en ≤30s, por el TTL de la cache de `UserDetails`). Se
  dispara en cambio de contraseña y en reset por OTP. Se corrigió también
  el bug de refresh tokens (`RefreshTokenService.revocarTodos()` nuevo,
  reemplaza el `revocar(un solo token)` que había).
- Archivos: migración `V133__usuario_sesiones_invalidadas.sql`,
  `model/Usuario.java`, `security/JwtUtil.java` (`extractIssuedAt`),
  `security/HotclickUserDetails.java` (nuevo),
  `service/CustomUserDetailsService.java`, `security/JwtRequestFilter.java`,
  `service/UsuarioService.java` (`invalidarSesiones`),
  `service/RefreshTokenService.java` (`revocarTodos`),
  `service/auth/AuthPasswordChangeHandler.java`,
  `service/PasswordResetService.java`.
  Frontend: `PanelCambiarContrasena.tsx` (admin) no hacía logout tras
  cambiar contraseña, a diferencia del modal de perfil — con la revocación
  real funcionando esto se hubiera roto silenciosamente, así que se alineó
  con el mismo comportamiento (`logout()` + redirect a `/login`).

**7. Registro de clientes sin CAPTCHA.**
El endpoint `POST /api/auth/register` (que sí tenía protección planeada)
resultó ser código muerto — el frontend real usa
`POST /api/auth/send-verification` → `POST /api/auth/verify-registration`,
que no tenía ningún CAPTCHA.
- Fix: Turnstile (mismo servicio que ya usa login y registro de empresa)
  agregado a `send-verification`, vía header `X-Turnstile-Token` (no se
  pudo meter en el body porque el endpoint bindea `@RequestBody Usuario`
  directo — un DTO de Usuario no tiene ese campo y Jackson lo hubiera
  ignorado). También se agregó (por consistencia, aunque el endpoint esté
  muerto) al `/register` viejo.
- Archivos backend: `dto/RegisterRequest.java`,
  `controller/AuthController.java`,
  `service/auth/AuthRegistrationService.java`,
  `service/auth/AuthLoginService.java`,
  `service/auth/AuthVerificationHandler.java`,
  `security/config/SecurityConfig.java` (header `X-Turnstile-Token` en
  CORS `Allowed-Headers`).
  Frontend: `services/authService.ts`, `pages/auth/useRegisterFlow.ts`,
  `pages/RegisterPage.tsx`, `pages/auth/RegisterFormStep.tsx` (widget
  invisible, mismo patrón que `EmprendimientoPasoCuenta.tsx`).

### 🟡 Medio — revisado, sin cambio de código

- **CORS con `localhost` en el default de `application.properties`**: ya
  hay un `ProductionConfigValidator` que loguea WARNING si detecta
  `localhost` en `CORS_ALLOWED_ORIGINS` en producción, y `.env.example` ya
  trae solo `https://hotclick.lat`. `allowCredentials(false)` limita el
  impacto real. Riesgo residual bajo, se dejó así.
- **Rate limiter fixed-window** (permite ráfagas 2x en el borde de la
  ventana): impacto bajo hoy porque el storage ya es compartido en
  Postgres (no in-memory como se creía inicialmente) y no hay despliegue
  multi-pod real en producción (EC2 single instance).

### ✅ Ya estaba bien (confirmado, no se tocó)

Inyección SQL/JPQL (prepared statements en todos los `@Query`), XSS
almacenado (Jsoup allowlist + DOMPurify en frontend), mass assignment (DTOs
acotados + `ProductoRequestSanitizer`), IDOR (`PedidoAccessGuard`,
`ProductoAccessGuard`, `CompanyScope` consistente en ~38 controllers),
secretos (nada hardcodeado, `.env.example` limpio), headers de seguridad
(CSP/HSTS/X-Frame-Options completos), dependencias (Spring Boot 3.4.4,
React 19, todo actualizado), manejo de errores (sin fuga de stack traces,
`@Valid` en 18 controllers, logs sin datos sensibles).

## Bug de infraestructura encontrado y corregido (no es de seguridad de app)

`C:\Users\pmdan\Hot-click-dev\.gitignore` tenía `*.jar` sin excepción, lo
que significa que **los ~77 jars de `maven/lib/` y `maven/boot/` nunca se
subieron a git** — cualquiera que clonara el repo se encontraba con un
Maven roto (`Could not find or load main class
org.codehaus.plexus.classworlds.launcher.Launcher`). Se corrigió agregando
`!maven/**/*.jar` al `.gitignore` y se agregaron los jars a git (`git add`,
sin commitear todavía en el momento de escribir esto).

## Verificación

- **Backend**: compila limpio (`mvn compile`, las 24 clases tocadas
  confirmadas en `target/classes/`).
- **Frontend**: `pnpm build` limpio — TypeScript (3 tsconfig) y Vite sin
  errores. Los archivos hasheados en `src/main/resources/static/assets/`
  fueron regenerados por este build (es el output que sirve Spring Boot en
  producción — **hace falta este build antes de cualquier deploy**, por
  regla del propio `CLAUDE.md` del proyecto).
- **Tests**: suite completa corrida con perfil `test` (H2 in-memory, sin
  Docker/red). Ver resultado abajo — completar tras la corrida.

**Resultado de tests: BUILD SUCCESS — 846 tests, 0 failures, 0 errors, 15
skipped** (skips preexistentes no relacionados: `IdorSuiteGapStubsTest`
—stubs placeholder—, `EmprendedorEquipoTest`, `EmprendedorPerfilTest`). Sin
regresiones en ningún test relacionado con los cambios (`PedidoServiceTest`,
`PedidoAuthorizationTest` —cubre la restricción de roles nueva en
`crearPedido`—, `JwtUtilTest`, `RefreshTokenServiceTest`,
`UsuarioServiceLockoutTest`, `AuthSupportPermisosTest`).

**Gap de cobertura detectado** (no bloqueante, pero vale la pena cerrarlo
después): no hay tests dedicados para `FacturacionService.emitir()` (el
nuevo tenant check crítico), `CarritoAbandonadoService`/`Controller` (tope
de emails), `RateLimitingFilter`, `MaxRequestBodySizeFilter`,
`AuthPasswordChangeHandler`, `PasswordResetService`,
`AuthVerificationHandler` ni `AuthRegistrationService`. Los cambios están
verificados por compilación + revisión manual, no por test automatizado.

## Qué falta (no se tocó, requiere decisión de negocio o más alcance)

- Rate limiter sigue siendo fixed-window (no sliding/token-bucket) —
  aceptado como riesgo bajo dado el contexto actual.
- No se auditaron en detalle `TicketSoporteController`,
  `CotizacionController`, `PremioController`, `MesaController`,
  `TurnoCajaController` para tenant isolation (el agente que auditó
  aislamiento multi-tenant no llegó a esos por presupuesto de tarea).
- `AdminUsuarioController` (cambio de rol) y DTOs de `CotizacionController`
  no se revisaron en detalle para mass assignment.
- `sendVerification` sigue bindeando `@RequestBody Usuario` directo (mass
  assignment potencial de campos del entity que Jackson ignore-unknown no
  cubre si algún día se agrega un campo con el mismo nombre en `Usuario`) —
  funcionalmente no explotable hoy porque `EmailVerificationService.
  iniciarRegistro` no persiste el usuario tal cual, pero es un patrón
  fragil que convendría migrar a un DTO acotado en algún momento.

## Deploy pendiente

Este documento se escribió ANTES del deploy a producción. Falta:
1. Confirmar que la suite de tests pasó sin regresiones.
2. Commit de todo lo listado arriba (más el fix de `.gitignore` + jars de
   Maven).
3. Deploy manual a EC2 según el proceso documentado en `CLAUDE.md` (SSH,
   `git pull`, `docker build` de `app` — el build del frontend ya está
   hecho, pero el proceso de deploy en CLAUDE.md asume correrlo de nuevo en
   el servidor o antes de buildear la imagen —, `docker-compose -f
   docker-compose.prod.yml up -d`). La migración `V133` la aplica Flyway
   automáticamente al arrancar el contenedor `app` contra la RDS de
   producción — es aditiva (`ADD COLUMN IF NOT EXISTS`), no debería romper
   nada existente.
