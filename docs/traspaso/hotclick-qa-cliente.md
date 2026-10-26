# Traspaso — HotClick QA Cliente (QA 4, cliente consumidor)

Fecha: 26/10/2026 (hora CR)

## Rol
Tester funcional QA 4, cliente consumidor. Plan: `/workspace/hotclick-reportes/plan-qa-funcional-2026-10-23.md`, sección QA 4. Solo prueba funcional desde la app; sin código.

## Ramas y PRs
Ninguno. QA 4 no tiene ramas ni commits de código.

## En qué quedé y pendientes
Actualizado 26/10/2026, staging local en master `1b1fece8` (front :3000, backend :8081, correo por Mailpit :8025).
- **Persona 2: verificada** el 26-oct en staging `1b1fece8` (código leído en Mailpit, reenviando /registro con el mismo correo).
- **Persona 1: sigue sin confirmar.**
- Login: **OK**. Normalización del correo (mayúsculas y espacios alrededor): **OK**.
- Menú del cliente logueado sin enlaces de cobro: **OK**.
- /pyme, /admin y /emprendedor con cliente logueado: **terminan en la home** (sin acceso).
- Rutas de invitado **OK**: /admin y /emprendedor redirigen a /login; /cobros, /billing, /suscripcion y /plan dan 404; /planes y /vender son públicas.
- **C2, C4 y C5: OK.** La contraseña de Persona 2 (estaba expuesta) **ya se rotó en C5**; la nueva está solo en el canal interno.
- **C6: bloqueado por QA4-010** (interruptor de la 2FA deshabilitado).
- **C3: pendiente de #347** (reenviar código desde /login, cubre QA4-004); reprobar cuando entre a master.
- Bugs nuevos: QA4-007, QA4-008, QA4-009, QA4-010, QA4-011 (ver evidencia).
- Falta: K3–K5 y K7 autenticado, y traspaso de cuentas a QA Compra por canal interno.

## Próximos pasos
1. Cuando #347 entre a master: probar C3 y reprobar QA4-004.
2. Cuando se arregle QA4-010: probar C6 (activar 2FA por correo, login pide código, desactivar).
3. Confirmar Persona 1 por el flujo de la app (sin tocar la base, sin crear cuentas).
4. K3–K5 y K7 autenticado; traspaso de cuentas a QA Compra.

## Decisiones de Andrés que conozco
- Solo staging local y ONVO en modo test.
- Sin deploy, sin servidores ni cuentas nuevas.
- Merges a master solo con CI verde más APTO sobre el hash exacto.
- Cédulas sintéticas; nada de secretos, teléfonos, SINPE ni cédulas reales en reportes.
- /register: 5 intentos por hora compartidos; no reintentar sin OK de Grok Bot.

## Evidencia
- Resumen en el repo: `docs/traspaso/evidencia/hotclick-qa-cliente/` (reporte fase 1 y resumen de bugs).
- En el box (no subido): `/workspace/qa-funcional/qa4/` (reporte y capturas en `evidencia/`), bugs medios/bajos en `/workspace/hotclick-reportes/bugs-pendientes-media-baja-2026-10-23.md`. Las credenciales de prueba están solo en el canal interno y no se suben.
