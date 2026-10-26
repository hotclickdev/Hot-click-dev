# QA 2 PYME, Fase 1 (parcial). Staging local, master 43188186, 23/10 21:08–21:13 CR
Capturas: /workspace/qa-funcional/qa2/capturas/
- P1/C1: BLOQUEADO. POST /api/auth/registro-empresa da 500 ("Error al registrar la empresa"); no se envía código.
- C2: no concluyente (429 "Demasiados intentos" al reintentar a los pocos segundos).
- C3, C4, C5, C6, P2–P8: BLOQUEADOS (sin cuenta, sin correo SMTP).
- C7: textos de /para-pymes con voseo y sin errores crudos.
- /pyme sin sesión → /login?redirect=/pyme (OK). /registro-empresa/activar-plan → /registro-empresa sin mensaje.
## Bugs
QA2-001 (CERRADO, duplicado de QA1-004; responsable QA 1, decisión final de Grok Bot) Alta: registro de empresa responde 500 con mensaje genérico (posible causa: falta sender SMTP; igual debe dar error claro y no dejar estado a medias).
QA2-002 Alta: /para-pymes ofrece Tilopay ("Con la pasarela Tilopay que ya usa el panel", sección "Cómo entrás", paso 2).
QA2-003 Media: /para-pymes no muestra el precio US$24 (solo "Mensualidad en dólares"); los precios de ejemplo salen "₡ ···".
QA2-004 Baja: el enlace "Iniciar sesión" de /registro-empresa apunta a /login?redirect=/registrar-negocio.
QA2-005 Baja: /registro-empresa/activar-plan redirige al registro sin aviso.
QA2-006 Baja: 429 al segundo intento de registro a los pocos segundos del primero.
