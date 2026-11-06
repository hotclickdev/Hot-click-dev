## Telegram TG3: antiabuso, dedup persistente y revocarMiembro

**Antiabuso**
- Los botones (`callback_query`) pasan por `rechazarSiInyeccion`.
- Menos falsos positivos: un `' or ` suelto ya no basta; hace falta una tautología SQL (`' or 1=1`). Se agregaron casos con texto normal en español.
- El bloqueo por abuso repetido corta solo Telegram: el vínculo queda en pausa 365 días. Ya no pone `ESTADO_SUSPENDIDO` ni `bloqueadoHasta` en la cuenta. La pausa de 30 min del primer aviso sigue igual.

- Ráfaga (A8-C2, más de 3 msg/s): solo pausa el chat 30 min. Nunca escala al bloqueo de 365 días y nunca suspende la cuenta.

**Bajos**
- Candados por chat en `TelegramUpdateRouter`: ahora son 256 franjas fijas, con memoria acotada y sin necesidad de purga.
- El código de `/start` se normaliza a mayúsculas.

**Dedup persistente**
- Tabla nueva `hot_click_telegram_update_procesado_tb` (PK `update_id`, `creado`).
- El update se marca antes de procesar, con un INSERT atómico en una transacción propia (REQUIRES_NEW). Si es duplicado, se ignora.
- Si la BD falla, el update no se procesa (fail-closed) y el webhook igual responde 200 para que Telegram no reintente en bucle.
- Se mantiene la capa en memoria delante.

**revocarMiembro**
- Desactiva solo la membresía del usuario en la empresa del gestor (`estado=0`) y limpia la empresa activa del chat si era esa.
- Revoca el vínculo entero solo si no le quedan otras membresías activas o si esa es su empresa propia.
- No permite revocar al PROPIETARIO.

**Tests**
- Nuevos: `TelegramTg3Test` (8), `TelegramUpdateDedupPersistenteTest` (1) y `TelegramCallbackAntiabusoTest` (1).
- `Telegram*Test`, `EmprendedorEquipoTest` y `RolesEquipoEscrituraTest`: 115/115 en verde.

**Deploy**
- Migración `V199__telegram_update_procesado.sql`, solo aditiva (`CREATE TABLE/INDEX IF NOT EXISTS`). Flyway la aplica al arrancar.
- V196-V198 quedan reservadas para Dev Pagos 2.
- La tabla crece una fila por update y no hay purga automática. Se puede purgar a mano lo que tenga más de 7 días.
- Las cuentas que ya estaban suspendidas por el bloqueo anterior no se reactivan solas.
