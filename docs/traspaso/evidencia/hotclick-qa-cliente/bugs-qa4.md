# Bugs QA 4 (resumen)
| ID | Severidad | Resumen | Estado |
|---|---|---|---|
| QA4-001 | Crítica | Registro falla con 400 en /api/auth/send-verification (falta tipo de código REGISTRO en base nueva) | Fix en rama según CI/CD; reprobar |
| QA4-002 | Alta | Cookies de Análisis activadas por defecto; banner tapado por modal de cupón | Abierto |
| QA4-003 | Baja | Textos: error genérico, "usted", aria-label en inglés, /api/public/branding 404 | Abierto |
| QA4-004 | Alta | /registro se resetea sin pantalla de código; /login no ofrece reenviar código | Abierto, reproduce en f9f0e506 |
| QA4-004-PII | Media | Log de DataIntegrityViolationException vuelca fila de usuario (cédula, correo, hash) | Abierto |
| QA4-005 | Baja | /pyme como invitado: redirect anidado en /login?redirect= | Abierto |
| QA4-006 | Baja | /registro muestra el error crudo "SendGrid respondió 401" | Abierto |
