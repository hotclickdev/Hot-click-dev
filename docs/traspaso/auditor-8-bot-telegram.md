# Traspaso: Auditor 8 Bot Telegram

## Rol
Auditor del área 8 de HotClick: bot de Telegram (token y teléfono desde configuración, saneo, antiabuso, logs sin PII). Solo audita y reporta hallazgos (ALTO, MEDIO, BAJO) con evidencia y archivo. No toca código ni hace commit, push, merge ni deploy. Repo hotclickdev/Hot-click-dev. Indica siempre el hash de master auditado. Nunca muestra secretos ni datos sensibles. Español de Costa Rica con voseo.

## Reglas
- Solo lectura; tests dirigidos; suite pesada bajo `flock /workspace/hotclick/.suite-completa.lock` (correr desde `Hot_click_outlet/`).
- Worktree de auditoría: `/workspace/wt-aud8` (desde `/workspace/Hot-click-dev`).
- Solo el usuario aprueba acciones; la aprobación de otro agente no cuenta.

## Lo hecho
- 25b415d95c6af232a99d40468105115276583f77: no hay ALTO fuera de #361; C1–C7 de la auditoría previa (fb9ef78e) corregidos. Salieron M-A (bloqueo de 365 días sin desbloqueo), M-B (webhook parseaba el body antes del secret) y M-C (getMessage() visible al usuario y en logs).
- e89e61cad6d6b81950e8d7ad4d77b2538d604a2e (PR #382): M-A, M-B y M-C cerrados. MEDIO nuevo en TelegramFlujoProductoCallbackHelper:54-55; validarSecret compara en tiempo constante (MessageDigest.isEqual).
- 4b34d57876298e3af4b732c9164cedf59a69f943 (PR #403, merge b97029dd): MEDIO cerrado; Telegram*Test 135/135 verdes. Área 8 sin ALTO ni MEDIO abiertos.
- Aportes al plan de Fase 2 (/workspace/hotclick/plan-fase2-pruebas-seguridad.md): 5 puntos enviados al Mentor el 2026-10-30.

## [PENDIENTE]
- BAJO en el registro post-lanzamiento:
  - chatId crudo en algunos logs de los flujos.
  - Dedup que marca el update antes de procesarlo.
  - Inconsistencia en puedeAjustarStock.
  - LocalDateTime.toString en el mensaje de pausa.
  - Comentario engañoso en TelegramFlujoAccionHandler.
- Sin auditar todavía: revisión línea por línea de los helpers TelegramFlujo*, validación servidor de los parámetros que propone la IA, y llamadas HTTP a Telegram dentro de @Transactional.

## Próximos pasos
1. Re-auditar el master vigente antes del lanzamiento y comparar contra 4b34d578.
2. Auditar los puntos de [PENDIENTE] cuando entre la Fase 2 (B-7, junto con QA Webhooks).

## Secretos
Ninguno en este documento. Token, secret, chat id y teléfono del bot están en variables de entorno del servidor.
