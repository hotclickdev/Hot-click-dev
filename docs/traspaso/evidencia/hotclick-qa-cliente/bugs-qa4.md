# Bugs QA 4 (resumen)
| ID | Severidad | Resumen | Estado |
|---|---|---|---|
| QA4-001 | Crítica | Registro falla con 400 en /api/auth/send-verification (falta tipo de código REGISTRO en base nueva) | Fix en rama según CI/CD; reprobar |
| QA4-002 | Alta | Cookies de Análisis activadas por defecto; banner tapado por modal de cupón | Abierto |
| QA4-003 | Baja | Textos: error genérico, "usted", aria-label en inglés, /api/public/branding 404 | Abierto |
| QA4-004 | Alta | /registro se resetea sin pantalla de código; /login no ofrece reenviar código | Abierto, reproduce en f9f0e506 y 1b1fece8; fix en #347 (pendiente de merge) |
| QA4-004-PII | Media | Log de DataIntegrityViolationException vuelca fila de usuario (cédula, correo, hash) | Abierto |
| QA4-005 | Baja | /pyme como invitado: redirect anidado en /login?redirect= | Abierto |
| QA4-006 | Baja | /registro muestra el error crudo "SendGrid respondió 401" | Abierto |
| QA4-007 | Baja | "Verificar cuenta" redirige a /login sin mensaje de éxito | Abierto |
| QA4-008 | Media | El chatbot no responde preguntas de devoluciones | Abierto |
| QA4-009 | Baja | Chatbot: respuesta de garantía duplicada y muestra tarjetas de productos QA-TEST | Abierto |
| QA4-010 | Media | Interruptor de la 2FA deshabilitado; bloquea C6 | Abierto |
| QA4-011 | Baja | Recuperación de contraseña: correo con asunto de "verificación" y redirect a /login | Abierto |
