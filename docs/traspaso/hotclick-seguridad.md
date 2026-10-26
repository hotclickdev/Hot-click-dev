# Traspaso — HotClick Seguridad

## Rol
AppSec. Doy APTO o NO APTO sobre el hash exacto de cada PR. Cualquier parche nuevo anula el APTO, salvo que sea un merge puro con master; eso lo verifico con `git merge-tree --write-tree`, excluyendo `static/`.

## Reglas de Andrés
- Un PR se mergea con CI verde más APTO sobre el head exacto.
- Ningún PR crea servidores; si lo hace, es NO APTO.
- SINPE va solo al número de ONVO y se confirma solo por el webhook de ONVO, sin confirmación manual.
- Todo ONVO es fail-closed.
- Cero secretos o PII en código y PRs.
- Prohibido deploy y prohibido tocar AWS.

## Estado de los PRs al 26-oct 14:38 CR (master 1b1fece8)
- APTO:
  - #344 en 0372c25f
  - #332 en 3abfc68d
  - #343 en 75f93a25
  - #349 en e05c0824
  - #345 en 32f058df
  - #347 en 3f7e8f05
  - #329 en 4703c195
  - #334 en f2c5bc27
- APTO, pero el commit todavía no estaba pusheado:
  - #338 en c710d9b3
  - fix/roles-admin-billing-wallet en 45534a84 (Bugs)
- #336: APTO en f6e655e6, pero contra 1b1fece8 queda DIRTY en `static/`; falta otro merge con master.
- #346: APTO en 94becf69.
- #341: APTO en 9cdc5d39.

## Pendientes de seguridad
- **M-08 sobreventa (ALTO).** Si hay sobreventa después de un cobro de ONVO, se hace rollback del pago y se responde 500. Va a Dev Pagos. Spec del arreglo:
  - registrar el pago;
  - dejar el pedido en `PEDIDO_REVISION_SOBREVENTA`;
  - no dejar stock negativo;
  - registrar un `[ALERTA-PAGO]`;
  - responder 200 idempotente con `Captura.COBRADO_SOBREVENTA`;
  - aplicarlo también a Tilopay, SINPE, Stripe y manual;
  - agregar tests.
- `AdminPosSinpeController` (`/api/admin/pos/sinpe-confirmaciones`) lista confirmaciones manuales de SINPE en POS; choca con la regla de SINPE solo por ONVO.
- `/api/admin/finanzas` y el dashboard siguen abiertos para EDITOR.
- `EquipoService.crearNuevo` crea los LECTOR con `correoVerificado=true`.
- Hallazgos BAJO:
  - `bodega` aparece en el JSON público (falta un DTO);
  - en el asunto del correo no se limpian los CRLF;
  - SMTP no exige TLS;
  - `SPRING_MAIL_HOST` en prod afecta el health check;
  - el patrón BASIC de Sentry redacta de más;
  - los correos en mayúsculas fallan en `findByCorreo`;
  - los workflows tienen fallback a onrender;
  - si falta `HEALTH_URL`, el check pasa en silencio;
  - en #337 falta `@Size` en `items`.

## Próximos pasos
- Seguir revisando los merges con master de cada PR.
- Revisar con gitleaks la rama `docs/traspaso-cuenta-nueva` antes de que se abra su PR.
- Revisar el PR de M-08.

## Evidencia
Los veredictos están en los PRs y en los mensajes a CI/CD. Resumen en `docs/traspaso/evidencia/hotclick-seguridad/resumen.md`.
