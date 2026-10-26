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
