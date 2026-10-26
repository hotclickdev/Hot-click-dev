## Resumen
- **QA4-004 (ALTO):** reenvío del código de verificación desde /login.
  - Backend: `POST /api/auth/reenviar-verificacion` con respuesta genérica (sin enumeración). El envío es asíncrono. Límite de 3/300s por IP (RateLimitingFilter) y de 3/900s por correo (clave con hash sha256).
  - Front: botón "Reenviar correo" con cooldown de 60s.
- **BAJO:** el redirect de /pyme ya no anida /login (`desanidarLogin`).
- **BAJO:** el correo se recorta (solo trim, sin minúsculas: hay cuentas guardadas con mayúsculas) antes de validar, en el backend (`JwtRequest`) y en el formulario.
- static/ regenerado. Se añadió una fila en docs/security/amenazas-activas.md.

## Tests
- Maven: 41/41 OK (ReenvioVerificacionServiceTest, JwtRequestCorreoTest, AuthCredentialLoginHandlerTest, RateLimitSinpeGuestTest, TwoFactorSecurityTest).
- Vitest: 20/20 OK. tsc sin errores.
- Gates: seguridad-merge y gate-tenant-global en PASS.

## Riesgos
- El RateLimiter es fail-open. Igual queda el tope de OtpService (3/10min por usuario).
- El login solo hace trim: un correo con mayúsculas distintas a las guardadas sigue fallando, igual que antes.
- El executor usa CallerRunsPolicy: si la cola se satura, el envío corre inline y podría haber diferencia de tiempos.
- El cooldown del botón es solo del lado del cliente.
- Los tests de vitest cubren la lógica, no el render del botón.
- SCALE1 (gate-scale): PASS, con 1 aviso por static/sw.js.
