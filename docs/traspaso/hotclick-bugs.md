# Traspaso — HotClick Bugs

Fecha: 2026-10-26 (CR). Autor: HotClick Bugs.

## Rol
Triage de bugs y deuda técnica en `hotclickdev/Hot-click-dev`: reproducir, arreglar con un test de regresión por fix, pedir APTO a Seguridad sobre el hash exacto, pushear ese hash y pasarle el PR a CI/CD.

## Estado (al traspaso)
- 3 PRs abiertos (tope 3). Ninguno se mergea sin CI verde + APTO sobre el head exacto.
- #348 ya tiene el arreglo de Tests Java (los tests viejos de LECTOR ahora esperan 403), con APTO sobre d8f239be y enviado a CI/CD.

## Ramas y PRs
| PR / rama | Head | Estado |
|---|---|---|
| #304, #306, #327, #328 | — | Mergeados |
| #338 `fix/telegram-antiabuso-dedup` | `c710d9b3` | Abierto. APTO sobre c710d9b3. Falso positivo E4 (constante SECRET) arreglado. Enviado a CI/CD para merge. |
| #347 `fix/login-reenviar-verificacion` | `3f7e8f05` | Abierto. APTO sobre 3f7e8f05. Enviado a CI/CD para merge. |
| #348 `fix/roles-admin-billing-wallet` | `d8f239be030ab98b2be540c25535fbab1eca75e3` | Abierto. APTO sobre d8f239be (tests viejos de LECTOR actualizados a 403). Enviado a CI/CD para merge. |
| `wip/onvo-billing-webhook-verificado` | `3c23c240` | WIP (cambios sin commitear subidos para no perderlos). No listo, sin PR. |
| `wip/perfil-estricto-totp-config` | `0e08718b` | WIP idem. Relacionado con `fix/perfil-case-insensible` (ya en origin). No listo. |
| Resto de ramas fix/* locales | — | Ya en origin o mergeadas en master. |

## Pendientes
- LECTOR 1067 con `correoVerificado=true`: default en `Usuario` y `EquipoService.crearNuevo` no llama `setCorreoVerificado(false)`.
- EDITOR con acceso a `/api/admin/finanzas` y al dashboard.
- Código muerto en `SuscripcionTilopayService.confirmar` (todo lo que sigue al throw).
- `findByCorreo` → IgnoreCase con resultado único (el reenvío pasa a minúsculas; el login no).
- Bypass de `TelegramTextoSospechoso`: `union/**/select`, fullwidth, `' or true`, `<svg onload`. Arreglo: NFKC, quitar `/**/`, regex `on\w+=`.
- Purga de la tabla de dedup V199 (más de 7 días).
- BAJOs de #327: una sola clave de marketplace con límite 300; `devolver` se traga el error.
- `RateLimiter.incrementarYContar` no atómico.
- Encoding `%253A` y tokens cortos (saneo de token Telegram).
- Valores con forma de número en `n8n-workflows/04`, `Untitled-2.html` y `SeccionBodega.tsx:178`.
- `numero_whatsapp` del tenant en el prompt sin `digitos()`.
- BAJO: volver a cubrir la aserción del teléfono enmascarado en metodos-cobro (en otro PR).
- `/api/facturas` da 500 al dueño (sin investigar).

## Próximos pasos
1. Seguir #338, #347 y #348 hasta merge por CI/CD.
2. Al liberar cupo de PR: bug de `correoVerificado` en EquipoService (ALTO), luego EDITOR en finanzas.
3. Revisar los wip/ antes de retomarlos (base vieja, `eb7564c2`).

## Decisiones de Andrés
- Cuota opción B: asistente 300 por tienda y 3000 total por día; chat público 5000 global y 3000 por tienda; sin gastar créditos del plan.
- El bloqueo de Telegram solo afecta el acceso por Telegram.
- Dedup persistente con V199 aditiva.
- `revocarMiembro` solo en esa tienda.
- Tiendas QA-TEST ocultas; conteo de tarjetas sin filtro de stock.
- OK permanente de push y PR con APTO sobre el hash exacto; máximo 3 PRs; un test de regresión por fix; merge por CI/CD con `--match-head-commit` y CI verde; sin deploy; ONVO fail-closed; sin secretos.

## Gotchas
- Gate SCALE1 marca llamadas a BD cerca de loops (ventana -U20).
- Gate E4 marca constantes llamadas `secret` con literal de 12+ caracteres.
- `static/` se regenera con `pnpm build` y `VITE_APP_RELEASE=ci-spa-gate`.
- `gh pr create` puede colgarse.

## Evidencia
`docs/traspaso/evidencia/hotclick-bugs/`: cuerpos de PR (`*-pr-body.md`) y reportes QA de roles (`qa1-reporte-roles-2026-10-26.md`, `qa2-roles-pyme-master.md`). Solo correos de prueba `@example.com`, sin contraseñas ni teléfonos reales.

## Correcciones al README

**(a) Errores o datos viejos**
- Paso 4 y fila de HotClick Bugs: #348 ya está MERGEADO (d8f239be). También #338 (c710d9b3) y #347 (3f7e8f05). Sacalos de "PRs abiertos"; hoy HotClick Bugs no tiene PRs abiertos.
- Fila de HotClick Bugs: el bug de correoVerificado=true en EquipoService.crearNuevo (LECTOR 1067) no tiene severidad ALTA asignada; su PR va aparte. Lo mismo EDITOR en /api/admin/finanzas y el dashboard.
- La descripción del bot dice "nunca push sin OK en cada caso". Andrés dio un OK permanente: push sin force, sin --no-verify y sin rebase, más PR, una vez que Seguridad da APTO sobre el hash exacto. Como máximo 3 PRs abiertos y un test de regresión por fix. CI/CD mergea con --match-head-commit y CI verde. Sin deploy.

**(b) Lo que le falta a mi reemplazo**
- QA4-010 (el interruptor de 2FA del cliente no se puede activar) y QA4-008 (el chatbot toma 'devolver pedido' como búsqueda): no iniciados, sin rama. Quedan para el bot de la cuenta nueva. Cada uno lleva su test de regresión; la evidencia está en qa4/evidencia/A2-03-*.
- Herramientas en la box: Maven `/workspace/tools/apache-maven-3.9.9`, JDK `/workspace/tools/jdk21`, Node22 `/workspace/tools/node22` y `COREPACK_HOME=/workspace/tools/corepack`. gitleaks está en `/workspace/tools/gitleaks`, fuera del PATH. Los tests dirigidos se corren con `/workspace/mvn-suite.sh -o -Dtest=...`.
- Gates locales: `BASE_SHA=$(git merge-base origin/master HEAD) HEAD_SHA=$(git rev-parse HEAD) node scripts/eng-gates/gate-scale.mjs`. Lo mismo para gate-tenant-global.mjs y seguridad-merge.mjs; este último exige una fila en docs/security/amenazas-activas.md si se toca auth.
- Trampas:
  - SCALE1 marca llamadas a BD dentro de un hunk con un loop (-U20). Se arregla reestructurando, no con la label.
  - E4 marca constantes llamadas `secret` con un literal de 12 caracteres o más.
  - Si hay conflictos en static/, se toma el de master y se regenera con `pnpm build` y `VITE_APP_RELEASE=ci-spa-gate`.
  - Hay tests de roles viejos (RolesLector*) que esperan accesos que los fixes cierran.
  - `gh pr create` puede colgarse; para revisar, usar `gh pr list --head`.
  - Mi rango de Flyway: V199 la usé yo. V196 a V198 son de Dev Pagos 2.
- Variables, solo por nombre: no usé ninguna propia. El token de gh es el del clon.

**(c) Mejoras**
- En el paso 0, agregar que el reemplazo lea los BAJO pendientes de hotclick-bugs.md antes de abrir PRs nuevos.
- Pasar gitleaks al PATH de la box o documentar su ruta en la tabla de herramientas.

## Registro de riesgos y deuda (actualizado 2026-10-27, hora de Costa Rica)

Origen: revisiones de Seguridad sobre #398, #399, #403 y #413. Sin datos sensibles: solo rutas, clases y números de PR. «Sin PR» quiere decir que nadie lo tiene en curso.

| # | Tema | Qué pasa | Dónde mirar | Estado |
|---|---|---|---|---|
| 1 | Idempotencia del pedido | Falta cerrar la idempotencia del alta de pedido ante reintentos (doble clic, red lenta): la protección actual usa el caché `idempotency-keys`, que vive en memoria de cada instancia (ver fila 7), así que con más de un pod o tras un reinicio un reintento puede crear un segundo pedido. A verificar con un test antes de arreglar. | `CacheConfig` (`idempotency-keys`), `StorefrontGuestOrderService` y el checkout autenticado | Riesgo abierto, sin PR |
| 2 | `RateLimiter.incrementarYContar` no atómico | Cuenta con lectura y escritura separadas; con varias instancias o peticiones paralelas el contador puede quedar corto y dejar pasar más de lo permitido. Ya estaba en «Pendientes». | `security/RateLimiter.java` | Deuda, sin PR |
| 3 | Tope por IP en PUT/PATCH/DELETE autenticados | `RateLimitingFilter` limita por IP los POST y los GET listados, pero un PUT/PATCH/DELETE con sesión (por ejemplo `confirmar-sinpe`) no tiene tope por IP propio. | `security/RateLimitingFilter.java` | Riesgo abierto, sin PR |
| 4 | GET de comisión abierto a EDITOR | El `PUT` de comisión es solo ADMIN, pero el `GET` lo puede leer un EDITOR. Decidir si es lo que se quiere o se cierra a propietario. | `/api/admin/configuracion/comision` (fila `comision-vendedor` de `amenazas-activas.md`) | Por decidir, sin PR |
| 5 | Invitado con el correo de otra persona | El checkout de invitado asocia el pedido a la cuenta existente de ese correo sin probar que es suya. Preexistente a #413, no se tocó. Descrito en `docs/security/amenazas-activas.md` (PR de BAJOS #413/#398). | `GuestUserResolver`, `StorefrontGuestOrderService` | Riesgo abierto; hueco en la tabla de amenazas |
| 6 | Pre-deploy de `lower(correo)` | Antes de un índice único sobre `lower(correo)`: (a) respaldo y normalización de los correos existentes, (b) buscar duplicados sin distinguir mayúsculas (`SELECT lower(correo), count(*) FROM hot_click_usuario_tb GROUP BY 1 HAVING count(*) > 1`) y resolverlos a mano, (c) recién entonces crear el índice, en una migración Flyway aparte V204 o posterior (numerar contra master el día de hacerla). No hay migración en #399. | MED-5 de #399 | Pendiente, paso aparte |
| 7 | Caché local por instancia | Cachés en memoria de cada instancia: `idempotency-keys`, `userDetailsCache` y, desde los BAJOS #413/#398, el muestreo local del log de ruta inválida. Con más de un pod una invalidación, una llave de idempotencia o un contador no se comparten. Tenerlo presente al escalar. | `CacheConfig`, `JwtRequestFilter`, `RateLimitingFilter` | Deuda conocida |

### PRs mergeados hoy (2026-10-27)

| PR | Resumen |
|---|---|
| #384 | Equipo: empresa destino única al invitar, `totalUsuarios` por miembros, rechazo de usuarios no activos |
| #386 | Telegram: logs sin datos personales |
| #389 | Auth: solo cuentas activas mantienen sesión; el eliminado no reingresa al equipo |
| #393 | Seguridad: cuentas no activas sin tokens, cerrar cuenta invalida la caché, logs de Telegram sin mensaje de excepción |
| #395 | `RateLimitingFilter` compara sobre ruta canónica |
| #398 | HEAD comparte el cupo de GET; la ruta inválida cuenta contra un cupo por IP |
| #399 | Roles solo propietario (executive, IA, forecast, inventario, sucursales) y correo normalizado (MED-1..5) |
| #403 | BAJOS de #393: cuenta no activa en `seleccionar-empresa`, OTP y Clerk; logs sin `getMessage` |
| #413 | M2b pedido de tienda con cuenta antigua, `Locale.ROOT` en todo main, logs sin `getMessage` |

Los BAJOS de #413 y #398 (mensaje de excepción en logs y respuestas, teléfono sin dígitos, filas y log de la ruta inválida) van en un PR aparte; ver el estado en GitHub.
