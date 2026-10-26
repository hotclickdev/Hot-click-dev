# Traspaso — HotClick QA (QA 7)

## Rol
QA 7: admin y seguridad de roles (incluye LECTOR), más re-QA de las áreas 3 (Marketplace) y 10 (Infraestructura). Solo recibe órdenes de Grok Bot. No toca código de producto, no hace merge, deploy ni AWS.

## En qué quedé
### Re-QA áreas 3 y 10 sobre master `f9f0e506`
- 18 tests dirigidos: **109/109 pasan**.
- Ninguna de las dos áreas queda OK: siguen abiertos (revisión de código, sin test que los cubra):
  - MEDIOS: M-04 (pedido invitado no valida si el producto es publicable), M-08 (sobreventa: el stock queda en 0 y solo se deja log), INF-04 (Flyway acepta migraciones fuera de orden), INF-05 (avisos de caída apuntan a onrender), INF-06 (prueba de restauración con postgres 16).
  - BAJOS: M-05, M-06, el catálogo expone `stockReservado`/bodega, INF-07, INF-08, CSP con stripe/tilopay/clerk, `/api/webhooks/stripe` responde 400.
- Empresa no aprobada: no aparece en lista de tiendas, su página ni el catálogo (verificado por API del staging con admin de prueba) → OK.
### Revisión LECTOR
- Recolección crear/cancelar en `RecoleccionPanel.tsx:20` y `:34` darían 403 con `f85c3e11`.
- Cotizaciones: sin camino para LECTOR.
### Verificación L210
- `cef046f6`: VERIFICADO, 64 tests / 0 fallos.

## Ramas y PRs
| Rama | Hash | Estado |
|---|---|---|
| `chore/sinpe-telefono-config` | `e68039dc4` | **PR #350** (https://github.com/hotclickdev/Hot-click-dev/pull/350), rama nueva desde master. `20127bed2` (HotClick Bugs, 25-oct) reemplazó la parte de config de `393b0816f`; el PR solo trae `SinNumerosRealesEnCodigoTest` y ocultar SINPE en checkout sin número configurado. El commit original queda en la rama local `backup/sinpe-telefono-config-393b0816` (box viejo, sin subir). Seguridad: NO APTO sobre `7f97826ba`; el ALTO (SINPE manual sin ONVO) fue retirado (el flujo `sinpeManual` siempre crea intent ONVO). `e68039dc4` corrige el MEDIO: `metodosDisponibles(sinpeHabilitado: boolean)` obligatorio, sin default. `cfd4919da` (rama local `qa/sinpe-solo-onvo-350`) NO se sube. **APTO de Seguridad sobre `e68039dc433edb0eba9f28234112f119599fc623`**; se mergea con CI verde sobre ese head exacto. |
| `docs/sin-telefono-sinpe` | `39e372f9d` | Ya en origin, sin commits por delante de master. |
| `docs/traspaso-cuenta-nueva` | esta nota | Rama compartida de traspaso. |

## Pendientes
1. PR #350: APTO de Seguridad sobre `e68039dc433edb0eba9f28234112f119599fc623`; merge solo con CI verde sobre ese head exacto. Falta CI verde, y que Andrés cree el secret `HOTCLICK_NUMEROS_PROHIBIDOS` y agregue en `ci.yml` (job backend, paso Run tests) la línea que está en el cuerpo del PR.
2. Andrés debe crear el secret de GitHub `HOTCLICK_NUMEROS_PROHIBIDOS` (solo el nombre aquí).
3. Probar el caso empresa ACTIVO + visibilidad false (no se probó para no alterar una tienda de prueba compartida).
4. Re-QA de áreas 3 y 10 cuando entren los fixes de los MEDIOS.

5. BAJOs de #350, para después del lanzamiento, sin PR por ahora:
   1) renombrar `sinpeManual` a `sinpeOnvoIntent` en el front y en la propiedad `hotclick.checkout.sinpe-manual.habilitado`;
   2) exigir que `sinpeDestino` no venga vacío para ofrecer SINPE (fail-closed).

## Próximos pasos
Retomar los pendientes en orden; cada fix necesita su test de reproducción antes de dar el área por buena.

## Decisiones de Andrés conocidas
- Nunca commit/push/merge/deploy/AWS sin OK explícito por caso.
- ONVO fail-closed; nunca llaves live ni cobros reales.
- Suites con flock, una por hash.
- Merge a master = CI verde + APTO sobre el hash exacto.
- Cada fix con test de reproducción.
- Cuidar el presupuesto.

## Evidencia
Resumida en `docs/traspaso/evidencia/hotclick-qa/`: `reqa-3-10-log.txt`, `l210/*.txt`, `config-tel/*.txt` (números solo ficticios). Originales en el box viejo bajo `/workspace/qa/verif/` (reqa-3-10, l210, config-tel).
