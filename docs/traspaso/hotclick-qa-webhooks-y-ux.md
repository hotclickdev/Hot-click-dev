# Traspaso: HotClick QA Webhooks y UX (QA 8)

**Rol:** soy el tester funcional QA 8 de hotclickdev/Hot-click-dev. Cubro el webhook de ONVO (firma inválida, eventos duplicados y fuera de orden), las suscripciones en sandbox, el Web SDK, la vista móvil a 360 px, la PWA, el voseo y los montos en ₡ y US$. Además hice el re-QA de las áreas 9 (Front y UX) y 8 (bot de Telegram). Solo hago QA: no escribo código de producción ni hago commit, push, merge o deploy.

## Ramas y PRs

No tengo ramas ni PRs propios.

## En qué quedé

**Webhook de ONVO**
- OK en vivo en `:8081`: sin secret, con secret vacío o con secret inválido, responde 401.
- No probado: el evento duplicado, el que llega fuera de orden y el JSON mal formado. Necesitan el secret válido y están en espera de que Grok Bot lo autorice.

**Ruta de Stripe**
- `/api/webhooks/stripe` sigue vivo: responde 400 cuando debería dar 404. Es un MEDIO y ya está en el archivo de pendientes.

**Área 8, bot de Telegram**
- Arreglados: C1 (fuga del token) y C5 (falta el secret, ahora responde 503).
- Abiertos:
  - C2, ALTO: el antiabuso suspende la cuenta 365 días con más de 3 mensajes por segundo.
  - C3, MEDIO: la deduplicación de eventos vive en memoria.
  - C4, MEDIO: `revocarMiembro` corta el Telegram del usuario en todas sus empresas.
  - C7, BAJO: el código de `/start` distingue mayúsculas y minúsculas.
- Escribí 4 tests de reproducción y los 4 fallan en master a22501f7b. Bugs los está validando contra el #338.

**Área 9, Front y UX**
- OK en vivo: vitest pasó 195 de 195. A 360 px, el home, el catálogo, la ficha y el carrito no desbordan, y los montos salen en ₡.
- Abiertos: C3 a C10 y los textos en tuteo. Están anotados en el archivo de pendientes y los tiene Dev Marketplace.

## Pendientes y próximos pasos

1. Cuando el #346 (CSP de sdk.onvopay.com) entre a master y CI/CD avise, hacer la prueba rápida del pago de suscripción con ONVO, solo en modo test.
2. Cuando el #338 esté en master, volver a probar el área 8.
3. Con el permiso de Grok Bot, correr el duplicado, el fuera de orden y el JSON mal formado del webhook, con el `session_id` pagado que pasa QA 5.
4. Probar la cancelación de una suscripción activa (#256) con la tarjeta 4242, y después la renovación.
5. Verificar QA8-003 (las pestañas del video) con un producto de prueba que tenga video.
6. El asistente con la cuenta logueada, solo cuando Bugs encuentre la causa.

## Decisiones de Andrés que conozco

- **Bugs:** los críticos y altos van directo a Grok Bot. Los medios y bajos van como fila en el archivo de pendientes.
- **Fixes:** cada fix trae un test que reproduce el bug.
- **Límites:** nada de prod, gasto ni deploy. ONVO solo en modo test, con la tarjeta 4242.
- **Prueba en prod:** autorizó una prueba única en prod con sus cuentas de prueba, sin tarjeta. Ya se hizo y no hay que repetirla.
- **Merges a master:** CI verde y APTO sobre el hash exacto.

## Dónde está la evidencia

`/workspace/qa/verif/qa8/`:
- `vivo-8081/`
- `tests-repro-a8/`
- `reqa-area8-9.md`
- `webhook.log`

Pendientes medios y bajos: `/workspace/hotclick-reportes/bugs-pendientes-media-baja-2026-10-23.md`.

## Correcciones al README (HotClick QA Webhooks y UX)

### a) Errores o datos viejos
- **Fila 124:** el link apunta a `hotclick-qa-webhooks-y-ux.md` en la rama, pero mi nota no está subida, solo existe en local en `/workspace/qa/verif/qa8/traspaso/hotclick-qa-webhooks-y-ux.md`. Hay que subirla o marcar la fila como ❌ SIN NOTA.
- **Estado incompleto en la fila:**
  - Pago de suscripción con ONVO test (staging 1b1fece8, #346): ALTO. Al confirmar el plan PYME aparece "Error con la pasarela de pago" y la consola da 403 en `/api/billing/plan-pendiente`, `/api/empresa/perfil` y `/api/encargos/kpis`. El formulario de ONVO no carga, así que la CSP de #346 no quedó verificada. Dev Pagos está viendo la causa y no hay que repetir la prueba hasta que él lo diga.
  - `/vender` dice que las tarjetas pasan por Tilopay. Es bug, ya está pasado a Dev Pagos.
  - `/register` da 404 (el registro real está en `/registro`). Anotado como BAJO en pendientes.
  - Área 8: tengo 4 tests que reproducen A8-C2, C3, C4 y C7 (fallan en a22501f7b). Están en `/workspace/qa/verif/qa8/tests-repro-a8/` y se le pasaron a Bugs para el #338.
  - Área 9: OK en vivo a 360 px y vitest 195/195. Siguen abiertos los MEDIOS C3 a C7 y QA8-003, que tiene Dev Marketplace.

### b) Lo que le falta a mi reemplazo
- **Staging local:** el front está en :3000 y el backend en :8081, no en :8080. Lo levanta CI/CD en `/workspace/staging-43188186`. Mailpit está en :8025. No hay que tocar los procesos `hotclick-staging-backend` ni `hotclick-staging-front`, ni borrar su `frontend/node_modules` ni `/workspace/tools/node22`.
- **Maven:** está en `/workspace/qa1-verif/maven/bin` y el JDK 21 en `/workspace/tools/jdk21`. Antes de correrlo hay que hacer `unset ONVO_*`, y las suites completas van con `flock /workspace/.mvn-suite.lock`.
- **Webhook ONVO:** hay que mandar la cabecera `X-Webhook-Secret`, con el valor de la variable `ONVO_WEBHOOK_SECRET`, que solo se carga en una variable y nunca se imprime. Para el duplicado y el fuera de orden hace falta un `session_id` pagado de QA 5 y el permiso de Grok Bot. Staging no tiene `.env`, así que no hay que ponerle ningún secret sin permiso.
- **Trampas:**
  - El checkout de `/workspace/Hot-click-dev` tiene cambios locales, así que `git pull` falla. Hay que usar un worktree propio y borrarlo al terminar.
  - El box se queda sin inodos; se revisa con `df -i /`.
  - El navegador del box puede tener abierta la sesión de otra cuenta QA, así que hay que cerrarla antes de probar.
  - La prueba del asistente en prod con la cuenta de cliente no se repite hasta que Bugs dé la causa.

### c) Mejoras
- Que cada fila incluya el hash de master contra el que se probó.
- Que haya una sección común de staging (puertos, Mailpit, rutas de Maven y JDK, inodos) para no repetirla en cada nota.
