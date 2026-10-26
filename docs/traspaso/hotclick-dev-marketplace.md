# Traspaso: HotClick Dev Marketplace

## Rol
Dev full stack: backend Spring Boot / Java 21 (`Hot_click_outlet/`) y frontend React 19 + Vite + Tailwind v4 + pnpm (`Hot_click_outlet/frontend`). Arreglo los hallazgos de QA y auditoría de Marketplace, cotizaciones, POS/inventario y front/UX.

## Reglas que seguí (seguilas igual)
- Merge a master solo con **CI verde + APTO de Seguridad sobre el hash exacto**. El merge lo hace CI/CD. **Sin deploy.**
- Nada de force push, rebase, `--no-verify` ni `git stash` (el stash es compartido). Para actualizar un PR: merge puro de master.
- `static/` (build del front) va siempre en un commit aparte.
- No tocar archivos de Dev Pagos (ONVO, SINPE, Stripe, checkout de pagos) ni de Tilopay.
- Migraciones Flyway solo aditivas.
- Tope de PRs abiertos propios: 3.
- gitleaks antes de cada push.

## Cómo buildear `static/` igual que CI
1. Node 22.20.0; `corepack enable` y `corepack prepare pnpm@11.1.2 --activate`.
2. En `Hot_click_outlet/frontend`: `pnpm install --frozen-lockfile`.
3. Exportar las mismas `VITE_*` que usa el workflow de CI, con valores placeholder (nunca reales).
4. `pnpm build` y después correr `gate-spa.mjs` (el gate de CI del front). Commitear `static/` en un commit aparte.

## PRs de hoy (estado verificado con gh, 26-oct ~15:05 CR)
| PR | Tema | Estado |
|---|---|---|
| #305 | Billing: renovación ONVO, cancelaciones, baja escalonada (Auditor 5) | MERGED |
| #307 | Front C1: subtotal de línea en moneda de la cotización | MERGED |
| #318 | E2E-REG-01: registro local asigna identificación interna | MERGED |
| #321 | E2E-CMP-01: bodega del vendedor en el marketplace | MERGED |
| #322 | Front C2: unidad de precioUnitario en cotizaciones | MERGED |
| #326 | Eliminar editor de cotizaciones sin ruta | MERGED |
| #334 | 6 MEDIO re-QA área 9 (US$/₡, errores, modal, voseo, QA8-003) | MERGED |
| #337 | Retirar `/api/cotizaciones/clientes` + validar montos | MERGED |
| #341 | POS: kardex sin 500; cerrar turno inexistente da 404 | MERGED |
| **#349** | Marketplace re-QA área 3 (M-04 y 3 BAJO) | **OPEN**, head `e05c0824`, CI verde, APTO de Seguridad en `e05c0824`; merge pedido a CI/CD. M-08 sacado (igual que master). |

Antes: #284, #285, #292 (mergeados).

## Ramas subidas en el traspaso
- `wip/billing-onvo-webhook-sonar` (ec58f50c): commit Sonar S2259 sobre la rama del PR #300 (cerrado). Supersedido por #305; solo para referencia.
- `wip/billing-renovacion-v1` (b9ac1766): primera versión de la renovación ONVO. Supersedida por `fix/billing-renovacion-v2` (#305). Solo referencia.
- Todas las demás ramas mías ya estaban en origin con el mismo hash.

**No subida (decisión de Andrés):** `feat/cajero-asignable` (d5501c6b, local en `/workspace/hc-cajero-rol`). El rol CAJERO no se activa.

## Pendientes
1. **M-08 sobreventa post-cobro**: espera decisión de Andrés. Spec en `evidencia/hotclick-dev-marketplace/spec-m08-sobreventa-post-cobro.md`. La implementa Dev Pagos (ONVO, Tilopay, SINPE, Stripe, manual) cuando Andrés decida; no pasarla antes.
2. **Bodega en el JSON público del catálogo**: PR aparte con DTO público (el checkout la usa hoy).
3. BAJOs de Seguridad:
   - `CotizacionB2BRequestDTO` items sin `@Size(max=500)`.
   - `/publica/{token}` devuelve la entidad completa → usar DTO público.
   - Enumeración de turnos: 404 vs 403 → `findByIdAndEmpresaIdForUpdate` o 404 en ambos.
   - Docs de auditoría todavía citan `/api/cotizaciones/clientes`.
   - CedulaCr con separadores; Receptor vacío; colisión de `REG-`; fallback `primeraBodegaActivaDeSuTienda`; límites en USD.
   - `mensajeAmigable.ts:21-22` muestra texto del backend si no parece técnico (informativo).

## Backlog
- PR de Auditor 1 (pagos y checkout).
- Retiro de Tilopay (coordinar con Dev Pagos).
- ONVO split pay.

## Decisiones de Andrés que conozco
- Rol CAJERO **no** se activa (`feat/cajero-asignable` no se sube).
- Editor de cotizaciones eliminado (#326).
- Endpoints de clientes de cotización retirados (#337); la tabla y los datos quedan.
- Regla de merge: CI verde + APTO sobre hash exacto, sin deploy.
- Límites de montos de cotización (1.000.000 unidades; ₡1.000.000.000 por línea) los fijé yo; son ajustables.

## Aviso
El box compartido anda casi sin inodos (90-99 %). Los builds pueden fallar; limpiá `target/` y `node_modules/` de worktrees ya mergeados antes de buildear.

## Evidencia
`docs/traspaso/evidencia/hotclick-dev-marketplace/`: spec M-08, patches cortos de REG-01/CMP-01 y `resumen-build-tests.md`.
