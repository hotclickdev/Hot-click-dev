# Traspaso — HotClick QA Cliente (QA 4), re-QA del área 3

Fecha: 30/10/2026 (hora CR). Continúa la nota previa [`hotclick-qa-cliente.md`](hotclick-qa-cliente.md) (26/10, fase 1, C1–C6 y bugs QA4-004…QA4-011); lo de esa nota sigue vigente salvo lo que se actualiza acá.

## Estado
- **Área 3 (marketplace, cliente consumidor): APTA CON OBSERVACIONES** sobre master `3c7dfaeadfa494fd8e5d1fb1992b65cb3533e86a` (incluye `92e633f9`, #347, #367, #368 M-08 y #370). Nada bloqueante.
- **Tests dirigidos del área 3 (14 clases, no la suite completa): 111/111 en verde** (`Tests run: 111, Failures: 0, Errors: 0, Skipped: 0`, BUILD SUCCESS) el 27/10 01:30 hora CR.
- **UI en una instancia local `:8091` de `3c7dfaea`** (27/10, hecha por HotClick QA): registro + verificación de Persona 1 y Persona 2 OK (2 envíos), login con espacios en el correo OK, Mis pedidos vacío OK, `/productos/1` OK.
- **Cuentas cerradas:** P1 y P2 de `:8091` se cerraron con login por API + `POST /api/cuenta/cierre` (200 "Cuenta cerrada…"); el login posterior da 401. La instancia `:8091`, su base `hc_qa_cliente` y Mailpit quedaron detenidos/borrados al terminar.
- Persona 1 y Persona 2 usan correos ficticios `qa4.persona1.1911@example.test` y `qa4.persona2.1911@example.test` (dominio de prueba, sin buzón real).

## Evidencia (en la box, no subida)
Todo en `/workspace/qa-cliente/`:
- `mvn-area3-3c7dfaea.log`: tests dirigidos sobre `3c7dfaea` (y `mvn-area3.log`, corrida previa sobre `649387e7`, también 111/111).
- `hash.txt`: hash probado. `src/`: clon usado (detached en `3c7dfaea`).
- `cierre/cierre-8091.log`: cierre de P1 y P2 y logins que fallan después.
- `ui/`: capturas de la UI (9 del 27/10 + `p1-registro-error.png` del 400 viejo).
- `mailpit-msgs.json`, `mailpit-msgs-final.json`: volcados de Mailpit (5 correos de verificación, todos a P1/P2).
- `seed-otp.sql`, `seed-otp-exacto.sql`, `seed-otp.log`: sembrado de tipos de OTP en `hc_staging`.
- `run/start-8091.sh`, `run/app8091-final.log`: arranque y log de la instancia `:8091`.

## Observaciones (para backlog, no bloquean)
1. **Reenvío del código en `/login`** (QA4-004, #347): el botón «Reenviar correo» solo aparece en el paso de contraseña cuando el login devuelve 403 «Verificá tu correo…» (cuenta PENDIENTE), con cooldown de 60 s (`LoginFormStep.tsx`, `useLoginFlow.ts`). QA probó con cuentas ya verificadas, por eso no lo vio. `POST /api/auth/reenviar-verificacion` responde 200 genérico (probado por API). **No se vio en vivo** con una cuenta PENDIENTE. Además, el login de una cuenta PENDIENTE reenvía el código solo.
2. **Editar el nombre en el perfil** (`/perfil?vista=seguridad` es de solo lectura): brecha de diseño ya documentada (`docs/figma-migration/BACKEND_GAPS.md` fila 31, `ACC.md`, `INVENTORY.md` frame `30:1400`); existe `PUT /usuarios/{id}`, falta el diseño. No es incumplimiento.
3. **Tras verificar el registro redirige a `/login` sin sesión.** Decisión de producto pendiente.
4. **Popup «13% de descuento»** en `/login` tapa la parte baja (en la captura tapa «¿Solo querés comprar?»; en pantallas bajas puede tapar «Continuar»).
5. **Error H2 en tests** de `FacturacionContingenciaScheduler` (sintaxis `WITH claimed AS (…` no soportada en H2). No rompe ningún test del área 3; revisarlo aparte.

## Hallazgo del bootstrap de la base (dev)
- Con base vacía, el bootstrap dev (`FlywayRepairConfig` + `db/dev-bootstrap/nativas.sql`) en `3323bd1a` **no sembraba `hot_click_tipo_otp_tb`**: `send-verification` daba 400 con log `Tipo de OTP no configurado: REGISTRO` (`OtpService`).
- El INSERT de `V1__initial_schema.sql` (~línea 1455) usa la tabla en mayúsculas entre comillas `"HOT_CLICK_TIPO_OTP_TB"`, que no existe en la base bootstrapeada (la real es `hot_click_tipo_otp_tb`).
- Con OK de HotClick QA se sembraron a mano en `hc_staging` los 4 tipos (REGISTRO, RESET_PASSWORD, 2FA_LOGIN con 300 s/6/1; RESET_DATOS con 600 s/6/1), ver `seed-otp.sql`.
- En `3c7dfaea` la base nueva ya traía los 4 tipos (bootstrap «through V202»), así que en master actual no hizo falta sembrar.

## Usuario 7 en staging `:8081` (pendiente)
- Staging local `:8081` corre `3323bd1a` (más viejo que master). Usuario `id_usuario=7` = correo ficticio de Persona 1, estado PENDIENTE (5) con `correo_verificado=t` (combinación rara, conviene revisarla).
- No se puede cerrar por `/api/cuenta/cierre` (el login da 403 «Verificá tu correo…», sin token). No se tocó por SQL.
- Para cerrarlo: un admin hace `DELETE /api/admin/usuarios/7` (borrado lógico).

## Pendientes
- Cerrar el usuario 7 de staging (admin).
- Si se quiere confirmar en vivo el botón de reenvío en `/login`: hace falta una cuenta PENDIENTE nueva en una instancia de master (gasta intentos de registro).
- Decisiones de producto/diseño: redirect tras verificar, edición de nombre, popup del 13%.
- De la nota previa: C6 (QA4-010), K3–K5 y K7 autenticado, traspaso de cuentas a QA Compra.

## Cómo continuar
- **Mailpit:** binario en `/workspace/tools/mailpit/` (v1.32.0). Levantarlo: `cd /workspace/tools/mailpit && nohup ./mailpit --smtp 127.0.0.1:1025 --listen 127.0.0.1:8025 > mailpit.log 2>&1 &`. API: `http://localhost:8025/api/v1/messages`. Al terminar, detenerlo por PID.
- **Instancia local de master:** `/workspace/qa-cliente/run/start-8091.sh` (perfil dev, puerto 8091, base aparte `hc_qa_cliente`, SMTP a Mailpit, pagos en mock; lee secretos de archivos del staging, no los copia). Hay que compilar el jar del clon y crear la base antes. Siempre bajo el lock y una a la vez:
  `nohup flock /workspace/hotclick/.suite-completa.lock ./start-8091.sh > app8091.log 2>&1 &`
  Al terminar: detener el java y el flock por PID, confirmar que el lock no queda tomado por vos y borrar la base.
- **En local solo tests dirigidos** (nunca la suite completa): `mvn -o -B test -Dfrontend.skip=true -Dtest=<clases> -Dsurefire.failIfNoSpecifiedTests=false` con las variables de CI de H2 (ver skill `hot-click-dev-workflow`).
- **Credenciales de P1/P2:** solo en `/workspace/qa-cliente/personas.secret` (chmod 600). Nunca copiar su contenido a git, chat, reportes ni capturas.
- **Límite de registros:** máximo 3 registros acordados con HotClick QA para P1/P2; además `/register` tiene 5 intentos por hora compartidos entre todos los bots, `OtpService` permite 3 códigos por 10 min por usuario y el código vence en 5 min. No reintentar a ciegas.
- La box se satura: usar timeouts largos (≥120 s) y no reintentar llamadas que gastan rate limit.
- Nunca prod (hotclick.lat), ONVO solo test, sin push a master, sin rebase ni force push.
