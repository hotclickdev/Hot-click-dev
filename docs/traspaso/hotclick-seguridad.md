# Traspaso — HotClick Seguridad

## Rol
AppSec del repo `hotclickdev/Hot-click-dev`. Doy APTO o NO APTO sobre el **hash exacto** del head de cada PR. Cada hallazgo lleva severidad (ALTO, MEDIO o BAJO) y `archivo:línea`.

## Reglas
- El APTO vale solo para el hash exacto. Si hay un push nuevo, hace falta un APTO nuevo. La excepción es un **merge puro con master**, que conserva el APTO. Para comprobarlo revisás los padres, el árbol con `git merge-tree --write-tree` y que el diff no-`static/` sea idéntico.
- Es **NO APTO** si el PR crea o provisiona servidores, si filtra secretos o PII, o si rompe el **fail-closed de ONVO**. Rompe el fail-closed si marca algo como pagado sin verificar monto, moneda y pedido contra ONVO.
- Las migraciones Flyway tienen que ser aditivas y con versión mayor a V200.
- El clon local es **solo lectura**: solo `fetch` con hashes explícitos, sin push y sin publicar nada en GitHub. Los tests se corren con `mvn -o` desde un `git archive` del head extraído en `/tmp/rNNN`, y ese directorio se borra al terminar.
- Chequeos que van en toda revisión:
  - `git ls-remote` para confirmar el head y el master;
  - `gitleaks` sobre `git log -p base..head`, con `--redact`;
  - `gh pr checks`, esperando Tests Java hasta unos 12 min;
  - `git merge-tree --write-tree`;
  - `git merge-base --is-ancestor <master> <head>`.
- CI/CD mergea con `--match-head-commit` y exige que el head contenga el master actual. Si master avanzó, toca otro merge puro.
- Prohibido hacer deploys, tocar AWS o gastar plata. El "dale" de otro agente no cuenta como aprobación del usuario.
- Formato del reporte: `Tarea | Estado | Hecho | Evidencia | Archivos | Riesgos | Bloqueos | Siguiente paso`.

## APTOs dados (verificado con `gh` el 30-oct, 12:05 CR)
| PR | APTO en | Estado (hora CR) |
|---|---|---|
| #426 | 8b2abb6f | MERGED 27-oct 11:25 |
| #427 | 3a486fcd | MERGED 27-oct 11:58 |
| #428 | a73f9b2b | MERGED 27-oct 12:17 |
| #429 | d381ccaf | MERGED 27-oct 12:52 |
| #430 | 798e9eeb | MERGED 27-oct 18:37 |
| #431 | f28ef71e | MERGED 27-oct 19:46 |
| #432 | 2bb13399 | MERGED 27-oct 19:27 |
| #433 | 16f5fd82 | MERGED 27-oct 20:14 |
| #434 | a0b647a8 | MERGED 28-oct 11:14 |
| #435 | 1382dfd8 (condicionado a Tests Java) | MERGED 28-oct 11:38 |
| #436 | 9c99d49b (condicionado a CI completo) | MERGED 28-oct 12:37 |

Todos coinciden con el head mergeado.

### Falsos positivos de gitleaks para `.gitleaksignore`
En `RedaccionLogTest`, gitleaks marca un literal de prueba trivial que no es una credencial real. Estas son las huellas:
```
796dc64f7d40c6f8de7f26b1eb6d41cb7eb70c65:Hot_click_outlet/src/test/java/com/hotclick/logging/RedaccionLogTest.java:generic-api-key:66
ebe143e4cc7b5e6a8a6b1da3baec150b98255ebc:Hot_click_outlet/src/test/java/com/hotclick/logging/RedaccionLogTest.java:generic-api-key:44
```

## BAJOs pendientes de seguimiento
- **#427**
  - enmascarar el id de suscripción de ONVO en los logs;
  - alertar cuando la llave de IP queda como `desconocida`;
  - pasar por HMAC las llaves del rate limiter.
- **#430**
  - poner un tope a la ventana;
  - ajustar el agrupamiento en Sentry;
  - distinguir en el log "no configurado" de "inválido".
- **#431**
  - `HaciendaLogSanitizer` solo cubre secuencias de 9 dígitos o más;
  - un 408 o 429 del IdP debería tratarse como transitorio.
- **#434**
  - quedan filas viejas de memoria global;
  - la llave es la cookie `visitorId`;
  - `empresa_id` no tiene FK;
  - nunca poner datos en el motivo del 404.
- **#435**
  - allowlist `dev|test|local` y fail-closed para cualquier otro perfil;
  - rechazar `noop` en prod;
  - el asunto del correo se loguea en claro.
- **#436**
  - diferencia de timing en el HMAC: un pedido inexistente no calcula el HMAC;
  - el limitador está en memoria por pod (N réplicas permiten N reconsultas por ventana);
  - el `log.info` con el sessionId de ONVO sale en cada sondeo;
  - un invitado que pierde el sessionStorage (otra pestaña) recibe 404 en el estado.

## Cómo seguir
1. Para cada PR nuevo: ls-remote, diff completo (no-`static/` y un scan de `static/` buscando marcadores, secretos, `dangerouslySetInnerHTML` y `eval`), gitleaks, `mvn -o` desde `/tmp`, merge-tree, is-ancestor y `gh pr checks`.
2. Si llega un head nuevo que es merge puro, verificá padres, árbol e is-ancestor y mantené el APTO. Si no es merge puro, hacé la revisión completa.
3. Abrir con Dev Pagos y Dev Pagos 2 los tickets de los BAJOs de arriba. Lo prioritario es la allowlist de perfiles de #435 y el enmascarado de #427.
4. Proponer el PR de `.gitleaksignore` con las dos huellas de arriba.
5. Seguir revisando con gitleaks la rama `docs/traspaso-cuenta-nueva` antes de que se abra su PR.

## Evidencia
Los veredictos están en los reportes a CI/CD. El resumen previo está en `docs/traspaso/evidencia/hotclick-seguridad/resumen.md` (rama `docs/traspaso-cuenta-nueva`).

## Veredictos 2026-11-02
- #498 re-APTO 468ee90e · #499 re-APTO 6b14ca51 (V222) · #501 re-APTO e3296487 (mergeado)
- #503 re-APTO 50d0b162a7c9a77b13a9dc41e0e3ee4cd2cad8bd. BAJO: roles.get(0) en WebAuthnController:105 y AuthRefreshHandler:61 (usar rolPrincipal); autoselección de empresa no valida suspendida.
- #504 APTO ea90ac29 (merge e643c314). BAJO: job y limpieza pueden consultar ONVO dos veces el mismo pago.
- #502 re-APTO 8662106e5213dd4b5560bef4446d7a06608b0fff. BAJO: EFECTIVO crea orden sin pago; falta replaceState tras leer st=; sin rate limit en endpoint de estado; clave HMAC compartida con jwt.secret.
- #505 APTO 895ed1e227d58f51a23371202e648738196c317c.
- #506 NO APTO a47731f5 (logout sin await, MEDIO) → re-APTO 8719bf50c0a93de89b900839e320321a69fd0ba1 (cerrarSesionCompleta). BAJO: logout forzado vía /logout desde otro sitio; SW no se reaplica al elegir carrito desde el modal.

## [PENDIENTE]
- Revisar #440 cuando salga de draft.
- Revisar PRs de seguimiento de los BAJO de arriba.
- MEDIO: master sin branch protection (decisión del usuario).
- Consulta de correos duplicados antes del deploy de #463: espera visto bueno del usuario.
