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

## Correcciones al README

Revisado contra `b9f241d8` el 26-oct a las 15:40 CR.

### a) Errores o datos viejos
- **Paso 4 de «PARA EL BOT DE LA CUENTA NUEVA».** La lista de PRs abiertos está desactualizada. A las 15:20 CR estos PRs tenían APTO sobre estos hashes exactos (falta CI verde en cada uno):
  - #329 en `3e1c837d`, que ya no tiene conflicto;
  - #332 en `3abfc68d`;
  - #336 en `fb1818da`;
  - #343 en `7c9ea22c`: su CI rojo era del head anterior;
  - #348 en `d8f239be`;
  - #350 en `e68039dc`;
  - #351 en `788e02e9`;
  - #352 en `d985cba7`;
  - #353 en `a96c77f7`.

  Si después cambió el head de alguno, ese APTO ya no vale y hay que pedir uno nuevo.
- **Fila de HotClick Seguridad.** Agregar los APTO de #329, #336, #348, #350, #351, #352 y #353. El ALTO de #350 lo retiré: lo que el código llama `sinpeManual` es en realidad el intent SINPE por ONVO (P-01), no una confirmación manual.
- **Descripción del rol de Seguridad** (la de «nunca merge sin OK»). Quedó vieja. Desde el 26-oct a las 11:33 CR, un PR se mergea con CI verde y APTO sobre el head exacto, sin pedir otro OK. Desde las 12:17 CR, un PR que crea o provisiona servidores es NO APTO.

### b) Lo que le falta a mi reemplazo
- **Cómo verificar un merge puro con master.** `git merge-tree --write-tree P1 P2 | head -1` da un árbol T. Después, `git diff --stat T HEAD -- . ':!Hot_click_outlet/src/main/resources/static'` tiene que salir vacío. Lo único aceptable fuera de eso es quitar marcadores de conflicto en `docs/security/amenazas-activas.md`.
- **Tests.** `mvn -o test -Dtest=Clase1,Clase2`, sin `-q`, para que se vea el conteo. Usa JDK 21.
- **gitleaks.** En la cuenta vieja estaba como binario en `/workspace/tools`. `gitleaks detect` sobre todo el historial tarda más de 14 minutos, así que conviene limitarlo a un rango de commits con `--log-opts`.
- **Secret de GitHub pendiente.** Hay que crear `HOTCLICK_NUMEROS_PROHIBIDOS` en GitHub. Hasta que exista, la compuerta `SinNumerosRealesEnCodigoTest` se salta en CI. Se carga solo en la configuración de GitHub, nunca en el repo.
- **Trampa.** Los heads que los bots reportan antes de hacer push no existen en `origin`. Siempre confirmá `refs/pull/N/head` antes de dar el APTO.
- **Pendientes que no salen en el README:**
  - `AdminPosSinpeController` (`/api/admin/pos/sinpe-confirmaciones`) lista confirmaciones manuales de SINPE en el POS, y eso choca con la regla de SINPE solo por ONVO.
  - `/api/admin/finanzas` y el dashboard siguen abiertos para el rol EDITOR.
  - `EquipoService.crearNuevo` crea los LECTOR con `correoVerificado=true`.

### c) Mejoras
- **Antes del próximo deploy:** master ya trae `baseline-on-migrate=false` y `out-of-order=false` en Flyway. Hay que confirmar en prod que `flyway_schema_history` no tiene huecos, o la app no arranca. Sugiero ponerlo en el checklist de deploy.
- **BAJO de M-08/#350:** renombrar `sinpeManual` a `sinpeOnvoIntent` y exigir `sinpeDestino` no vacío para ofrecer SINPE.
