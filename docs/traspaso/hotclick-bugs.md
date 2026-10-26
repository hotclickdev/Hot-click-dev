# Traspaso — HotClick Bugs

Fecha: 2026-10-26 (CR). Autor: HotClick Bugs.

## Rol
Triage de bugs y deuda técnica en `hotclickdev/Hot-click-dev`: reproducir, arreglar con un test de regresión por fix, pedir APTO a Seguridad sobre el hash exacto, pushear ese hash y pasarle el PR a CI/CD.

## Estado (al traspaso)
- 3 PRs abiertos (tope 3). Ninguno se mergea sin CI verde + APTO sobre el head exacto.
- #348 tiene Tests Java en rojo; se estaba arreglando en `fix/roles-admin-billing-wallet` (worktree local con merge de master `d8f239be`, sin pushear) cuando se pidió el traspaso.

## Ramas y PRs
| PR / rama | Head | Estado |
|---|---|---|
| #304, #306, #327, #328 | — | Mergeados |
| #338 `fix/telegram-antiabuso-dedup` | `c710d9b3` | Abierto. APTO sobre c710d9b3. CI pendiente/en curso tras arreglar E4 (falso positivo SECRET). |
| #347 `fix/login-reenviar-verificacion` | `3f7e8f05` | Abierto. APTO sobre 3f7e8f05. CI pendiente tras agregar el endpoint a la allowlist del test de rutas. |
| #348 `fix/roles-admin-billing-wallet` | `45534a84` (origin) | Abierto. APTO sobre 45534a84 pero Tests Java en rojo (run 40393939381). Arreglo en curso por otro proceso; requiere APTO nuevo. |
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
- `/api/facturas` da 500 al dueño (sin investigar).

## Próximos pasos
1. Terminar el rojo de Tests Java de #348, APTO sobre el hash nuevo, push, CI/CD.
2. Seguir #338 y #347 hasta merge por CI/CD.
3. Al liberar cupo de PR: bug de `correoVerificado` en EquipoService (ALTO), luego EDITOR en finanzas.
4. Revisar los wip/ antes de retomarlos (base vieja, `eb7564c2`).

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
