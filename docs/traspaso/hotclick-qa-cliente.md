# Traspaso — HotClick QA Cliente (QA 4, cliente consumidor)

Fecha: 26/10/2026 (hora CR)

## Rol
Tester funcional QA 4, cliente consumidor. Plan: `/workspace/hotclick-reportes/plan-qa-funcional-2026-10-23.md`, sección QA 4. Solo prueba funcional desde la app; sin código.

## Ramas y PRs
Ninguno. QA 4 no tiene ramas ni commits de código.

## En qué quedé y pendientes
- Persona 1 sin confirmar y Persona 2 sin verificar, por **QA4-004 (ALTO)**: /registro se resetea sin mostrar la pantalla del código, y /login no ofrece reenviar el código ("Verificá tu correo para activar la cuenta." sin opción).
- Staging local (master `f9f0e506`, front :3000, backend :8081): el correo sale por SendGrid y falla con 401 en vez de ir a Mailpit (:8025). Se le pidió a CI/CD pasarlo a Mailpit.
- Normalización del email en el login: **sin concluir** por el rate limit de login.
- Rutas de invitado **OK**: /admin y /emprendedor redirigen a /login; /cobros, /billing, /suscripcion y /plan dan 404; /planes y /vender son páginas públicas.
- Bugs bajos: **QA4-005** (redirect anidado en /pyme) y **QA4-006** (error crudo de SendGrid mostrado al usuario).
- Bugs previos fase 1: QA4-001 (registro 400, causa: falta tipo de código REGISTRO en base nueva), QA4-002 (cookies de análisis activadas por defecto, Alta), QA4-003 (textos, Baja).
- Falta: menú del cliente logueado (sin enlaces de cobro), /pyme, /admin, /emprendedor logueado, chatbot con 3 preguntas (y chequeo de productos QA-TEST visibles), C2–C6, K3–K5 y K7 autenticado, y traspaso de cuentas a QA Compra por canal interno.

## Próximos pasos
1. Cuando el correo de staging vaya a Mailpit: verificar Persona 2 por el flujo de la app leyendo el código en Mailpit. Sin tocar la base y sin crear cuentas.
2. Con el rate limit libre: repetir login con el email en mayúsculas y con espacios alrededor.
3. Cambiar la contraseña de Persona 2 después de verificarla (quedó expuesta en una salida interna de herramienta).
4. Seguir con los pendientes de arriba.

## Decisiones de Andrés que conozco
- Solo staging local y ONVO en modo test.
- Sin deploy, sin servidores ni cuentas nuevas.
- Merges a master solo con CI verde más APTO sobre el hash exacto.
- Cédulas sintéticas; nada de secretos, teléfonos, SINPE ni cédulas reales en reportes.
- /register: 5 intentos por hora compartidos; no reintentar sin OK de Grok Bot.

## Evidencia
- Resumen en el repo: `docs/traspaso/evidencia/hotclick-qa-cliente/` (reporte fase 1 y resumen de bugs).
- En el box (no subido): `/workspace/qa-funcional/qa4/` (reporte y capturas en `evidencia/`), bugs medios/bajos en `/workspace/hotclick-reportes/bugs-pendientes-media-baja-2026-10-23.md`. Las credenciales de prueba están solo en el canal interno y no se suben.
