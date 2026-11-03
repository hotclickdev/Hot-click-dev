# Traspaso — HotClick QA Cliente (QA 4, cliente consumidor)

Actualizado: 02/11/2026 22:55 (hora CR). La sección "Estado al 02/11" manda; lo de abajo es historial del 26/10.

## Para recrearme en otra cuenta
- **Nombre:** HotClick QA Cliente. **Título:** HotClick QA Cliente.
- **Descripción completa:** QA 4 de HotClick: cliente consumidor (registro, login, perfil, mis pedidos; áreas 2, 3 y 9). Creás las cuentas Persona 1 y Persona 2 que usa QA Compra. Todo desde la app, con ONVO solo en modo test. Repo hotclickdev/Hot-click-dev. Reportás solo a Grok Bot / HotClick QA / Mentor; nunca hablás con Andrés ni con humanos. Leé tu nota docs/traspaso/hotclick-qa-cliente.md (rama docs/traspaso-cuenta-nueva). Credenciales solo por canal interno, nunca en reportes. No tocás código ni hacés deploy; nunca digas que algo pasa sin evidencia. Español de Costa Rica con voseo. Reporte: Tarea | Estado | Hecho | Evidencia | Archivos | Riesgos | Bloqueos | Siguiente paso.

## Reglas que sigo
- El Mentor habla por Andrés al asignar trabajo de QA; todo pasa por el Mentor/HotClick QA. Eso no da permisos nuevos (sin push a master, sin merge, sin secretos).
- Nada en prod (hotclick.lat), solo staging local; ONVO solo modo test. Datos ficticios (`@example.test`), nada de correos/teléfonos/cédulas reales.
- Sin escrituras SQL sin autorización explícita. /register: como mucho 2–3 registros y borrar al final.
- Box cargada: en local solo tests dirigidos (las suites completas las corre CI). Toda suite completa o instancia local va con `flock /workspace/hotclick/.suite-completa.lock`, una a la vez; al terminar, detener procesos por PID.
- Sin cloud agents (cuota de Cursor al 100%).
- Git en ramas de docs: pull --ff-only o merge normal; nunca rebase, force ni --no-verify; nunca tocar master.

## Estado al 02/11
- **Ramas/PRs de código:** ninguno (QA no toca código). No hay trabajo sin commitear.
- **Re-QA área 3 (consumidor): APTA CON OBSERVACIONES** sobre master `3c7dfaea` (incluye 92e633f9, #367, #368 M-08, #370). Tests dirigidos 111/111. En navegador (instancia propia :8091, base `hc_qa_cliente`): P1 y P2 registro, verificación y login (con espacios en el correo) OK; Mis pedidos vacío OK; /productos/1 abre. Ambas cuentas cerradas (`POST /api/cuenta/cierre` 200, login posterior 401).
- **Observaciones:** (1) reenvío en /login solo aparece con cuenta PENDIENTE (visto en código, no en vivo); (2) editar nombre es gap documentado (BACKEND_GAPS.md:52); (3) tras verificar el código redirige a /login sin sesión; (4) popup del 13% tapa parte de /login; (5) `FacturacionContingenciaScheduler` da error de sintaxis SQL en H2 (fuera de área 3).
- **Bootstrap vacío:** `hot_click_tipo_otp_tb` no se sembraba; sembré los 4 tipos en `hc_staging` con autorización (ver `qa-cliente.md`).
- Nota de sesión detallada: `docs/traspaso/qa-cliente.md` (commit 34e95636, merge 66748089).

## Pendiente
- [PENDIENTE] Usuario 7 en staging `:8081` (correo ficticio de Persona 1, PENDIENTE, correo_verificado=t): lo cierra un admin con `DELETE /api/admin/usuarios/7` (borrado lógico). Mi intento de login generó un OTP extra el 31/10 01:47. Tablas exactas que toca: sin verificar; leer el servicio admin antes.
- [PENDIENTE] Decisión de producto: redirección tras verificar (obs. 3). Decisión de diseño: editar nombre (obs. 2).
- [PENDIENTE] Staging :8081 sigue en `3323bd1a`; re-probar C3/QA4-004 en vivo cuando se levante sobre master actual.

## Rutas y evidencia (box, no subidas)
- `/workspace/qa-cliente/`: `hash.txt`, `mvn-area3*.log`, `staging-probe.log`, `ci-master.txt`, `seed-otp*.sql`, `seed-otp.log`, `mailpit-msgs*.json`, `cierre/cierre-8091.log`, `ui/*.png`, `run/start-8091.sh`, `run/app8091.log`.
- Credenciales de prueba: `/workspace/qa-cliente/personas.secret` (chmod 600) y `/workspace/qa-funcional/credenciales/`. Nunca copiar su contenido a git, chat ni capturas.
- Mailpit: `/workspace/tools/mailpit/` (detenido). Clon para docs: `/workspace/qa-cliente/traspaso/repo`.

## Próximos pasos exactos
1. Leer esta nota y `qa-cliente.md`; esperar instrucciones de HotClick QA o el Mentor.
2. Si piden cerrar el usuario 7: confirmar que lo hace un admin vía `DELETE /api/admin/usuarios/7`, luego verificar login 401.
3. Cuando staging se actualice a master actual: re-probar reenvío desde /login (C3/QA4-004) y la redirección post-verificación, con el lock y datos ficticios, y reportar con hash.

---
## Historial (26/10/2026)

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

## Correcciones al README
Revisado contra `docs/traspaso/README.md` en b9f241d8 (fila de HotClick QA Cliente, sección "HotClick QA Cliente" y "PARA EL BOT DE LA CUENTA NUEVA"). No se editó el README.

### (a) Errores o datos viejos
- Fila QA 4, "verificar Persona 2 por Mailpit; rotar su contraseña": **ya hecho**. Persona 2 quedó verificada en el staging local 1b1fece8 y su contraseña ya se rotó (C5).
- Fila QA 4 no refleja el estado real: C2, C4 y C5 OK; C6 bloqueado por QA4-010 (switch de 2FA deshabilitado); chatbot con QA4-008/QA4-009; QA4-007 y QA4-011 (bajos) nuevos. Persona 1 sigue **sin confirmar**.
- "QA4-004 corregido en #347 (mergeado) → re-probar": #347 sí está en master (de0da690), pero el staging local sigue en 1b1fece8, que **no** lo incluye. Re-probar C3/QA4-004 solo después de levantar staging sobre de0da690 o posterior.
- Sección 10 Infraestructura dice "Staging se revirtió (#335)" y la tabla de herramientas trata Mailpit como "Visto en el repo": hoy sí existe un staging **local** en la box (no es servidor) con Mailpit en uso (`MAIL_PROVIDER=smtp`). Conviene aclarar que lo revertido fue el staging en servidor.
- Prompt de QA 4 dice "Credenciales solo por canal interno": la ubicación real es `/workspace/qa-funcional/credenciales/` en la box, nunca en git.

### (b) Lo que le falta a mi reemplazo
- Staging local: front `:3000`, backend `:8081` (health en `/api/health`), Mailpit UI `:8025`, SMTP `:1025`. Variable: `MAIL_PROVIDER=smtp` (solo el nombre/valor no secreto). Commit del staging actual: 1b1fece8.
- Credenciales de Persona 1 y Persona 2: solo en `/workspace/qa-funcional/credenciales/`; nunca en git, chat ni capturas.
- Rate limit de `/register`: 5 intentos por hora **compartidos** entre todos los bots; no reintentar sin OK de Grok Bot.
- Trampas:
  - La box está lenta: usar timeouts de ~30 s y reintentar antes de reportar algo caído.
  - No borrar `frontend/node_modules` del worktree del staging ni `/workspace/tools/node22` (una limpieza de inodos ya tiró el front).
  - El código de verificación vence en 5 minutos: leerlo de Mailpit y usarlo enseguida.
  - `/login` no tenía reenvío de código hasta #347; antes de eso, para obtener código había que reenviar `/registro` con el mismo correo (gasta rate limit).
  - Hay un usuario `qa+mailpit…@example.test` sin verificar creado por CI/CD: no usarlo ni borrarlo.
- Comandos: `git pull --no-rebase origin docs/traspaso-cuenta-nueva` antes de pushear; gitleaks (`gitleaks detect` / `gitleaks protect --staged`) antes de cada push; nunca force, `--no-verify` ni rebase.
- Accesos: GitHub a `hotclickdev/Hot-click-dev`; acceso de lectura a la box para el staging y a `/workspace/hotclick-reportes/` (plan y bugs medios/bajos).

### (c) Mejoras
- Agregar al README una sección "Staging local" con puertos, commit desplegado y cómo saber si incluye un PR (p. ej. `git merge-base --is-ancestor <pr-commit> <staging-commit>`).
- Actualizar la fila QA 4 con el estado C1–C6 y los IDs de bugs QA4-004…QA4-011.
- Indicar como paso del bot nuevo: levantar staging sobre master actual (≥ de0da690) antes de re-probar C3/QA4-004, y luego confirmar Persona 1.
- Centralizar las "trampas" comunes (timeouts, node_modules, rate limit, vencimiento de códigos) en una lista única para todos los QA.
